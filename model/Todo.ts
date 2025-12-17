import { Profile } from "./Profile";

export interface Todo {
    id: string;
    title: string;
    description?: string;
    status: 'backlog' | 'in-progress' | 'done';
    assignees: Profile[];
    created_at?: string;
    due_date?: string;
    project_id?: string;
    category_id?: string;
    categories?: {
        id: string;
        name: string;
    };
}

export type ColumnType = 'backlog' | 'in-progress' | 'done';
