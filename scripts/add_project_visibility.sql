-- 1. Add visibility column and ensure user_id defaults to current user (creator)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private'));
ALTER TABLE projects ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (project_id, user_id)
);

-- Ensure correct role constraints if table already exists
DO $$ 
BEGIN 
    ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
    ALTER TABLE project_members ADD CONSTRAINT project_members_role_check CHECK (role IN ('owner', 'editor', 'viewer'));
EXCEPTION 
    WHEN OTHERS THEN NULL; 
END $$;

-- 3. Enable RLS for all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions to break RLS recursion
CREATE OR REPLACE FUNCTION check_is_project_member(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = p_id AND user_id = u_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_is_project_owner(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = p_id AND user_id = u_id AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger to automatically add creator as OWNER to project_members
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
    -- Use NEW.user_id directly to ensure consistency with the inserted row
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

-- 6. Update RLS policies for projects
-- Added auth.uid() = user_id back to SELECT policy. 
-- This ensures the creator can ALWAYS see their row, especially during INSERT ... RETURNING.
DROP POLICY IF EXISTS "Projects are viewable by owner, members, or if public" ON projects;
CREATE POLICY "Projects are viewable by owner, members, or if public" ON projects
    FOR SELECT USING (
        auth.uid() = user_id OR 
        visibility = 'public' OR 
        check_is_project_member(id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can create projects" ON projects;
CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Projects are updatable by owner" ON projects;
CREATE POLICY "Projects are updatable by owner" ON projects
    FOR UPDATE USING (check_is_project_owner(id, auth.uid()));

DROP POLICY IF EXISTS "Projects are deletable by owner" ON projects;
CREATE POLICY "Projects are deletable by owner" ON projects
    FOR DELETE USING (check_is_project_owner(id, auth.uid()));

-- 7. Update RLS policies for project_members
DROP POLICY IF EXISTS "Project members are viewable by other members and project owner" ON project_members;
CREATE POLICY "Project members are viewable by other members and project owner" ON project_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        check_is_project_member(project_id, auth.uid())
    );

DROP POLICY IF EXISTS "Project owner can manage members" ON project_members;
CREATE POLICY "Project owner can manage members" ON project_members
    FOR ALL USING (
        check_is_project_owner(project_id, auth.uid())
    );

-- 8. Update RLS policies for todos
DROP POLICY IF EXISTS "Todos are viewable if project is accessible" ON todos;
CREATE POLICY "Todos are viewable if project is accessible" ON todos
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects WHERE id = project_id)
    );

DROP POLICY IF EXISTS "Todos are manageable by project owner or editors" ON todos;
CREATE POLICY "Todos are manageable by project owner or editors" ON todos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = todos.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'editor')
        )
    );

-- 9. Update RLS policies for categories
DROP POLICY IF EXISTS "Categories are viewable if project is accessible" ON categories;
CREATE POLICY "Categories are viewable if project is accessible" ON categories
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM projects WHERE id = project_id)
    );

DROP POLICY IF EXISTS "Categories are manageable by project owner or editors" ON categories;
CREATE POLICY "Categories are manageable by project owner or editors" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = categories.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'editor')
        )
    );

-- 10. Enable Realtime for projects and members
ALTER TABLE projects REPLICA IDENTITY FULL;
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;
