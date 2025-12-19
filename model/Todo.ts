import { Profile } from "./Profile";
import { Category } from "./Category";

export interface Todo {
    id: string;
    title: string;
    description?: string;
    content?: string;
    status: 'backlog' | 'in-progress' | 'done';
    assignees: Profile[];
    created_at?: string;
    completed_at?: string;
    due_date?: string;
    project_id?: string;
    category_id?: string;
    categories?: Category;
}

export type ColumnType = 'backlog' | 'in-progress' | 'done';
