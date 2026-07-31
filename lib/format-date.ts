/** "2026-07-14" -> "Jul 14, 2026" */
export function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** Today's date as "YYYY-MM-DD", for writing to a Postgres `date` column. */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
