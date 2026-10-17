import { getSettings, requireAdmin } from "@/lib/data";
import { pendingCount } from "@/lib/panel";
import { Flash, PanelShell } from "@/components/PanelShell";
import { saveSettings } from "@/actions/settings";

export const metadata = { title: "Админ · Тохиргоо" };

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; apk?: string; v?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireAdmin();
  const [s, pending] = await Promise.all([getSettings(), pendingCount()]);
  return (
    <PanelShell profile={me} area="admin" active="admin-settings" pending={pending}>
      <h1 className="h-display m-0 text-[28px]">Тохиргоо</h1>
      <Flash ok={sp.ok} err={sp.err} />
      <a
        href="/admin/notifications"
        className="card flex max-w-[920px] items-center justify-between gap-3 p-5 no-underline"
      >
        <span className="flex flex-col gap-1">
          <span className="text-[17px] font-bold">Зарлал, мэдэгдэл</span>
          <span className="text-[14px] text-muted">Бүх хэрэглэгчид зарлал илгээх, өмнө илгээснээ устгах</span>
        </span>
        <span className="text-[14px] font-semibold whitespace-nowrap">Нээх →</span>
      </a>
      <form action={saveSettings} className="flex max-w-[920px] flex-col gap-4.5">
        <input type="hidden" name="back" value="/admin/settings" />
        {/* Дилерийн хувилбар: санал, шимтгэл, төлбөр, SMS тохиргоо хасагдсан. Утгыг хэвээр хадгална. */}
        <input type="hidden" name="offer_percent" value={s.offer_percent ?? ""} />
        <section className="card flex flex-col gap-3.5 p-5.5">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] font-bold">Зарын ангилал</h2>
            <span className="text-[14px] text-muted">
              Үйлдвэрлэсэн оноор автоматаар хоёр ангилалд хуваана. Өөрчлөхөд бүх зар шинээр ангилагдана.
            </span>
          </div>
          <label className="flex flex-wrap items-center gap-2.5 text-[14px] font-semibold">
            Зааг он
            <input
              name="cutoff_year"
              type="number"
              defaultValue={s.cutoff_year}
              className="input mono w-[120px] text-center"
            />
            <span className="font-normal text-body">
              → “{s.cutoff_year} ба хойш” / “{s.cutoff_year}-аас өмнө”
            </span>
          </label>
        </section>
        <section className="card flex flex-col p-5.5">
          <h2 className="m-0 mb-2.5 text-[17px] font-bold">Мэдэгдэл</h2>
          <label className="flex items-center justify-between gap-4 border-b border-[#ecede9] py-3 text-[14px]">
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">Шинэ зар батлагдахад бүх хэрэглэгчид мэдэгдэх</span>
              <span className="text-[13px] text-muted">Хэрэглэгч өөрийн шүүлтүүрээр хязгаарлаж болно</span>
            </span>
            <input
              type="checkbox"
              name="notify_all"
              defaultChecked={s.notify_all_on_approve}
              className="h-5 w-5 shrink-0 accent-ink"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-3 text-[14px]">
            <span className="font-semibold">Шинэ зар ирэхэд админуудад мэдэгдэх</span>
            <input
              type="checkbox"
              name="notify_staff"
              defaultChecked={s.notify_staff_on_new}
              className="h-5 w-5 shrink-0 accent-ink"
            />
          </label>
        </section>
        <section className="card flex flex-wrap gap-4 p-5.5">
          <h2 className="m-0 basis-full text-[17px] font-bold">Зарын дүрэм</h2>
          <label className="label flex-[1_1_200px] text-[14px]">
            Хамгийн их зураг
            <input
              name="max_photos"
              type="number"
              min={1}
              max={16}
              defaultValue={s.max_photos}
              className="input mono"
            />
          </label>
          <label className="label flex-[1_1_200px] text-[14px]">
            Хамгийн бага зураг
            <input
              name="min_photos"
              type="number"
              min={1}
              max={16}
              defaultValue={s.min_photos}
              className="input mono"
            />
          </label>
          <label className="label flex-[1_1_200px] text-[14px]">
            Зарын хугацаа (хоног)
            <input name="ad_days" type="number" min={1} defaultValue={s.ad_days} className="input mono" />
            <span className="text-[12px] font-normal text-muted">
              Дууссан зар нийтээс хасагдана, эзэн нь 3 хоногийн өмнө сануулга авч, нэг товшилтоор сунгана.
            </span>
          </label>
        </section>
        <div className="flex justify-end gap-2.5">
          <button className="btn btn-lg btn-yellow">Хадгалах</button>
        </div>
      </form>
    </PanelShell>
  );
}
