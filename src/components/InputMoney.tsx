type InputMoneyProps = {
  label: string;
  set: (value: number) => void;
};

export default function InputMoney({ label, set }: InputMoneyProps) {
  return (
    <div>
      <label className="block font-medium">{label}</label>
      <input
        type="number"
        onChange={(e) => set(Number(e.target.value))}
        className="border p-2 w-full rounded"
      />
    </div>
  );
}
