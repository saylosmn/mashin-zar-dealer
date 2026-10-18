import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform, Pressable, View } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { WEB_URL } from "@/lib/staff";
import { T } from "./ui";

const num = (v?: string | null) =>
  String(v ?? "0")
    .split(".")
    .map((x) => Number(x) || 0)
    .concat([0, 0, 0])
    .slice(0, 3);
const newer = (a?: string | null, b?: string | null) => {
  const x = num(a),
    y = num(b);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/** APK-г апп дотроо татаад Android-ын суулгагчийг шууд нээнэ. Боломжгүй бол хөтчөөр татуулна. */
async function downloadAndInstall(url: string, version: string, onProgress: (p: number) => void) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FS = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const IL = require("expo-intent-launcher") as typeof import("expo-intent-launcher");
  const file = `${FS.cacheDirectory}auto-car-${version}.apk`;
  await FS.deleteAsync(file, { idempotent: true });
  const task = FS.createDownloadResumable(url, file, {}, (d) => {
    if (d.totalBytesExpectedToWrite > 0) onProgress(d.totalBytesWritten / d.totalBytesExpectedToWrite);
  });
  const res = await task.downloadAsync();
  if (!res || res.status >= 400) throw new Error(`HTTP ${res?.status ?? "?"}`);
  const uri = await FS.getContentUriAsync(res.uri);
  // FLAG_GRANT_READ_URI_PERMISSION (1) | FLAG_ACTIVITY_NEW_TASK (0x10000000)
  await IL.startActivityAsync("android.intent.action.VIEW", {
    data: uri,
    type: "application/vnd.android.package-archive",
    flags: 1 | 0x10000000,
  });
}

/** Шинэ APK гарсан бол мөр гаргаж, "Шинэчлэх" дархад апп дотроо татаж суулгана. */
export function AppVersionBanner() {
  const [info, setInfo] = useState<{ version: string; url: string } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const last = useRef(0);

  const update = async () => {
    if (!info || progress !== null) return;
    setErr(null);
    setProgress(0);
    try {
      await downloadAndInstall(info.url, info.version, setProgress);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      // Хуучин хувилбарт эдгээр модуль байхгүй эсвэл алдаа гарвал хөтчөөр татуулна
      Linking.openURL(info.url).catch(() => {});
    } finally {
      setProgress(null);
    }
  };

  const check = useCallback(async () => {
    if (__DEV__ || Platform.OS !== "android") return;
    if (Date.now() - last.current < 30 * 60 * 1000) return;
    last.current = Date.now();
    try {
      const r = await fetch(`${WEB_URL}/api/app-version`);
      const j = (await r.json()) as { version: string | null; url: string };
      const mine = Updates.runtimeVersion ?? Constants.expoConfig?.version ?? "0";
      if (j.version && newer(j.version, mine) > 0) setInfo({ version: j.version, url: j.url });
    } catch {
      // сүлжээгүй үед алгасна
    }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => sub.remove();
  }, [check]);

  if (!info || hidden) return null;
  return (
    <View
      style={{
        backgroundColor: C.ink,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 8,
      }}
    >
      <Feather name="smartphone" size={18} color={C.yellow} />
      <T w="semibold" style={{ flex: 1, fontSize: 13, color: C.paper }}>
        {progress !== null
          ? `Шинэ хувилбар татаж байна… ${Math.round(progress * 100)}%`
          : err
            ? "Апп дотор татаж чадсангүй, хөтчөөр татаж байна"
            : `Апп-ын шинэ хувилбар (v${info.version}) гарлаа`}
      </T>
      <Pressable
        accessibilityRole="button"
        disabled={progress !== null}
        onPress={update}
        style={{
          backgroundColor: C.yellow,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          opacity: progress !== null ? 0.6 : 1,
        }}
      >
        <T w="bold" style={{ fontSize: 12 }}>
          {progress !== null ? "Түр хүлээнэ үү" : "Шинэчлэх"}
        </T>
      </Pressable>
      <Pressable accessibilityLabel="Хаах" hitSlop={8} onPress={() => setHidden(true)} style={{ padding: 6 }}>
        <Feather name="x" size={16} color={C.pale} />
      </Pressable>
    </View>
  );
}
