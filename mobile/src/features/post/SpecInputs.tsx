import { Pressable, View } from "react-native";
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
import { C } from "@/lib/theme";
import { Field, Input, T } from "@/components/ui";

/** Сонголтын товчнууд: дахин дарвал сонголт арилна */
export function Choice({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(on ? "" : o.value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? C.ink : C.line2,
              backgroundColor: on ? C.ink : C.card,
            }}
          >
            <T w={on ? "semibold" : "body"} style={{ fontSize: 13, color: on ? C.yellow : C.body }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Машины үндсэн үзүүлэлт (заавал биш) */
export function SpecInputs({
  value,
  onChange,
}: {
  value: SpecFields;
  onChange: (k: keyof SpecFields, v: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Гүйлт (км)">
            <Input
              value={value.mileage}
              onChangeText={(v) => onChange("mileage", mileageInput(v))}
              keyboardType="number-pad"
              mono
              placeholder="85000"
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Хөдөлгүүр (л)">
            <Input
              value={value.engine}
              onChangeText={(v) => onChange("engine", engineInput(v))}
              keyboardType="decimal-pad"
              mono
              placeholder="1.8"
            />
          </Field>
        </View>
      </View>
      <Field label="Шатахуун">
        <Choice items={opts(FUEL)} value={value.fuel} onChange={(v) => onChange("fuel", v)} />
      </Field>
      <Field label="Хурдны хайрцаг">
        <Choice items={opts(TRANSMISSION)} value={value.transmission} onChange={(v) => onChange("transmission", v)} />
      </Field>
      <Field label="Жолоо">
        <Choice items={opts(STEERING)} value={value.steering} onChange={(v) => onChange("steering", v)} />
      </Field>
      <Field label="Хөтлөгч">
        <Choice items={opts(DRIVE)} value={value.drive} onChange={(v) => onChange("drive", v)} />
      </Field>
      <Field label="Өнгө">
        <Choice
          items={COLORS.map((c) => ({ value: c, label: c }))}
          value={value.color}
          onChange={(v) => onChange("color", v)}
        />
      </Field>
    </View>
  );
}
