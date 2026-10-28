
const express = require("express");
const mongoose = require("mongoose");

const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Trip = require("../models/Trip");

const router = express.Router();


/*
  GET /api/trips/search?from=KAR&to=MAK&date=2026-10-28

  Search for trips between two stops on a selected date.
*/
router.get("/search", async (req, res) => {
  try {
    const from = String(req.query.from || "").trim().toUpperCase();
    const to = String(req.query.to || "").trim().toUpperCase();
    const date = String(req.query.date || "").trim();

    // 1. Validate the search inputs
    if (!from || !to || !date) {
      return res.status(400).json({
        message: "Please provide from, to, and date."
      });
    }

    if (from === to) {
      return res.status(400).json({
        message: "Origin and destination must be different."
      });
    }

    // Require a date in YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Date must use YYYY-MM-DD format."
      });
    }

    // Interpret the selected date as Sri Lankan local time (UTC+05:30)
    const start = new Date(`${date}T00:00:00+05:30`);

    if (
      Number.isNaN(start.getTime()) ||
      start.toISOString().slice(0, 10) !==
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)
    ) {
      return res.status(400).json({
        message: "Please provide a valid calendar date."
      });
    }

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    // 2. Get trips scheduled to start on the selected date
    const trips = await Trip.find({
      departureTime: { $gte: start, $lt: end },
      status: { $in: ["SCHEDULED", "IN_PROGRESS"] }
    })
      .populate(
        "bus",
        "registrationNumber busType capacity status"
      )
      .populate("route", "routeName stops status")
      .sort({ departureTime: 1 });

    // 3. Keep only trips that match the requested stops
    const results = [];

    for (const trip of trips) {
      const bus = trip.bus;
      const route = trip.route;

      if (!bus || !route) continue;
      if (bus.status !== "ACTIVE") continue;
      if (route.status !== "ACTIVE") continue;

      const fromIndex = route.stops.findIndex(
        stop => stop.stopCode.toUpperCase() === from
      );

      const toIndex = route.stops.findIndex(
        stop => stop.stopCode.toUpperCase() === to
      );

      // Both stops must exist, and origin must come first
      if (
        fromIndex === -1 ||
        toIndex === -1 ||
        fromIndex >= toIndex
      ) {
        continue;
      }

      const departure = trip.stopTimes[fromIndex];
      const arrival = trip.stopTimes[toIndex];

      if (
        !departure ||
        !arrival ||
        !departure.departureTime ||
        !arrival.arrivalTime
      ) {
        continue;
      }

      // 4. Return the useful information for the passenger
      results.push({
        tripId: trip._id,
        bus: {
          registrationNumber: bus.registrationNumber,
          busType: bus.busType,
          capacity: bus.capacity
        },
        routeName: route.routeName,
        from: {
          stopCode: from,
          name: route.stops[fromIndex].name,
          departureTime: departure.departureTime
        },
        to: {
          stopCode: to,
          name: route.stops[toIndex].name,
          arrivalTime: arrival.arrivalTime
        },
        fullRouteFare: trip.fare,
        status: trip.status
      });
    }

    return res.status(200).json({
      count: results.length,
      results
    });
  } catch (error) {
    console.error("Trip search error:", error);

    return res.status(500).json({
      message: "Failed to search trips."
    });
  }
});


// GET: List trips
router.get("/", async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate("bus")
      .populate("route")
      .sort({ departureTime: 1 });

    res.json(trips);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve trips"
    });
  }
});

// POST: Create a trip
router.post("/", async (req, res) => {
  try {
    const {
      bus,
      route,
      departureTime,
      arrivalTime,
      fare,
      stopTimes
    } = req.body;

    if (
      !mongoose.isValidObjectId(bus) ||
      !mongoose.isValidObjectId(route)
    ) {
      return res.status(400).json({
        message: "Valid bus and route IDs are required"
      });
    }

    const selectedBus = await Bus.findById(bus);
    const selectedRoute = await Route.findById(route);

    if (!selectedBus || selectedBus.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Bus not found or not active"
      });
    }

    if (!selectedRoute || selectedRoute.status !== "ACTIVE") {
      return res.status(400).json({
        message: "Route not found or not active"
      });
    }

    const start = new Date(departureTime);
    const end = new Date(arrivalTime);

    if (
      !departureTime ||
      !arrivalTime ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({
        message: "Valid departure and arrival times are required"
      });
    }

    if (!Array.isArray(stopTimes)) {
      return res.status(400).json({
        message: "Stop times must be an array"
      });
    }

    const routeStops = selectedRoute.stops;

    if (stopTimes.length !== routeStops.length) {
      return res.status(400).json({
        message: "A scheduled time is required for every route stop"
      });
    }

    for (let i = 0; i < routeStops.length; i++) {
      if (stopTimes[i].stopCode !== routeStops[i].stopCode) {
        return res.status(400).json({
          message: "Stop times must follow the route stop order"
        });
      }

      for (const field of ["arrivalTime", "departureTime"]) {
        const value = stopTimes[i][field];

        if (value !== null && value !== undefined) {
          const time = new Date(value);

          if (
            Number.isNaN(time.getTime()) ||
            time < start ||
            time > end
          ) {
            return res.status(400).json({
              message: `Invalid ${field} for stop ${routeStops[i].name}`
            });
          }
        }
      }

      if (i === 0 && !stopTimes[i].departureTime) {
        return res.status(400).json({
          message: "The first stop needs a departure time"
        });
      }

      if (
        i === routeStops.length - 1 &&
        !stopTimes[i].arrivalTime
      ) {
        return res.status(400).json({
          message: "The last stop needs an arrival time"
        });
      }
    }

    const trip = await Trip.create({
      bus,
      route,
      departureTime: start,
      arrivalTime: end,
      fare,
      stopTimes
    });

    res.status(201).json({
      message: "Trip created successfully",
      trip
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    res.status(500).json({
      message: "Failed to create trip"
    });
  }
});

module.exports = router;
