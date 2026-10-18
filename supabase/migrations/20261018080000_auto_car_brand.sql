-- Auto car: гэрээ, нөхцөлд харагдах компанийн нэр
alter table public.settings alter column company_name set default 'Auto car';
update public.settings set company_name = 'Auto car' where company_name = 'Autoshop ХХК';
