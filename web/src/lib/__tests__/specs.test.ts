import { describe, expect, it } from "vitest";
import { engineInput, mileageInput, specLine, specRows, specsToDb } from "@shared/specs";
import { fieldsFromAd, toDraft, emptyAdFields } from "@shared/ad-post";

describe("машины үзүүлэлт", () => {
  it("карт дээрх мөр", () => {
    expect(specLine({ mileage_km: 85000, engine_l: "3.5", fuel: "hybrid", transmission: "auto" })).toBe(
      "85,000 км · 3.5 л · Гибрид · Автомат",
    );
    expect(specLine({})).toBe("");
  });
  it("дэлгэрэнгүй мөрүүд бөглөөгүйг алгасна", () => {
    expect(specRows({ steering: "left", color: "Цагаан" })).toEqual([
      ["Жолоо", "Зөв жолоо"],
      ["Өнгө", "Цагаан"],
    ]);
  });
  it("оролт цэвэрлэнэ", () => {
    expect(mileageInput("85 000 км")).toBe("85000");
    expect(engineInput("3,56")).toBe("3.5");
    expect(engineInput("abc")).toBe("");
  });
  it("DB утга", () => {
    expect(
      specsToDb({ mileage: "", engine: "0", fuel: "", transmission: "auto", steering: "", drive: "", color: " " }),
    ).toEqual({
      mileage_km: null,
      engine_l: null,
      fuel: null,
      transmission: "auto",
      steering: null,
      drive: null,
      color: null,
    });
  });
  it("зар хуулахад үзүүлэлт, үнэ бөглөгдөж дугаар хоосон", () => {
    const f = fieldsFromAd({
      brand: "Toyota",
      model: "Prius",
      trim: null,
      phone: "99112233",
      year_made: 2018,
      year_imported: 2021,
      options: ["ABS"],
      modifications: null,
      description: null,
      price: 35000000,
      mileage_km: 90000,
      fuel: "hybrid",
    });
    expect(f.price).toBe("35,000,000");
    expect(f.mileage).toBe("90000");
    expect(f.plate).toBe("");
    const d = toDraft(f);
    expect(d.plate_number).toBeNull();
    expect(d.fuel).toBe("hybrid");
    expect(toDraft(emptyAdFields()).mileage_km).toBeNull();
  });
});
