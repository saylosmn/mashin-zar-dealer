import { useCallback, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { registerPush, PUSH_REASON, type PushStatus } from "@/lib/push";
import { C } from "@/lib/theme";
import { Button, T, s } from "./ui";

/** Профайл дээрх push мэдэгдлийн төлөв: асаалттай эсэх, яагаад ажиллахгүй байгааг харуулж, туршиж болно. */
export function PushCard({ userId }: { userId: string }) {
  const [st, setSt] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const check = useCallback(async () => {
    const r = await registerPush(userId);
    setSt(r);
    return r;
  }, [userId]);

  useEffect(() => {
    check();
  }, [check]);

  const test = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await check();
      if (!r.ok) return;
      const { error } = await supabase.rpc("test_push");
      setMsg(error ? error.message : "Туршилтын мэдэгдэл илгээлээ. Хэдэн секундэд ирэх ёстой.");
    } finally {
      setBusy(false);
    }
  };

  const ok = st?.ok === true;
  const version = Constants.expoConfig?.version ?? "?";
  return (
    <View style={[s.card, { padding: 14, gap: 10 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T w="semibold" style={{ fontSize: 15 }}>
          Push мэдэгдэл
        </T>
        <T w="semibold" style={{ fontSize: 13, color: st == null ? C.muted : ok ? C.activeFg : C.danger }}>
          {st == null ? "Шалгаж байна…" : ok ? "Асаалттай" : "Ажиллахгүй"}
        </T>
      </View>
      {st && !st.ok && (
        <T style={{ fontSize: 13, color: C.body }}>
          {PUSH_REASON[st.reason]}
          {st.detail ? `\n(${st.detail})` : ""}
        </T>
      )}
      {msg && <T style={{ fontSize: 13, color: C.body }}>{msg}</T>}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          title={ok ? "Туршиж үзэх" : "Дахин оролдох"}
          icon="bell"
          small
          loading={busy}
          onPress={test}
          style={{ flex: 1 }}
        />
        {st && !st.ok && st.reason === "denied" && (
          <Button
            title="Тохиргоо"
            icon="settings"
            small
            variant="ghost"
            onPress={() => Linking.openSettings()}
            style={{ flex: 1 }}
          />
        )}
      </View>
      <T style={{ fontSize: 11, color: C.muted }}>Апп хувилбар {version}</T>
    </View>
  );
}
