import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Todo } from '@/model/Todo';
import { Plus, X, Calendar, Tag } from 'lucide-react';
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
        <div className="flex flex-col h-full max-h-full overflow-hidden rounded-xl bg-gray-50/50 border border-t-0 border-x-0 border-b-0">
            {/* Header */}
            <div className="px-3 py-3 flex justify-between items-center bg-transparent">
                <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-semibold text-gray-700">
                        {title}
                    </h2>
                    <span className="text-[11px] font-medium text-gray-400">
                        {filteredTodos.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {enableDateFilter && (
                        <select
                            className="bg-transparent text-[11px] font-medium text-gray-500 outline-none cursor-pointer hover:text-gray-800 transition-colors"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="overdue">Overdue</option>
                            <option value="no-date">No Date</option>
                        </select>
                    )}
                    {enableStatusFilter && (
                        <select
                            className="bg-transparent text-[11px] font-medium text-gray-500 outline-none cursor-pointer hover:text-gray-800 transition-colors"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                            <option value="all">Status</option>
                            <option value="in-progress">In Progress</option>
                            <option value="done">Done</option>
                        </select>
                    )}
                    {onAddTodo && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="text-gray-400 hover:text-gray-800 transition-colors p-1"
                            title="Add Task"
                        >
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            </div>

            <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 px-3 pb-3 overflow-y-auto scrollbar-hide`}
                    >
                        {isAdding && (
                            <form onSubmit={handleAddSubmit} className="mb-4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                                <div className="space-y-3">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="할 일 제목"
                                        className="w-full text-sm font-bold text-gray-900 placeholder:text-gray-300 outline-none"
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
                                        placeholder="자세한 설명이나 메모를 남기세요..."
                                        className="w-full text-xs text-gray-600 placeholder:text-gray-300 outline-none resize-none leading-relaxed"
                                        rows={2}
                                        value={newTodoDescription}
                                        onChange={(e) => setNewTodoDescription(e.target.value)}
                                    />
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-3">
                                    {projectId && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 uppercase tracking-wide">
                                                <Tag size={10} /> 카테고리
                                            </span>
                                            <CategoryCombobox
                                                projectId={projectId}
                                                value={newTodoCategoryId || undefined}
                                                onChange={setNewTodoCategoryId}
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 uppercase tracking-wide">
                                            <Calendar size={10} /> 마감일
                                        </span>
                                        <input
                                            type="date"
                                            className="w-full text-xs bg-gray-50 border border-gray-100 rounded-md px-2 py-1.5 outline-none focus:border-gray-300 text-gray-600"
                                            value={newTodoDueDate}
                                            onChange={(e) => setNewTodoDueDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAdding(false); setNewTodoTitle(''); setNewTodoDueDate(''); setNewTodoDescription(''); setNewTodoCategoryId(null); }}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm"
                                    >
                                        추가
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-0.5">
                            {filteredTodos.map((todo, index) => (
                                <TaskCard
                                    key={todo.id}
                                    todo={todo}
                                    index={index}
                                    onClick={() => onEditTodo(todo)}
                                    onToggleStatus={onToggleStatus}
                                />
                            ))}
                        </div>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default Column;
