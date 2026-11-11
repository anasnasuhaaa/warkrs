"use client";
import { useState } from "react";
import { format } from "date-fns";
import { id as indonesia } from "date-fns/locale";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
const hours = Array.from({ length: 24 }, (_, n) => String(n).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, n) =>
  String(n).padStart(2, "0"),
);
// Value is a Jakarta wall-clock string, exactly like the former datetime-local.
// Only lib/time.fromJakartaInput converts it into an authoritative UTC payload.
export function GameDateTimeField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  invalid = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [day, time] = value.split("T");
  const [hour = "00", minute = "00"] = (time || "00:00").split(":");
  const parts = day?.split("-").map(Number);
  const selected =
    parts?.length === 3
      ? new Date(parts[0], parts[1] - 1, parts[2], 12)
      : undefined;
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid min-w-0 gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <Label htmlFor={`${id}-date`} className="sr-only">
            Tanggal {label.toLowerCase()}
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={`${id}-date`}
                type="button"
                variant="outline"
                className="h-11 w-full justify-start px-3 text-left font-normal"
                disabled={disabled}
                aria-invalid={invalid}
                aria-describedby={`${id}-zone`}
              >
                <CalendarDays
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span
                  className={`min-w-0 flex-1 truncate ${selected ? "" : "text-muted-foreground"}`}
                >
                  {selected
                    ? format(selected, "d MMM yyyy", { locale: indonesia })
                    : "Pilih tanggal"}
                </span>
                <ChevronDown
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto max-w-[calc(100vw-2rem)] p-0"
            >
              <Calendar
                mode="single"
                selected={selected}
                defaultMonth={selected}
                locale={indonesia}
                className="[--cell-size:2.25rem]"
                autoFocus
                labels={{
                  labelNext: () => "Bulan berikutnya",
                  labelPrevious: () => "Bulan sebelumnya",
                  labelDayButton: (date) =>
                    format(date, "EEEE, d MMMM yyyy", { locale: indonesia }),
                }}
                onSelect={(date) => {
                  if (date) {
                    onChange(`${format(date, "yyyy-MM-dd")}T${hour}:${minute}`);
                    setOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Select
            disabled={disabled || !day}
            value={day ? hour : undefined}
            onValueChange={(h) => onChange(`${day}T${h}:${minute}`)}
          >
            <SelectTrigger
              aria-label={`Jam ${label.toLowerCase()}`}
              className="h-11! min-w-0 flex-1 bg-card"
            >
              <SelectValue placeholder="Jam" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-64">
              {hours.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground" aria-hidden="true">
            :
          </span>
          <Select
            disabled={disabled || !day}
            value={day ? minute : undefined}
            onValueChange={(m) => onChange(`${day}T${hour}:${m}`)}
          >
            <SelectTrigger
              aria-label={`Menit ${label.toLowerCase()}`}
              className="h-11! min-w-0 flex-1 bg-card"
            >
              <SelectValue placeholder="Menit" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-64">
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <input type="hidden" name={id} value={value} />
      <p id={`${id}-zone`} className="text-xs text-muted-foreground">
        WIB · Asia/Jakarta
      </p>
    </fieldset>
  );
}
