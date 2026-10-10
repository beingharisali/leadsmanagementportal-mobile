import { useEffect, useState } from "react";

/** The current time, updated every minute so "overdue" / "in 5 min" labels stay right. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
