import React, { useState, useEffect } from 'react';
import { Todo } from '@/model/Todo';
import { X } from 'lucide-react';
import { CategoryCombobox } from './CategoryCombobox';

interface EditTodoModalProps {
    todo: Todo | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedTodo: Todo) => void;
    projectId?: string;
}

const EditTodoModal: React.FC<EditTodoModalProps> = ({ todo, isOpen, onClose, onSave, projectId }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (todo) {
            setTitle(todo.title);
            setDescription(todo.description || '');
            setCategoryId(todo.category_id || null);
            // Format for date input (YYYY-MM-DD)
            if (todo.due_date) {
                const date = new Date(todo.due_date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setDueDate(`${year}-${month}-${day}`);
            } else {
                setDueDate('');
            }
        }
    }, [todo]);

    if (!isOpen || !todo) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const updatedTodo: Todo = {
            ...todo,
            title,
            description,
            category_id: categoryId || undefined,
            due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        };

        onSave(updatedTodo);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Edit Task</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">카테고리</label>
                        {projectId ? (
                            <CategoryCombobox
                                projectId={projectId}
                                value={categoryId || undefined}
                                onChange={setCategoryId}
                            />
                        ) : (
                            <div className="text-sm text-gray-500 italic">프로젝트를 선택해야 카테고리를 편집할 수 있습니다.</div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                            Due Date
                        </label>
                        <input
                            type="date"
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-gray-600"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTodoModal;
