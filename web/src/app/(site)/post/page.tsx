import { cookies } from "next/headers";
import { normAgentCode } from "@/lib/site";
import { getSettings, requireAdmin } from "@/lib/data";
import { PostForm } from "./PostForm";
import { termsFrom } from "@shared/contract";
import { fieldsFromAd } from "@shared/ad-post";
import { createClient } from "@/lib/supabase/server";
import type { Ad } from "@shared/types";

export const metadata = { title: "Зар нэмэх" };

export default async function PostPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  // Дилерийн хувилбар: зарыг зөвхөн админ нэмнэ, шалгалт, төлбөргүй шууд нийтлэгдэнэ
  const me = await requireAdmin();
  const { from } = await searchParams;
  const [settings, jar] = await Promise.all([getSettings(), cookies()]);
  // «Хуулж шинэ зар»: байгаа зарын мэдээллээр маягтыг бөглөнө (зураггүй)
  let initial;
  if (from && /^[0-9a-f-]{36}$/i.test(from)) {
    const supabase = await createClient();
    const { data } = await supabase.from("ads").select("*").eq("id", from).maybeSingle();
    if (data) initial = fieldsFromAd(data as Ad);
  }
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Админ · шууд нийтлэгдэнэ</span>
        <h1 className="h-display m-0 text-[clamp(26px,3vw,36px)]">{initial ? "Зар нэмэх (хуулсан)" : "Зар нэмэх"}</h1>
        {initial && <span className="text-[14px] text-muted">Мэдээлэл бөглөгдсөн. Зургаа нэмээд үнийг шалгаарай.</span>}
      </div>
      <PostForm
        userId={me.id}
        defaultPhone={me.phone ?? ""}
        maxPhotos={settings.max_photos}
        minPhotos={settings.min_photos}
        cutoff={settings.cutoff_year}
        fullName={me.full_name ?? ""}
        contract={termsFrom(settings)}
        dealer
        defaultAgentCode={normAgentCode(jar.get("mz_ref")?.value) ?? ""}
        initial={initial}
        plans={{
          featuredPrice: settings.featured_price ?? 50000,
          featuredDays: settings.featured_days ?? 7,
          commissionFeaturedDays: settings.commission_featured_days ?? 7,
        }}
      />
    </main>
  );
}
