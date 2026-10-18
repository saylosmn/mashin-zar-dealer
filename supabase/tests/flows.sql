-- =====================================================================
-- SQL урсгалын тест (CI) — дилерийн хувилбар:
-- зарыг зөвхөн админ нэмнэ (шууд нийтлэгдэнэ), хэрэглэгч үзэх, гомдол, чат, утас харах.
-- stubs.sql -> schema.sql (2 удаа, idempotent шалгалт) -> энэ файл. Алдаа гарвал psql 1-ээр гарна.
-- =====================================================================
\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('test.uid', u, false) $$;
create or replace function pg_temp.eq(actual anyelement, expected anyelement, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAIL %: got %, expected %', label, actual, expected; end if;
  raise notice 'ok  %', label;
end $$;
create or replace function pg_temp.fails(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL %: expected an error', label;
exception when others then
  if sqlerrm like 'FAIL %' then raise; end if;
  raise notice 'ok  % (%)', label, sqlerrm;
end $$;

insert into auth.users(id, email, email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a','admin@x.mn', now()),
 ('00000000-0000-0000-0000-00000000000b','admin2@x.mn', now()),
 ('00000000-0000-0000-0000-00000000000c','user@x.mn', now()),
 ('00000000-0000-0000-0000-00000000000d','other@x.mn', now()),
 ('00000000-0000-0000-0000-00000000000e','buyer@x.mn', now());
update public.profiles set role = 'admin' where email in ('admin@x.mn', 'admin2@x.mn');
update public.profiles set profile_completed = true, full_name = 'Бат Болд', phone = '99112233';

-- 1. Админ зар нэмэхэд шалгалт, гэрээ, төлбөргүй шууд нийтлэгдэнэ
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
insert into public.ads(user_id, brand, model, plate_number, vin, phone, year_made, price, photos)
values ('00000000-0000-0000-0000-00000000000a','Toyota','Prius','1234 УБА','JTD123','99112233',2018,35000000,'{a.jpg}')
returning id as ad \gset
reset role;
select pg_temp.eq((select (status, approved_at is not null)::text from public.ads where id = :'ad'), '(active,t)', 'админы зар шууд нийтлэгдсэн');
select pg_temp.eq((select round(extract(epoch from expires_at - now()) / 86400)::int from public.ads where id = :'ad'), 60, 'хугацаа 60 хоног');
set role anon;
select pg_temp.eq((select count(*)::int from public.public_ads where id = :'ad'), 1, 'нийтэд харагдана');
reset role;

-- 2. Энгийн хэрэглэгч зар нэмж чадахгүй
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.fails($$insert into public.ads(user_id, brand, model, plate_number, vin, phone, year_made, price, photos)
  values ('00000000-0000-0000-0000-00000000000e','Honda','Fit','5555 УБА','GP5-1','99112233',2016,20000000,'{a.jpg}')$$, 'хэрэглэгч зар нэмэхгүй');
select pg_temp.fails($$insert into public.ads(user_id, brand, model, plate_number, vin, phone, year_made, price, photos, plan)
  values ('00000000-0000-0000-0000-00000000000e','Honda','Fit','5555 УБА','GP5-1','99112233',2016,20000000,'{a.jpg}','paid')$$, 'хэрэглэгч төлбөртэй зар ч нэмэхгүй');
select pg_temp.fails($$insert into public.ads(user_id, brand, model, plate_number, vin, phone, year_made, price, photos)
  values ('00000000-0000-0000-0000-00000000000a','Honda','Fit','5555 УБА','GP5-1','99112233',2016,20000000,'{a.jpg}')$$, 'админы нэрээр зар нэмэхгүй');
select pg_temp.eq((select count(*)::int from public.ads where id = :'ad'), 0, 'хэрэглэгч ads хүснэгтээс харахгүй');
reset role;

-- 3. Гомдол
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.eq((select public.report_ad(:'ad', 'wrong_price', 'Үнэ өөр байна') is not null), true, 'гомдол илгээх');
select pg_temp.fails(format($$select public.report_ad(%L, 'fake', null)$$, :'ad'), 'нэг зарыг давхар мэдээлэхгүй');
select pg_temp.fails(format($$select public.report_ad(%L, 'other', '')$$, :'ad'), '«бусад» шалтгаан тайлбартай');
select pg_temp.eq((select count(*)::int from public.ad_flags), 0, 'хэрэглэгч гомдлын жагсаалт харахгүй');
reset role;
select pg_temp.eq((select count(*)::int from public.notifications where type = 'ad_flag') > 0, true, 'админд гомдлын мэдэгдэл');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select public.resolve_flag((select id from public.ad_flags limit 1), 'dismiss', null);
reset role;
select pg_temp.eq((select status from public.ad_flags limit 1), 'dismissed', 'гомдол хаагдсан');

-- 4. Онцлох зарыг админ тавина
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.fails(format($$select public.set_featured(%L, 7)$$, :'ad'), 'хэрэглэгч онцлох болгохгүй');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select public.set_featured(:'ad', 7);
reset role;
select pg_temp.eq((select featured from public.public_ads where id = :'ad'), true, 'онцлох');

-- 5. Хугацаа: сануулга -> дууссан -> нийтээс хасагдана -> админ сунгана
update public.ads set expires_at = now() + interval '2 days' where id = :'ad';
select pg_temp.eq(public.expire_ads_job(), 1, 'сануулга');
select pg_temp.eq(public.expire_ads_job(), 0, 'давхар сануулахгүй');
update public.ads set expires_at = now() - interval '1 hour' where id = :'ad';
select pg_temp.eq(public.expire_ads_job(), 1, 'дууссан мэдэгдэл');
select pg_temp.eq((select count(*)::int from public.public_ads where id = :'ad'), 0, 'дууссан зар нийтэд харагдахгүй');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.fails(format($$select public.renew_ad(%L)$$, :'ad'), 'хэрэглэгч зар сунгахгүй');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.eq(public.renew_ad(:'ad') > now() + interval '59 days', true, 'админ сунгасан');
reset role;
select pg_temp.eq((select count(*)::int from public.public_ads where id = :'ad'), 1, 'сунгасны дараа харагдана');

-- 6. Алдааны бүртгэл: нэвтрээгүй ч илгээнэ, ижил алдааг нэгтгэнэ, зөвхөн админ уншина
select pg_temp.as_user('');
set role anon;
select public.log_client_error('web', 'TypeError at 12', 'stack', '/ads/1', 'UA', null);
select public.log_client_error('web', 'TypeError at 99', 'stack', '/ads/2', 'UA', null);
select pg_temp.fails($$select count(*) from public.error_logs$$, 'нэвтрээгүй хүн уншихгүй');
reset role;
select pg_temp.eq((select (count(*), max(hits))::text from public.error_logs), '(1,2)', 'ижил алдаа нэгтгэгдэнэ');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.eq((select count(*)::int from public.error_logs), 0, 'хэрэглэгч алдааны бүртгэл харахгүй');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.eq((select count(*)::int from public.error_logs), 1, 'админ уншина');
reset role;
select pg_temp.eq(public.notify_url('new_ad', '00000000-0000-0000-0000-0000000000ff'), '/ads/00000000-0000-0000-0000-0000000000ff', 'push холбоос (зар)');

-- 7. Утас: нийтэд харагдахгүй, нэвтэрсэн хүн RPC-ээр, бүртгэлтэй
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
insert into public.ads(user_id, brand, model, plate_number, vin, phone, year_made, price, photos)
values ('00000000-0000-0000-0000-00000000000a','Lexus','RX','5678 УНА','LX999','99112233',2019,80000000,'{b.jpg}') returning id as ad2 \gset
reset role;
select pg_temp.fails($$select phone from public.public_ads limit 1$$, 'public_ads-д утас байхгүй');
select pg_temp.as_user('');
set role anon;
select pg_temp.fails(format($$select public.reveal_phone(%L)$$, :'ad2'), 'нэвтрээгүй хүн утас харахгүй');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.eq(public.reveal_phone(:'ad2'), '99112233', 'нэвтэрсэн хүн утас харна');
select public.reveal_phone(:'ad2');
select pg_temp.eq((select count(*)::int from public.ad_phone_views), 0, 'хэрэглэгч бусдын бүртгэл харахгүй');
reset role;
select pg_temp.eq((select times from public.ad_phone_views where ad_id = :'ad2'), 2, 'харсан тоо');

-- 8. Чат: худалдан авагч админтай (компанитай) чатлана
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select public.start_chat(:'ad2', 'Сайн байна уу, машин байгаа юу?') as conv \gset
select pg_temp.eq(public.start_chat(:'ad2', 'Дахиад нэг асуулт'), :'conv'::uuid, 'нэг зарт нэг чат');
select pg_temp.fails(format($$select public.send_message(%L, '   ')$$, :'conv'), 'хоосон мессеж');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.eq(public.chat_unread(), 2, 'компанид 2 уншаагүй');
select public.send_message(:'conv', 'Байгаа, хэзээ үзэх вэ?');
select public.mark_chat_read(:'conv');
select pg_temp.eq(public.chat_unread(), 0, 'уншсан');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
set role authenticated;
select pg_temp.eq((select count(*)::int from public.messages), 0, 'гуравдагч хүн мессеж харахгүй');
select pg_temp.fails(format($$select public.send_message(%L, 'hack')$$, :'conv'), 'гуравдагч хүн бичихгүй');
select pg_temp.fails($$insert into public.messages(conversation_id, sender_id, body) values (gen_random_uuid(), auth.uid(), 'x')$$, 'шууд insert хориотой');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select pg_temp.eq((select count(*)::int from public.messages), 3, 'нөгөө админ чат уншина');
reset role;

-- 9. Админ зарагдсан гэж тэмдэглэнэ, хэрэглэгч чадахгүй
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.fails(format($$select public.dealer_set_status(%L, 'sold', 78000000)$$, :'ad2'), 'хэрэглэгч зарагдсан болгохгүй');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select public.dealer_set_status(:'ad2', 'sold', 78000000);
reset role;
select pg_temp.eq((select status from public.ads where id = :'ad2'), 'sold', 'зар зарагдсан');

-- 10. Push токен: нэг утсан дээр аккаунт солиход шинэ хэрэглэгчид шилжинэ
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select public.save_push_token('ExponentPushToken[abc123]', 'android');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select public.save_push_token('ExponentPushToken[abc123]', 'android');
select pg_temp.fails($$select public.save_push_token('bad-token', 'android')$$, 'буруу токен');
reset role;
select pg_temp.eq((select user_id from public.push_tokens where token = 'ExponentPushToken[abc123]'), '00000000-0000-0000-0000-00000000000e'::uuid, 'токен шинэ хэрэглэгчид шилжсэн');

-- 11. Эрхийн хамгаалалт
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.eq(public.is_staff(), true, 'админ = ажилтан');
select public.invite_staff('boss@x.mn', 'admin');
reset role;
select pg_temp.eq((select role from public.staff_invites where email = 'boss@x.mn'), 'admin', 'админы урилга');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
set role authenticated;
select pg_temp.eq(public.is_staff(), false, 'хэрэглэгч ажилтан биш');
select pg_temp.fails($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'өөрийгөө админ болгохгүй (RLS)');
reset role;
select pg_temp.fails($$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000e'$$, 'өөрийгөө админ болгохгүй (trigger)');
-- Зургийн сан: зөвхөн зураг, өөрийн хавтас
set role authenticated;
select pg_temp.fails($$insert into storage.objects(bucket_id, name) values ('ad-photos', '00000000-0000-0000-0000-00000000000e/x.svg')$$, 'зургийн санд SVG оруулахгүй');
select pg_temp.fails($$insert into storage.objects(bucket_id, name) values ('ad-photos', '00000000-0000-0000-0000-00000000000a/x.jpg')$$, 'бусдын хавтаст зураг оруулахгүй');
reset role;

-- 12. Вэб push: secret-гүй хүн түлхүүр авч, үүсгэж чадахгүй
set role anon;
select pg_temp.eq(public.push_secret_ok('x'), false, 'буруу push secret');
select pg_temp.fails($$select public.webpush_keys('x')$$, 'secret-гүй VAPID түлхүүр авахгүй');
select pg_temp.fails($$select public.webpush_keys_init('x', 'a', 'b')$$, 'secret-гүй VAPID үүсгэхгүй');
select pg_temp.fails($$select count(*) from public.webpush_config$$, 'VAPID хүснэгт нийтэд харагдахгүй');
select pg_temp.eq(public.webpush_public_key() is null, true, 'нийтийн түлхүүр хараахан алга');
reset role;

\echo 'Бүх SQL тест амжилттай'
