-- Add mind_map column to todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS mind_map JSONB DEFAULT NULL;

-- Notify change (optional, but good practice for ensuring schema cache update in Supabase clients usually handled automatically)
