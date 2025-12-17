-- Enable Realtime for todo_assignees table
-- This is necessary for clients to receive updates when users are assigned or unassigned.

-- 1. Add table to the publication
alter publication supabase_realtime add table todo_assignees;

-- 2. (Optional but recommended) Set Replica Identity to Full to ensure we get all data in updates/deletes if needed
alter table todo_assignees replica identity full;

-- 3. Verify RLS (Just to be safe, ensure authenticated users can read)
-- (These policies should already exist from todos_schema.sql, but ensuring here doesn't hurt)
-- DO NOT run CREATE POLICY if they already exist, it will error. 
-- So we just assume they exist or user ran todos_schema.sql. 
-- If not, the publication is the most critical missing piece.
