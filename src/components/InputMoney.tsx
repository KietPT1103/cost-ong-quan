import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type InputMoneyProps = {
  label?: string;
  set: (value: number) => void;
  value?: number;
  className?: string;
  placeholder?: string;
};

export default function InputMoney({
  label,
  set,
  value,
  className,
  placeholder = "0",
}: InputMoneyProps) {
  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null) return "";
    if (val === 0) return ""; // Optional: keep empty if 0 for cleaner look, or return "0"
    return val.toLocaleString("en-US");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    if (rawValue === "") {
      set(0);
      return;
    }
    const num = Number(rawValue);
    if (!isNaN(num)) {
      set(num);
    }
  };

  return (
    <Input
      label={label}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={formatValue(value)}
      onChange={handleChange}
      className={cn("text-right font-mono", className)}
    />
  );
}
