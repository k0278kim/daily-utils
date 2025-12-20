"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import { createClient } from '@/utils/supabase/supabaseClient';
import { Category } from '@/model/Category';
import { searchHangul } from '@/utils/hangul';
import { ManageCategoriesModal } from './ManageCategoriesModal';
import { CATEGORY_COLORS } from '@/constants/colors';

interface CategoryComboboxProps {
    projectId: string;
    value?: string; // category_id
    onChange: (categoryId: string | null) => void;
    className?: string;
    variant?: 'default' | 'ghost'; // Added variant prop
    disabled?: boolean;
}

export function CategoryCombobox({ projectId, value, onChange, className, variant = 'default', disabled = false }: CategoryComboboxProps) {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        if (open && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [open]);

    // Update position on scroll/resize
    useEffect(() => {
        if (!open) return;
        const handleScrollOrResize = () => {
            if (dropdownRef.current) {
                const rect = dropdownRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            } else {
                setOpen(false);
            }
        };
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [open]);

    useEffect(() => {
        if (projectId) {
            fetchCategories();
        } else {
            setCategories([]);
        }
    }, [projectId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.category-combobox-portal')
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset active index when search or categories change
    useEffect(() => {
        setActiveIndex(0);
        // Reset color when starting new search
        if (!searchTerm) setSelectedColor(CATEGORY_COLORS[0]);
    }, [searchTerm, categories]);

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

    useEffect(() => {
        if (!projectId) return;

        const channel = supabase
            .channel('realtime categories')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'categories',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    fetchCategories();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId]);

    const handleCreateCategory = async () => {
        if (!searchTerm.trim() || !projectId) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newCategory = {
            name: searchTerm.trim(),
            project_id: projectId,
            user_id: user.id,
            color: selectedColor
        };

        const { data, error } = await supabase
            .from('categories')
            .insert([newCategory])
            .select()
            .single();

        if (error) {
            console.error('Error creating category:', error);
            alert('카테고리 생성 실패');
        } else if (data) {
            setCategories([...categories, data]);
            onChange(data.id);
            setOpen(false);
            setSearchTerm('');
            setSelectedColor(CATEGORY_COLORS[0]);
        }
    };

    const handleManageCategories = () => {
        setIsManageModalOpen(true);
        setOpen(false);
    };

    const handleCategoriesChanged = () => {
        fetchCategories();
    };

    const filteredCategories = categories.filter(c =>
        searchHangul(c.name, searchTerm)
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setOpen(true);
                e.preventDefault();
            }
            return;
        }

        const totalOptions = (searchTerm.trim() && filteredCategories.length === 0 ? 1 : 0) +
            1 + // "선택 없음"
            filteredCategories.length +
            1; // Manage Categories

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < totalOptions - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();

                let currentOptionIndex = 0;

                // 1. Create option
                if (searchTerm.trim() && filteredCategories.length === 0) {
                    if (activeIndex === currentOptionIndex) {
                        handleCreateCategory();
                        return;
                    }
                    currentOptionIndex++;
                }

                // 2. "선택 없음"
                if (activeIndex === currentOptionIndex) {
                    onChange(null);
                    setOpen(false);
                    return;
                }
                currentOptionIndex++;

                // 3. Filtered categories
                if (activeIndex >= currentOptionIndex && activeIndex < currentOptionIndex + filteredCategories.length) {
                    const categoryIndex = activeIndex - currentOptionIndex;
                    onChange(filteredCategories[categoryIndex].id);
                    setOpen(false);
                    return;
                }
                currentOptionIndex += filteredCategories.length;

                // 4. Manage Categories
                if (activeIndex === currentOptionIndex) {
                    handleManageCategories();
                    return;
                }
                break;
            case 'Escape':
                setOpen(false);
                break;
        }
    };

    const selectedCategory = categories.find(c => c.id === value);

    // Calculate indices for highlighting
    let createOptionIndex = -1;
    let noSelectionOptionIndex = -1;
    let categoryStartIndex = -1;
    let manageOptionIndex = -1;
    let currentIndex = 0;

    if (searchTerm.trim() && filteredCategories.length === 0) {
        createOptionIndex = currentIndex++;
    }
    noSelectionOptionIndex = currentIndex++;
    categoryStartIndex = currentIndex;
    currentIndex += filteredCategories.length;
    manageOptionIndex = currentIndex++;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
                className={variant === 'ghost'
                    ? `flex items-center gap-2 text-sm px-2 -ml-2 py-0.5 rounded transition-colors border-none focus:outline-none ring-0 text-left
                       ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}
                       ${selectedCategory
                        ? 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-50 bg-transparent'}`
                    : `w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 ${disabled ? 'cursor-default opacity-60 bg-gray-50' : 'hover:bg-gray-50'}`
                }
            >
                <span className="truncate flex items-center gap-2">
                    {selectedCategory ? (
                        <>
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: selectedCategory.color || '#9ca3af' }}
                            />
                            <span>{selectedCategory.name}</span>
                        </>
                    ) : (
                        <span className="text-slate-400 font-normal">카테고리 선택...</span>
                    )}
                </span>
                {variant !== 'ghost' && <ChevronsUpDown className="h-4 w-4 text-gray-400" />}
            </button>

            {
                open && dropdownPosition && createPortal(
                    <div
                        className="category-combobox-portal absolute z-[100000] mt-1 max-h-80 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-gray-300 ring-opacity-5 focus:outline-none sm:text-sm"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: Math.max(dropdownPosition.width, 220) // Min width 220px
                        }}
                    >
                        <div className="px-2 py-1 sticky top-0 bg-white border-b flex items-center gap-2 z-20">
                            <input
                                type="text"
                                className="w-full rounded-sm border-gray-200 px-2 py-1 text-sm focus:border-green-500 focus:outline-none"
                                placeholder="카테고리 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                            />
                        </div>

                        {searchTerm.trim() && filteredCategories.length === 0 && (
                            <div className="border-b border-gray-100">
                                <div className="px-3 pt-2 pb-1 text-xs text-gray-400">색상 선택</div>
                                <div className="flex flex-wrap gap-2 px-3 pb-2">
                                    {CATEGORY_COLORS.map(color => (
                                        <div
                                            key={color}
                                            className={`w-5 h-5 rounded-full cursor-pointer border-2 ${selectedColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setSelectedColor(color)}
                                        />
                                    ))}
                                </div>

                                <div
                                    className={`cursor-pointer select-none px-4 py-2 text-green-600 flex items-center gap-2 ${activeIndex === createOptionIndex ? 'bg-green-50' : 'hover:bg-green-50'}`}
                                    onClick={handleCreateCategory}
                                    onMouseEnter={() => setActiveIndex(createOptionIndex)}
                                >
                                    <Plus size={14} />
                                    <span>"{searchTerm}" 생성</span>
                                </div>
                            </div>
                        )}

                        {isLoading && <div className="px-4 py-2 text-xs text-gray-500">Loading...</div>}

                        {!isLoading && (
                            <>
                                <div
                                    className={`cursor-pointer select-none px-4 py-2 text-gray-500 italic ${activeIndex === noSelectionOptionIndex ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                                    onClick={() => { onChange(null); setOpen(false); }}
                                    onMouseEnter={() => setActiveIndex(noSelectionOptionIndex)}
                                >
                                    선택 없음
                                </div>

                                {filteredCategories.length === 0 && !searchTerm.trim() && (
                                    <div className="px-4 py-2 text-sm text-gray-500 italic">검색 결과 없음</div>
                                )}

                                {filteredCategories.map((category, index) => (
                                    <div
                                        key={category.id}
                                        className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100 ${activeIndex === categoryStartIndex + index ? 'bg-gray-100' : ''
                                            } ${value === category.id ? 'text-green-900 font-semibold' : 'text-gray-900'
                                            }`}
                                        onClick={() => {
                                            onChange(category.id);
                                            setOpen(false);
                                        }}
                                        onMouseEnter={() => setActiveIndex(categoryStartIndex + index)}
                                    >
                                        <span className="truncate flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: category.color || '#9ca3af' }}
                                            />
                                            {category.name}
                                        </span>
                                        {value === category.id && (
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-green-600">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}
                                    </div>
                                ))}

                                <div className="border-t border-gray-100 mt-1 pt-1">
                                    <div
                                        className={`cursor-pointer select-none px-4 py-2 text-gray-600 hover:bg-gray-100 flex items-center gap-2 text-xs ${activeIndex === manageOptionIndex ? 'bg-gray-100' : ''
                                            }`}
                                        onClick={handleManageCategories}
                                        onMouseEnter={() => setActiveIndex(manageOptionIndex)}
                                    >
                                        <Settings size={14} />
                                        <span>카테고리 관리...</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>,
                    document.body
                )
            }

            <ManageCategoriesModal
                projectId={projectId}
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                onCategoriesChanged={handleCategoriesChanged}
            />
        </div >
    );
}
