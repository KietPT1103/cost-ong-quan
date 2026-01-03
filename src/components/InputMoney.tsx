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
  return (
    <Input
      label={label}
      type="number"
      placeholder={placeholder}
      value={value === 0 ? "" : value} // Show empty string if 0 for better UX, or keep 0 if preferred. Let's keep it simple for now and pass value directly if not 0? No, standard input number behavior.
      // Actually, if value is undefined, it's uncontrolled. If defined, controlled.
      // Let's make it robust.
      // onChange={(e) => set(Number(e.target.value))}
      // If the user clears the input, e.target.value is "". Number("") is 0. This works.
      onChange={(e) => {
        const val = e.target.value === "" ? 0 : Number(e.target.value);
        set(val);
      }}
      className={cn("text-right", className)}
    />
  );
}
