import React, { useState, useEffect } from 'react';
import { Todo } from '@/model/Todo';
import { X, Calendar, Tag } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50 shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500">할 일 수정</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Title & Description Section */}
                        <div className="space-y-4">
                            <input
                                type="text"
                                required
                                className="w-full text-2xl font-bold text-gray-900 border-none p-0 outline-none focus:ring-0 placeholder:text-gray-300"
                                placeholder="할 일 제목"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                            <textarea
                                rows={5}
                                className="w-full text-base text-gray-600 border-none p-0 outline-none focus:ring-0 resize-none placeholder:text-gray-300 leading-relaxed"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="상세 설명을 입력하세요..."
                            />
                        </div>

                        {/* Metadata Section */}
                        <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <Tag size={12} />
                                    카테고리
                                </label>
                                {projectId ? (
                                    <CategoryCombobox
                                        projectId={projectId}
                                        value={categoryId || undefined}
                                        onChange={setCategoryId}
                                        className="bg-white border-gray-200"
                                    />
                                ) : (
                                    <div className="text-sm text-gray-400">프로젝트 필요</div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <Calendar size={12} />
                                    마감일
                                </label>
                                <input
                                    type="date"
                                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-gray-700"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 text-sm font-semibold bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                        >
                            저장하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTodoModal;
