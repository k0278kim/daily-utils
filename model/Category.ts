export interface Category {
    id: string;
    created_at?: string;
    name: string;
    project_id: string;
    user_id?: string;
    color?: string; // Hex color code
}
