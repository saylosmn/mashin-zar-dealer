-- Машины үндсэн үзүүлэлт, «Захиалгатай» тэмдэг, үнэ буурах мэдэгдэл, зарын статистик (админ)

-- ---------- 1. Үндсэн үзүүлэлт ----------
alter table public.ads add column if not exists mileage_km int check (mileage_km between 0 and 3000000);
alter table public.ads add column if not exists engine_l numeric(3,1) check (engine_l > 0 and engine_l <= 20);
alter table public.ads add column if not exists fuel text check (fuel in ('petrol','diesel','hybrid','plugin','electric','gas'));
alter table public.ads add column if not exists transmission text check (transmission in ('auto','manual'));
alter table public.ads add column if not exists steering text check (steering in ('left','right'));
alter table public.ads add column if not exists drive text check (drive in ('fwd','rwd','awd'));
alter table public.ads add column if not exists color text check (char_length(color) <= 30);
alter table public.ads add column if not exists reserved boolean not null default false;

-- ---------- 2. Нийтийн зар: шинэ талбаруудтай ----------
drop view if exists public.public_ads;
create view public.public_ads as
select
  a.id, a.brand, a.model, a.trim,
  public.mask_plate(a.plate_number) as plate_masked,
  public.mask_vin(a.vin) as vin_masked,
  a.year_made, a.year_imported, a.options, a.modifications, a.description,
  a.price, a.photos, a.category, a.status, a.views, a.approved_at, a.created_at,
  a.user_id,
  split_part(coalesce(p.full_name, 'Хэрэглэгч'), ' ', 1) as seller_name,
  p.city as seller_city,
  (select count(*) from public.ads x where x.user_id = a.user_id and x.status in ('active','sold'))::int as seller_ad_count,
  case when p.role = 'dealer' then coalesce(p.shop_name, 'Авто худалдаа') end as seller_shop,
  coalesce(a.featured_until > now(), false) as featured,
  a.expires_at,
  a.mileage_km, a.engine_l, a.fuel, a.transmission, a.steering, a.drive, a.color, a.reserved
from public.ads a
join public.profiles p on p.id = a.user_id
where a.status = 'active' and not p.is_blocked and (a.expires_at is null or a.expires_at > now());
grant select on public.public_ads to anon, authenticated;

-- ---------- 3. Зар засах: шинэ талбарууд ----------
create or replace function public.dealer_update_ad(p_ad uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a public.ads;
begin
  select * into a from public.ads where id = p_ad;
  if a.id is null then raise exception 'Зар олдсонгүй'; end if;
  if not (public.is_admin() or coalesce(public.my_role() = 'dealer' and a.user_id = auth.uid(), false)) then raise exception 'Эрх хүрэхгүй'; end if;
  if a.status = 'sold' then raise exception 'Зарагдсан зарыг засах боломжгүй'; end if;
  if p ? 'price' and coalesce((p->>'price')::bigint, 0) <= 0 then raise exception 'Үнэ буруу'; end if;
  if p ? 'photos' and (jsonb_typeof(p->'photos') <> 'array' or jsonb_array_length(p->'photos') = 0 or jsonb_array_length(p->'photos') > 16) then
    raise exception 'Зураг 1-16 байна';
  end if;
  update public.ads set
    brand = coalesce(nullif(trim(p->>'brand'), ''), brand),
    model = coalesce(nullif(trim(p->>'model'), ''), model),
    trim = case when p ? 'trim' then nullif(trim(p->>'trim'), '') else trim end,
    year_made = coalesce((p->>'year_made')::int, year_made),
    year_imported = case when p ? 'year_imported' then nullif(p->>'year_imported', '')::int else year_imported end,
    plate_number = case when p ? 'plate_number' then nullif(upper(trim(p->>'plate_number')), '') else plate_number end,
    vin = case when p ? 'vin' then nullif(upper(trim(p->>'vin')), '') else vin end,
    phone = coalesce(nullif(trim(p->>'phone'), ''), phone),
    options = case when p ? 'options' then array(select jsonb_array_elements_text(p->'options')) else options end,
    modifications = case when p ? 'modifications' then nullif(trim(p->>'modifications'), '') else modifications end,
    description = case when p ? 'description' then nullif(trim(p->>'description'), '') else description end,
    price = coalesce((p->>'price')::bigint, price),
    photos = case when p ? 'photos' then array(select jsonb_array_elements_text(p->'photos')) else photos end,
    mileage_km = case when p ? 'mileage_km' then nullif(p->>'mileage_km', '')::int else mileage_km end,
    engine_l = case when p ? 'engine_l' then nullif(p->>'engine_l', '')::numeric else engine_l end,
    fuel = case when p ? 'fuel' then nullif(p->>'fuel', '') else fuel end,
    transmission = case when p ? 'transmission' then nullif(p->>'transmission', '') else transmission end,
    steering = case when p ? 'steering' then nullif(p->>'steering', '') else steering end,
    drive = case when p ? 'drive' then nullif(p->>'drive', '') else drive end,
    color = case when p ? 'color' then nullif(trim(p->>'color'), '') else color end
  where id = p_ad;
end $$;

-- ---------- 4. «Захиалгатай» тэмдэг (админ) ----------
create or replace function public.dealer_set_reserved(p_ad uuid, p_reserved boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Эрх хүрэхгүй'; end if;
  update public.ads set reserved = coalesce(p_reserved, false) where id = p_ad and status <> 'sold';
  if not found then raise exception 'Зар олдсонгүй'; end if;
end $$;

-- ---------- 5. Зар бүрийн статистик (админ): үзэлт, утас харсан, хадгалсан ----------
create or replace function public.ad_stats(p_ids uuid[]) returns table(ad_id uuid, views int, phone_views int, saves int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Эрх хүрэхгүй'; end if;
  return query
    select a.id, a.views,
      (select count(*)::int from public.ad_phone_views v where v.ad_id = a.id),
      (select count(*)::int from public.favorites f where f.ad_id = a.id)
    from public.ads a where a.id = any(p_ids);
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.dealer_set_reserved(uuid, boolean)', 'public.ad_stats(uuid[])'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------- 6. Үнэ буурахад хадгалсан хүмүүст мэдэгдэл ----------
create or replace function public.notify_price_drop() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and new.price < old.price then
    insert into public.notifications(user_id, type, title, body, ad_id)
    select f.user_id, 'price_drop',
           'Үнэ буурлаа: ' || new.brand || ' ' || new.model || ' ' || new.year_made,
           to_char(old.price, 'FM999,999,999,999') || '₮ → ' || to_char(new.price, 'FM999,999,999,999') || '₮',
           new.id
    from public.favorites f
    where f.ad_id = new.id and f.user_id <> new.user_id;
  end if;
  return null;
end $$;
drop trigger if exists ads_price_drop on public.ads;
create trigger ads_price_drop after update of price on public.ads
  for each row execute function public.notify_price_drop();
