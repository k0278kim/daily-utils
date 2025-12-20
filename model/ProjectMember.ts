export interface ProjectMember {
    project_id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    created_at: string;
}
