-- Вэб push-ийг гаднаас нууц түлхүүр оруулахгүйгээр ажиллуулна:
--  * push_secret нь Vault-д өгөгдлийн сан дотор санамсаргүйгээр үүснэ (хэн ч харж, хуулахгүй)
--  * /api/push/web зөвхөн энэ secret-тэй DB-ийн хүсэлтийг хүлээж авна (push_secret_ok-оор шалгана)
--  * VAPID түлхүүрийг анхны хүсэлтэд сервер өөрөө үүсгээд энд хадгална; нийтийн түлхүүрийг хөтөч уншина
create table if not exists public.webpush_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.webpush_config enable row level security;
revoke all on public.webpush_config from anon, authenticated;

create or replace function public.push_secret_ok(p text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare s text := public.push_secret();
begin
  return s is not null and length(s) >= 32 and p is not null and p = s;
end $$;

create or replace function public.webpush_keys(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.push_secret_ok(p_secret) then raise exception 'Эрх хүрэхгүй'; end if;
  return (select jsonb_build_object('public', public_key, 'private', private_key) from public.webpush_config where id = 1);
end $$;

create or replace function public.webpush_keys_init(p_secret text, p_public text, p_private text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.push_secret_ok(p_secret) then raise exception 'Эрх хүрэхгүй'; end if;
  if coalesce(p_public, '') = '' or coalesce(p_private, '') = '' then raise exception 'Түлхүүр хоосон'; end if;
  insert into public.webpush_config(id, public_key, private_key) values (1, p_public, p_private)
  on conflict (id) do nothing;
  return public.webpush_keys(p_secret);
end $$;

create or replace function public.webpush_public_key() returns text
language sql stable security definer set search_path = public as $$
  select public_key from public.webpush_config where id = 1
$$;

-- Хүчингүй болсон захиалгыг цэвэрлэх (DB-ийн secret-ээр)
create or replace function public.prune_web_push(p_endpoints text[], p_secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.push_secret_ok(p_secret) then raise exception 'Эрх хүрэхгүй'; end if;
  delete from public.web_push_subs where endpoint = any(p_endpoints);
end $$;

-- Анхны тохиргоо: сайт VAPID түлхүүрээ үүсгэхийн тулд хоосон хүсэлт илгээнэ
create or replace function public.webpush_bootstrap() returns void
language plpgsql security definer set search_path = public as $$
declare site text := coalesce((select site_url from public.settings where id = 1), 'https://auto-car-web-kappa.vercel.app');
begin
  perform net.http_post(url := site || '/api/push/web', body := '{"messages":[]}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', coalesce(public.push_secret(), '')),
    timeout_milliseconds := 30000);
end $$;

revoke execute on function public.webpush_bootstrap() from public, anon, authenticated;
revoke execute on function public.webpush_keys_init(text, text, text) from public;
revoke execute on function public.webpush_keys(text) from public;
revoke execute on function public.push_secret_ok(text) from public;
grant execute on function public.push_secret_ok(text) to anon, authenticated;
grant execute on function public.webpush_keys(text) to anon, authenticated;
grant execute on function public.webpush_keys_init(text, text, text) to anon, authenticated;
grant execute on function public.webpush_public_key() to anon, authenticated;
grant execute on function public.prune_web_push(text[], text) to anon, authenticated;

-- Vault-д push_secret байхгүй бол санамсаргүйгээр үүсгэнэ
do $$
begin
  if public.push_secret() is null then
    execute 'select vault.create_secret(encode(extensions.gen_random_bytes(32), ''hex''), ''push_secret'')';
  end if;
exception when others then
  raise notice 'push_secret үүсгэж чадсангүй (Vault алга?): %', sqlerrm;
end $$;
