import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type ResultTableProps = {
  revenue: number;
  materialCost: number;
  salary: number;
  electric: number;
  other: number;
  isEditing?: boolean;
  onUpdate?: (field: string, value: number) => void;
};

export default function ResultTable({
  revenue,
  materialCost,
  salary,
  electric,
  other,
}: ResultTableProps) {
  const totalCost = materialCost + salary + electric + other;

  const percent = (value: number) =>
    revenue ? ((value / revenue) * 100).toFixed(1) : "0";

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);

  const ProgressRow = ({
    label,
    value,
    colorClass,
  }: {
    label: string;
    value: number;
    colorClass: string;
  }) => {
    const p = parseFloat(percent(value));
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 font-medium">{label}</span>
          <div className="flex items-center gap-2">
             <span className="font-bold text-slate-900">{formatMoney(value)}</span>
             <span className="text-xs text-slate-400 w-12 text-right">({p}%)</span>
          </div>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full", colorClass)} 
            style={{ width: `${Math.min(p, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full overflow-hidden border-0 shadow-none ring-0 bg-transparent">
      <CardHeader className="pb-4 px-0 pt-0">
        <CardTitle className="text-sm font-bold uppercase text-slate-400 tracking-wider">Phân tích chi phí</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        <div className="space-y-5">
            <ProgressRow label="Chi phí nguyên liệu (COGS)" value={materialCost} colorClass="bg-blue-500" />
            <ProgressRow label="Lương nhân viên" value={salary} colorClass="bg-purple-500" />
            <ProgressRow label="Điện / Nước / Net" value={electric} colorClass="bg-amber-500" />
            <ProgressRow label="Chi phí khác" value={other} colorClass="bg-rose-500" />
        </div>
        
        <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Tổng chi phí vận hành</span>
                <span className="text-slate-900 font-bold text-lg">{formatMoney(totalCost)}</span>
            </div>
             <div className="text-right mt-1">
                 <span className="text-xs text-slate-400">{percent(totalCost)}% doanh thu</span>
             </div>
        </div>
      </CardContent>
    </Card>
  );
}
