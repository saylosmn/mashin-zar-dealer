// Машины үндсэн үзүүлэлт: гүйлт, хөдөлгүүр, шатахуун, хурдны хайрцаг, жолоо, хөтлөгч, өнгө.
// Вэб, апп хоёулаа ашиглана.

export type Fuel = "petrol" | "diesel" | "hybrid" | "plugin" | "electric" | "gas";
export type Transmission = "auto" | "manual";
export type Steering = "left" | "right";
export type Drive = "fwd" | "rwd" | "awd";

export type CarSpecs = {
  mileage_km?: number | null;
  engine_l?: number | string | null;
  fuel?: Fuel | null;
  transmission?: Transmission | null;
  steering?: Steering | null;
  drive?: Drive | null;
  color?: string | null;
  reserved?: boolean;
};

export const FUEL: Record<Fuel, string> = {
  petrol: "Бензин",
  diesel: "Дизель",
  hybrid: "Гибрид",
  plugin: "Plug-in гибрид",
  electric: "Цахилгаан",
  gas: "Газ",
};
export const TRANSMISSION: Record<Transmission, string> = { auto: "Автомат", manual: "Механик" };
export const STEERING: Record<Steering, string> = { left: "Зөв жолоо", right: "Буруу жолоо" };
export const DRIVE: Record<Drive, string> = { fwd: "Урд хөтлөгч", rwd: "Хойд хөтлөгч", awd: "4WD / AWD" };
export const COLORS = ["Цагаан", "Хар", "Мөнгөлөг", "Саарал", "Улаан", "Цэнхэр", "Ногоон", "Бор", "Шар", "Бусад"];

export const opts = <K extends string>(m: Record<K, string>) =>
  (Object.keys(m) as K[]).map((value) => ({ value, label: m[value] }));

const km = (n: number) => `${new Intl.NumberFormat("en-US").format(n)} км`;
const liters = (v: number | string) => `${Number(v).toFixed(1)} л`;

/** Карт дээрх богино мөр: «85,000 км · 3.5 л · Гибрид · Автомат» */
export function specLine(a: CarSpecs): string {
  return [
    a.mileage_km != null ? km(a.mileage_km) : null,
    a.engine_l != null && a.engine_l !== "" ? liters(a.engine_l) : null,
    a.fuel ? FUEL[a.fuel] : null,
    a.transmission ? TRANSMISSION[a.transmission] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Зарын дэлгэрэнгүйд харуулах мөрүүд (бөглөөгүйг алгасна) */
export function specRows(a: CarSpecs): [string, string][] {
  const rows: [string, string | null][] = [
    ["Гүйлт", a.mileage_km != null ? km(a.mileage_km) : null],
    ["Хөдөлгүүр", a.engine_l != null && a.engine_l !== "" ? liters(a.engine_l) : null],
    ["Шатахуун", a.fuel ? FUEL[a.fuel] : null],
    ["Хурдны хайрцаг", a.transmission ? TRANSMISSION[a.transmission] : null],
    ["Жолоо", a.steering ? STEERING[a.steering] : null],
    ["Хөтлөгч", a.drive ? DRIVE[a.drive] : null],
    ["Өнгө", a.color || null],
  ];
  return rows.filter((r): r is [string, string] => r[1] != null);
}

/** Маягтын утгууд (текст) */
export type SpecFields = {
  mileage: string;
  engine: string;
  fuel: string;
  transmission: string;
  steering: string;
  drive: string;
  color: string;
};

export const emptySpecFields = (): SpecFields => ({
  mileage: "",
  engine: "",
  fuel: "",
  transmission: "",
  steering: "",
  drive: "",
  color: "",
});

export const specFieldsFrom = (a: CarSpecs): SpecFields => ({
  mileage: a.mileage_km != null ? String(a.mileage_km) : "",
  engine: a.engine_l != null ? String(a.engine_l) : "",
  fuel: a.fuel ?? "",
  transmission: a.transmission ?? "",
  steering: a.steering ?? "",
  drive: a.drive ?? "",
  color: a.color ?? "",
});

/** Гүйлт: зөвхөн цифр; хөдөлгүүр: 1 аравтын орон */
export const mileageInput = (v: string) => v.replace(/\D/g, "").slice(0, 7);
export const engineInput = (v: string) => {
  const s = v.replace(",", ".").replace(/[^\d.]/g, "");
  const [i, d] = s.split(".");
  return d !== undefined ? `${i.slice(0, 2)}.${d.slice(0, 1)}` : i.slice(0, 2);
};

/** DB руу илгээх утгууд */
export function specsToDb(f: SpecFields) {
  const mileage = f.mileage ? Number(f.mileage) : null;
  const engine = f.engine ? Number(f.engine) : null;
  return {
    mileage_km: mileage != null && Number.isFinite(mileage) ? mileage : null,
    engine_l: engine != null && Number.isFinite(engine) && engine > 0 ? engine : null,
    fuel: (f.fuel || null) as Fuel | null,
    transmission: (f.transmission || null) as Transmission | null,
    steering: (f.steering || null) as Steering | null,
    drive: (f.drive || null) as Drive | null,
    color: f.color.trim() || null,
  };
}
