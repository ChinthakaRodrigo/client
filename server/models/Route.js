
const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    stopCode: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    order: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true
    },

    stops: {
      type: [stopSchema],
      validate: {
        validator: stops => stops.length >= 2,
        message: "A route must contain at least two stops."
      }
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Route", routeSchema);
