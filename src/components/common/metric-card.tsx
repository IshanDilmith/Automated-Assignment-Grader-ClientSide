import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  accentClassName?: string;
};

export function MetricCard({ label, value, hint, accentClassName }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1 w-full", accentClassName ?? "bg-primary")} />
      <CardContent className="pt-5">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold">{value}</div>
        <div className="mt-2 text-sm text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
