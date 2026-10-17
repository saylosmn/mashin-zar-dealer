import "server-only";
import apk from "./apk.json";
/**
 * Дилерийн хувилбар: APK нь сайтын өөрийнх нь public/ хавтаст (`/auto-car.apk`) байрлана.
 * Шинэ APK гарахад public/auto-car.apk-г сольж, apk.json-ийн version, size-ийг шинэчлээд дахин deploy хийнэ.
 * Өөр газар (Expo, CDN) байрлуулах бол Vercel дээр APK_URL тохируулна.
 */
type ApkMeta = { version: string | null; size: number | null; date: string | null; path: string | null };
const META = apk as ApkMeta;

export type ApkInfo = { version: string | null; sizeMb: number | null; date: string | null };

/** Апп татах хуудсанд харуулах мэдээлэл. null бол апп хараахан бэлэн биш. */
export async function apkInfo(): Promise<ApkInfo | null> {
  if (!process.env.APK_URL && !META.path) return null;
  return {
    version: META.version,
    sizeMb: META.size ? Math.round((META.size / 1024 / 1024) * 10) / 10 : null,
    date: META.date,
  };
}

/** Шууд татах URL */
export async function apkDownloadUrl(): Promise<string> {
  return process.env.APK_URL || META.path || "/app";
}
