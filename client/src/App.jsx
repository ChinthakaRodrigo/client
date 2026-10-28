
import { useState } from "react";
import { searchTrips } from "./services/api";
import "./App.css";

function App() {
  const [from, setFrom] = useState("KAR");
  const [to, setTo] = useState("MAK");
  const [date, setDate] = useState("2026-10-28");

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSearched(true);
    setTrips([]);

    try {
      const data = await searchTrips({ from, to, date });
      setTrips(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(value) {
    return new Date(value).toLocaleTimeString("en-LK", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  return (
    <main className="container">
      <header className="page-header">
        <h1>Bus Finder</h1>
        <p>Find your next bus journey.</p>
      </header>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="field">
          <label htmlFor="from">From</label>
          <select
            id="from"
            value={from}
            onChange={e => setFrom(e.target.value)}
            required
          >
            <option value="GAL">Galle</option>
            <option value="KAR">Karapitiya</option>
            <option value="MAK">Makumbura</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="to">To</label>
          <select
            id="to"
            value={to}
            onChange={e => setTo(e.target.value)}
            required
          >
            <option value="GAL">Galle</option>
            <option value="KAR">Karapitiya</option>
            <option value="MAK">Makumbura</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="date">Travel date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search buses"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && <p>Looking for available trips...</p>}

      {!loading && searched && !error && trips.length === 0 && (
        <p className="empty">
          No trips found. Try another date or route.
        </p>
      )}

      {!loading && trips.length > 0 && (
        <section className="results">
          <h2>Available trips ({trips.length})</h2>

          {trips.map(trip => (
            <article className="trip-card" key={trip.tripId}>
              <div>
                <h3>{trip.routeName}</h3>
                <p>
                  {trip.from.name} → {trip.to.name}
                </p>
                <p>
                  Departure: {formatTime(trip.from.departureTime)}
                </p>
                <p>
                  Arrival: {formatTime(trip.to.arrivalTime)}
                </p>
              </div>

              <div className="trip-details">
                <strong>{trip.bus.registrationNumber}</strong>
                <p>{trip.bus.busType.replace("_", " ")}</p>
                <p>{trip.bus.capacity} seats in bus</p>
                <p>Full-route fare: Rs. {trip.fullRouteFare}</p>
                <span className="status">{trip.status}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default App;
