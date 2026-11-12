export function jakarta(value: string | Date) {
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value)) + " WIB"
  );
}
export function jakartaInput(value: string | Date) {
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
export function fromJakartaInput(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}

const preciseClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta", hourCycle: "h23", hour: "2-digit", minute: "2-digit",
  second: "2-digit", fractionalSecondDigits: 3,
});
const preciseDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
});
/** Milliseconds are those persisted by the server; never infer click times. */
export function jakartaPrecise(value: string | Date, includeDate = false) {
  const date = new Date(value);
  const parts = preciseClock.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const clock = `${part("hour")}:${part("minute")}:${part("second")}.${part("fractionalSecond")}`;
  const dates = preciseDate.formatToParts(date);
  const day = (type: string) => dates.find((p) => p.type === type)!.value;
  return `${includeDate ? `${day("year")}-${day("month")}-${day("day")} ` : ""}${clock} WIB`;
}
