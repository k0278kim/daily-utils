import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Todo } from '@/model/Todo';
import { Plus, X } from 'lucide-react';
import { CategoryCombobox } from './CategoryCombobox';

interface ColumnProps {
    droppableId: string;
    title: string;
    todos: Todo[];
    onAddTodo?: (title: string, dueDate?: string, description?: string, categoryId?: string) => void;
    onEditTodo: (todo: Todo) => void;
    onToggleStatus?: (todo: Todo) => void;
    projectId?: string;
    enableDateFilter?: boolean;
    enableStatusFilter?: boolean;
}

const Column: React.FC<ColumnProps> = ({ droppableId, title, todos, onAddTodo, onEditTodo, onToggleStatus, projectId, enableDateFilter, enableStatusFilter }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTodoTitle, setNewTodoTitle] = useState('');
    const [newTodoDueDate, setNewTodoDueDate] = useState('');

    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'no-date'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'done'>('all');

    const [newTodoDescription, setNewTodoDescription] = useState('');
    const [newTodoCategoryId, setNewTodoCategoryId] = useState<string | null>(null);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTodoTitle.trim() && onAddTodo) {
            onAddTodo(newTodoTitle, newTodoDueDate || undefined, newTodoDescription, newTodoCategoryId || undefined);
            setNewTodoTitle('');
            setNewTodoDueDate('');
            setNewTodoDescription('');
            setNewTodoCategoryId(null);
            setIsAdding(false);
        }
    };

    const filteredTodos = todos.filter(todo => {
        // Date Filter
        if (enableDateFilter && dateFilter !== 'all') {
            if (dateFilter === 'no-date') {
                if (todo.due_date) return false;
            } else if (todo.due_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(todo.due_date);
                due.setHours(0, 0, 0, 0);

                if (dateFilter === 'today') {
                    if (due.getTime() !== today.getTime()) return false;
                } else if (dateFilter === 'overdue') {
                    if (due.getTime() >= today.getTime()) return false;
                } else if (dateFilter === 'upcoming') {
                    if (due.getTime() <= today.getTime()) return false;
                }
            } else {
                return false; // filtered out if filter is set but date is missing (except no-date)
            }
        }

        // Status Filter
        if (enableStatusFilter && statusFilter !== 'all') {
            if (todo.status !== statusFilter) return false;
        }

        return true;
    });

    return (
        <div className="flex flex-col bg-gray-50 rounded-xl w-full h-full max-h-full overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-white">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        {title}
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            {filteredTodos.length}
                        </span>
                    </h2>
                    {onAddTodo && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                            title="Add Task"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    {enableDateFilter && (
                        <select
                            className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none text-gray-600"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                        >
                            <option value="all">Every Date</option>
                            <option value="today">Today</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="overdue">Overdue</option>
                            <option value="no-date">No Date</option>
                        </select>
                    )}
                    {enableStatusFilter && (
                        <select
                            className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none text-gray-600"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                            <option value="all">All Status</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                    )}
                </div>
            </div>

            <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 overflow-y-auto scrollbar-hide transition-colors ${snapshot.isDraggingOver ? 'bg-gray-100/50' : ''
                            }`}
                    >
                        {isAdding && (
                            <form onSubmit={handleAddSubmit} className="mb-3 bg-white p-3 rounded-lg shadow-sm border border-black/10">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="할 일을 입력하세요..."
                                    className="w-full text-sm outline-none mb-2 font-medium"
                                    value={newTodoTitle}
                                    onChange={(e) => setNewTodoTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setIsAdding(false);
                                            setNewTodoTitle('');
                                            setNewTodoDueDate('');
                                            setNewTodoDescription('');
                                        }
                                    }}
                                />
                                <textarea
                                    placeholder="설명 (선택사항)"
                                    className="w-full text-xs text-gray-500 outline-none mb-2 resize-none"
                                    rows={2}
                                    value={newTodoDescription}
                                    onChange={(e) => setNewTodoDescription(e.target.value)}
                                />
                                <div className="mb-2">
                                    {projectId ? (
                                        <CategoryCombobox
                                            projectId={projectId}
                                            value={newTodoCategoryId || undefined}
                                            onChange={setNewTodoCategoryId}
                                            className="mb-2"
                                        />
                                    ) : (
                                        <div className="text-xs text-gray-400 mb-2">카테고리를 추가하려면 프로젝트를 선택하세요.</div>
                                    )}
                                </div>
                                <div className="mb-2">
                                    <input
                                        type="date"
                                        className="text-xs border border-gray-200 rounded px-2 py-1 outline-none text-gray-500 w-full"
                                        value={newTodoDueDate}
                                        onChange={(e) => setNewTodoDueDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAdding(false); setNewTodoTitle(''); setNewTodoDueDate(''); setNewTodoDescription(''); setNewTodoCategoryId(null); }}
                                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                                    >
                                        추가
                                    </button>
                                </div>
                            </form>
                        )}
                        {filteredTodos.map((todo, index) => (
                            <TaskCard
                                key={todo.id}
                                todo={todo}
                                index={index}
                                onClick={() => onEditTodo(todo)}
                                onToggleStatus={onToggleStatus}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default Column;
