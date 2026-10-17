-- Дилерийн хувилбар (нэг авто худалдааны компанид зориулсан):
-- зарыг зөвхөн админ нэмнэ, шалгалт, гэрээ, төлбөргүй шууд нийтлэгдэнэ.
-- Энгийн хэрэглэгч зар үзэх, хадгалах, чатлах, лизингийн хүсэлт илгээх боломжтой.

drop policy if exists ads_insert on public.ads;
create policy ads_insert on public.ads for insert with check (
  user_id = auth.uid()
  and public.is_admin()
  and status in ('pending', 'active')
  and sold_at is null
);

create or replace function public.ads_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings;
begin
  select * into s from public.settings where id = 1;
  new.category := case when new.year_made >= coalesce(s.cutoff_year, 2016) then 'new' else 'old' end;
  new.updated_at := now();
  if tg_op = 'INSERT' and not public.is_staff() then
    new.views := 0; new.contacted_at := null; new.manager_note := null; new.offer_percent := null;
    new.offer_sent_at := null; new.approved_at := null; new.sold_price := null;
    new.expires_at := null; new.expiry_warned_at := null; new.expired_notified_at := null;
    new.featured_until := null; new.featured_requested_at := null;
  end if;
  -- Агент: зөвхөн идэвхтэй агент, өөрийгөө биш
  if new.agent_id is not null and (tg_op = 'INSERT' or new.agent_id is distinct from old.agent_id) then
    if new.agent_id = new.user_id
       or not exists (select 1 from public.profiles p where p.id = new.agent_id and p.role = 'agent' and not p.is_blocked) then
      new.agent_id := case when tg_op = 'INSERT' then null else old.agent_id end;
    end if;
  end if;
  -- Админ (болон авто худалдааны) шинэ зар шууд нийтлэгдэнэ
  if tg_op = 'INSERT' and new.status = 'pending'
     and exists (select 1 from public.profiles p where p.id = new.user_id and p.role in ('admin', 'dealer') and not p.is_blocked) then
    new.status := 'active';
    new.approved_at := now();
  end if;
  -- Нийтлэгдэх үед хугацаа эхэлнэ (дахин гаргахад үлдсэн хугацаа хэвээр)
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active')
     and (new.expires_at is null or new.expires_at <= now()) then
    new.expires_at := now() + make_interval(days => coalesce(s.ad_days, 60));
    new.expiry_warned_at := null; new.expired_notified_at := null;
  end if;
  return new;
end $$;
