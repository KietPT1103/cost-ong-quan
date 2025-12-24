import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type ResultTableProps = {
  revenue: number;
  materialCost: number;
  salary: number;
  electric: number;
  other: number;
};

export default function ResultTable({
  revenue,
  materialCost,
  salary,
  electric,
  other,
}: ResultTableProps) {
  const totalCost = materialCost + salary + electric + other;
  const profit = revenue - totalCost;

  const percent = (value: number) =>
    revenue ? ((value / revenue) * 100).toFixed(1) : "0";

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);

  const Row = ({
    label,
    value,
    p,
    bold,
    highlight,
  }: {
    label: string;
    value: number;
    p: string;
    bold?: boolean;
    highlight?: boolean;
  }) => (
    <div
      className={cn(
        "flex justify-between items-center py-3 border-b last:border-0",
        bold && "font-bold",
        highlight && "text-primary text-lg"
      )}
    >
      <span>{label}</span>
      <div className="text-right">
        <div className={cn("font-medium", highlight && "text-xl")}>
          {formatMoney(value)}
        </div>
        <div className="text-xs text-muted-foreground">{p}% doanh thu</div>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Kết quả kinh doanh</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Row label="Doanh thu" value={revenue} p="100" bold />
          <div className="my-4 border-t" />
          <Row
            label="Cost nguyên liệu"
            value={materialCost}
            p={percent(materialCost)}
          />
          <Row label="Lương nhân viên" value={salary} p={percent(salary)} />
          <Row label="Điện nước" value={electric} p={percent(electric)} />
          <Row label="Chi phí khác" value={other} p={percent(other)} />
          <div className="my-4 border-t" />
          <Row
            label="Tổng chi phí"
            value={totalCost}
            p={percent(totalCost)}
            bold
          />
          <Row
            label="Lợi nhuận ròng"
            value={profit}
            p={percent(profit)}
            bold
            highlight
          />
        </div>
      </CardContent>
    </Card>
  );
}
