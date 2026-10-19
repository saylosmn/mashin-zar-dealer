"use client";
import {
  COLORS,
  DRIVE,
  FUEL,
  STEERING,
  TRANSMISSION,
  engineInput,
  mileageInput,
  opts,
  type SpecFields,
} from "@shared/specs";

/** Машины үндсэн үзүүлэлт (заавал биш): гүйлт, хөдөлгүүр, шатахуун, хайрцаг, жолоо, хөтлөгч, өнгө */
export function SpecInputs({
  value,
  onChange,
}: {
  value: SpecFields;
  onChange: (k: keyof SpecFields, v: string) => void;
}) {
  const select = (k: keyof SpecFields, label: string, items: { value: string; label: string }[]) => (
    <label className="label flex-[1_1_160px]">
      {label}
      <select value={value[k]} onChange={(e) => onChange(k, e.target.value)} className="input h-11 font-normal">
        <option value="">—</option>
        {items.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="flex flex-wrap gap-3">
      <label className="label flex-[1_1_160px]">
        Гүйлт (км)
        <input
          inputMode="numeric"
          value={value.mileage}
          onChange={(e) => onChange("mileage", mileageInput(e.target.value))}
          placeholder="85000"
          className="input mono h-11"
        />
      </label>
      <label className="label flex-[1_1_160px]">
        Хөдөлгүүр (л)
        <input
          inputMode="decimal"
          value={value.engine}
          onChange={(e) => onChange("engine", engineInput(e.target.value))}
          placeholder="1.8"
          className="input mono h-11"
        />
      </label>
      {select("fuel", "Шатахуун", opts(FUEL))}
      {select("transmission", "Хурдны хайрцаг", opts(TRANSMISSION))}
      {select("steering", "Жолоо", opts(STEERING))}
      {select("drive", "Хөтлөгч", opts(DRIVE))}
      {select(
        "color",
        "Өнгө",
        COLORS.map((c) => ({ value: c, label: c })),
      )}
    </div>
  );
}
