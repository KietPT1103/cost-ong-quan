import { Input } from "@/components/ui/Input";

type InputMoneyProps = {
  label: string;
  set: (value: number) => void;
  value?: number; // Optional controlled value if needed later
};

export default function InputMoney({ label, set }: InputMoneyProps) {
  return (
    <Input
      label={label}
      type="number"
      placeholder="0"
      onChange={(e) => set(Number(e.target.value))}
      className="text-right"
    />
  );
}
