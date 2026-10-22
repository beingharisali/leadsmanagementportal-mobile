/** "9:05 AM" in the company's time zone. */
export function formatClock(value: string, timeZone?: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}

/** "7 h 45 min", "25 min". */
export function formatWorked(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${Math.floor(minutes / 60)} h`;
}

/** Opens the spot on Google Maps. */
export function mapLink(location: { lat: number; lng: number }) {
  return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
}
