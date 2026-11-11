import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Radio,
  LockKeyhole,
} from "lucide-react";
import { statusLabel, type GameStatus } from "@/modules/games/status";
const appearance = {
  Draft: { icon: FileText, className: "bg-muted text-muted-foreground" },
  Upcoming: { icon: Clock3, className: "bg-accent text-accent-foreground" },
  Live: { icon: Radio, className: "bg-success-subtle text-success" },
  Closing: { icon: LockKeyhole, className: "bg-warning-subtle text-warning" },
  Completed: { icon: CheckCircle2, className: "bg-muted text-foreground" },
};
export function StatusBadge({ status }: { status: GameStatus }) {
  const { icon: Icon, className } = appearance[status];
  return (
    <Badge
      variant="secondary"
      className={`gap-1.5 rounded-md px-2 py-1 font-medium ${className}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {statusLabel[status]}
    </Badge>
  );
}
