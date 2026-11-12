"use client";
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 size-11" aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${props.id === "confirm" ? "konfirmasi kata sandi" : "kata sandi"}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
      {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  </div>;
}
