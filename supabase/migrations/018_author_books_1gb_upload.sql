-- BiblioTech - Allow large local book uploads through Supabase Storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'author-books',
  'author-books',
  false,
  1073741824,
  ARRAY['application/pdf', 'application/epub+zip']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
