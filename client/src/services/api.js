
const API_URL = "http://localhost:5000/api";

export async function searchTrips({ from, to, date }) {
  const params = new URLSearchParams({
    from,
    to,
    date
  });

  const response = await fetch(
    `${API_URL}/trips/search?${params.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to search trips.");
  }

  return data;
}
