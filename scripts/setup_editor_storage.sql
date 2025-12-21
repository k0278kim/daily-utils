-- Create a storage bucket for editor uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('editor-uploads', 'editor-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for editor-uploads bucket
-- 1. Allow public select
DROP POLICY IF EXISTS "Public Access Editor Uploads" ON storage.objects;
CREATE POLICY "Public Access Editor Uploads" ON storage.objects
    FOR SELECT USING (bucket_id = 'editor-uploads');

-- 2. Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload to editor-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can upload to editor-uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'editor-uploads' AND
        auth.role() = 'authenticated'
    );
