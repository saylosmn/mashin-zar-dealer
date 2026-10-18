-- Дилерийн хувилбар: зар нэмэхэд улсын болон арлын дугаар заавал биш
alter table public.ads alter column plate_number drop not null;
alter table public.ads alter column vin drop not null;
