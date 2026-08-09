insert into storage.buckets (id, name, public, file_size_limit)
values ('myos-files', 'myos-files', false, 26214400)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;
