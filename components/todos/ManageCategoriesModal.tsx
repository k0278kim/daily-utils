import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/supabaseClient';
import { Category } from '@/model/Category';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface ManageCategoriesModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onCategoriesChanged: () => void;
}

export function ManageCategoriesModal({ projectId, isOpen, onClose, onCategoriesChanged }: ManageCategoriesModalProps) {
    const supabase = createClient();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && projectId) {
            fetchCategories();
        }
    }, [isOpen, projectId]);

    const fetchCategories = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('project_id', projectId)
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            setCategories(data || []);
        }
        setIsLoading(false);
    };

    const handleDelete = async (categoryId: string) => {
        if (!confirm('정말로 이 카테고리를 삭제하시겠습니까?\n이 카테고리를 사용하는 모든 작업에서 카테고리 지정이 해제됩니다.')) return;

        setDeletingId(categoryId);
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (error) {
            console.error('Error deleting category:', error);
            alert('카테고리 삭제 실패');
        } else {
            setCategories(categories.filter(c => c.id !== categoryId));
            onCategoriesChanged();
        }
        setDeletingId(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">카테고리 관리</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-gray-400" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            등록된 카테고리가 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((category) => (
                                <div key={category.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 group">
                                    <span className="font-medium text-gray-700">{category.name}</span>
                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        disabled={deletingId === category.id}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="삭제"
                                    >
                                        {deletingId === category.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={16} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-100 text-xs text-gray-500 flex items-start gap-2 shrink-0">
                    <AlertTriangle size={14} className="mt-0.5 text-amber-500 shrink-0" />
                    <p>카테고리를 삭제하면 해당 카테고리가 지정된 모든 할 일에서 카테고리 정보가 사라집니다. (할 일은 삭제되지 않습니다)</p>
                </div>
            </div>
        </div>
    );
}
