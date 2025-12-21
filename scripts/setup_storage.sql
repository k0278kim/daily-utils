-- Create a storage bucket for project icons if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-icons', 'project-icons', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for project-icons bucket
-- 1. Allow public select (since it's a public bucket)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-icons');

-- 2. Allow authenticated users to upload icons
DROP POLICY IF EXISTS "Authenticated users can upload icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload icons" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-icons' AND
        auth.role() = 'authenticated'
    );

-- 3. Allow users to update/delete icons they uploaded (or any authenticated since we don't have owner link in objects yet)
-- For simplicity in this project, we allow any authenticated user to manage icons for now, 
-- or we could refine it if there's a specific owner link.
DROP POLICY IF EXISTS "Authenticated users can manage icons" ON storage.objects;
CREATE POLICY "Authenticated users can manage icons" ON storage.objects
    FOR ALL USING (
        bucket_id = 'project-icons' AND
        auth.role() = 'authenticated'
    );
