-- Create public storage bucket for listing images (idempotent, PG14-safe)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('listings', 'listings', true)
  on conflict (id) do update set public = true;
end$$;

-- Allow public reads
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'public_read_listings_bucket') then
    create policy public_read_listings_bucket
    on storage.objects for select
    to public
    using (bucket_id = 'listings');
  end if;
end$$;

-- Allow authenticated users to upload to the bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'auth_upload_listings_bucket') then
    create policy auth_upload_listings_bucket
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'listings');
  end if;
end$$;

-- Allow authenticated users to delete objects in the bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'auth_delete_listings_bucket') then
    create policy auth_delete_listings_bucket
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'listings');
  end if;
end$$;
