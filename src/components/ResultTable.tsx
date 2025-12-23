import ResultRow from "./ResultRow";

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
    revenue ? (value / revenue) * 100 : 0;

  return (
    <div className="bg-gray-100 p-6 rounded">
      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2 text-left">Khoản mục</th>
            <th className="border p-2 text-right">Số tiền (VNĐ)</th>
            <th className="border p-2 text-right">% Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          <ResultRow label="Doanh thu" value={revenue} percent={100} />

          <ResultRow
            label="Cost nguyên liệu"
            value={materialCost}
            percent={percent(materialCost)}
          />

          <ResultRow
            label="Lương"
            value={salary}
            percent={percent(salary)}
          />

          <ResultRow
            label="Điện nước"
            value={electric}
            percent={percent(electric)}
          />

          <ResultRow
            label="Chi phí khác"
            value={other}
            percent={percent(other)}
          />

          <ResultRow
            label="Tổng chi phí"
            value={totalCost}
            percent={percent(totalCost)}
            bold
          />

          <ResultRow
            label="Lợi nhuận"
            value={profit}
            percent={percent(profit)}
            bold
            highlight
          />
        </tbody>
      </table>
    </div>
  );
}

