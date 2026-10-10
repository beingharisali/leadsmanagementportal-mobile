/** "Haris Ali" → "HA" */
export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Whole days from now until `date` (0 = later today, negative = past). */
export function daysUntil(date: string | Date) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

/** Good morning / afternoon / evening, by the phone's clock. */
export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

/** "6 Oct 2026" */
export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "6 Oct, 3:05 pm" */
export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "just now" · "5 min ago" · "3 h ago" · "2 days ago", then the date. */
export function formatTimeAgo(value: string | Date, now = new Date()) {
  const diff = Math.max(0, now.getTime() - new Date(value).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

/** Digits and a leading + only, for `tel:` links. */
export function telUrl(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** A Pakistani number in international form for wa.me (same rules as the website). */
export function internationalPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  else if (digits.startsWith("3") && digits.length === 10) digits = `92${digits}`;
  return digits;
}

/** Opens a WhatsApp chat with the message typed in. */
export function whatsappUrl(phone: string, text = "") {
  return `https://wa.me/${internationalPhone(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
