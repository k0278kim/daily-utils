export interface Project {
    id: string;
    name: string;
    created_at?: string;
    user_id?: string;
    icon?: string;
    visibility?: 'public' | 'private';
    currentUserRole?: 'owner' | 'editor' | 'viewer';
}
