import { NextResponse } from "next/server";
import { apkDownloadUrl } from "@/lib/release";

export const dynamic = "force-dynamic";

/** Нэг товшилтоор APK татах: сайтын /auto-car.apk (эсвэл APK_URL) руу шууд. */
export async function GET(request: Request) {
  // iPhone дээр APK ажиллахгүй -> суулгах заавар руу
  if (/iPhone|iPad|iPod/i.test(request.headers.get("user-agent") ?? ""))
    return NextResponse.redirect(new URL("/app", request.url), 302);
  const res = NextResponse.redirect(new URL(await apkDownloadUrl(), request.url), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
