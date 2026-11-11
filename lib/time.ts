export function jakarta(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta" }).format(new Date(value))+" WIB";
}
export function jakartaInput(value: string | Date) {
  return new Date(new Date(value).getTime()+7*60*60*1000).toISOString().slice(0,16);
}
export function fromJakartaInput(value: string) { return new Date(`${value}:00+07:00`).toISOString(); }
