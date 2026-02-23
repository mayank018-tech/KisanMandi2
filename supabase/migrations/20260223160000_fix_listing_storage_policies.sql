-- Align storage policies for listings bucket with multi-image uploads
-- Allows authenticated users (and service_role) to insert/select/delete objects in the listings bucket

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('listings', 'listings', true)
  on conflict (id) do update set public = true;
end$$;

-- Select policy (public)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'listings_public_select') then
    create policy listings_public_select
    on storage.objects for select
    to public
    using (bucket_id = 'listings');
  end if;
end$$;

-- Insert policy (authenticated + service role)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'listings_auth_insert') then
    create policy listings_auth_insert
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'listings');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'listings_service_insert') then
    create policy listings_service_insert
    on storage.objects for insert
    to service_role
    with check (bucket_id = 'listings');
  end if;
end$$;

-- Delete policy (authenticated + service role)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'listings_auth_delete') then
    create policy listings_auth_delete
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'listings');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'listings_service_delete') then
    create policy listings_service_delete
    on storage.objects for delete
    to service_role
    using (bucket_id = 'listings');
  end if;
end$$;
