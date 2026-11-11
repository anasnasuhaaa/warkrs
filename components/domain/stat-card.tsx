import { Card, CardContent } from "@/components/ui/card";
export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {value.toLocaleString("id-ID")}
        </p>
        {detail && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
