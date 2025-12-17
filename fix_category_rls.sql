-- Fix RLS policies for categories to allow project collaboration
-- Previous policies only allowed users to view their OWN categories.
-- We need to allow users to view ALL categories in the project.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

-- Create new permissive policies for collaboration
-- 1. READ: Allow authenticated users to view all categories (Client filters by project_id)
CREATE POLICY "Users can view all categories" ON categories
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. INSERT: Allow authenticated users to create categories
CREATE POLICY "Users can create categories" ON categories
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 3. UPDATE: Allow users to update categories (optionally restrict to creator or project members, but permissive for now)
CREATE POLICY "Users can update categories" ON categories
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- 4. DELETE: Allow users to delete categories
CREATE POLICY "Users can delete categories" ON categories
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Ensure Realtime is enabled (in case previous script wasn't run)
-- Commented out because it might already be added, causing an error.
-- ALTER PUBLICATION supabase_realtime ADD TABLE categories;
