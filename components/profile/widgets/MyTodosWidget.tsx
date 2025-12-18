import React from 'react';
import { Todo } from '@/model/Todo';
import formatDate from '@/lib/utils/format_date';
import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

interface MyTodosWidgetProps {
    todos: Todo[];
    loading: boolean;
    projectId?: string;
}

export function MyTodosWidget({ todos, loading, projectId }: MyTodosWidgetProps) {
    if (loading) return <div className="w-full h-80 bg-white rounded-[32px] animate-pulse" />;

    const displayTodos = todos.slice(0, 5);

    return (
        <div className="w-full h-full bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">해야 할 일</h2>
                    <span className="bg-orange-100 text-orange-600 text-xs px-2.5 py-1 rounded-full font-bold">
                        {todos.length}
                    </span>
                </div>
                {projectId && (
                    <Link href={`/project/${projectId}/todo`} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowRight size={16} />
                    </Link>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-4">
                {displayTodos.length > 0 ? (
                    displayTodos.map(todo => (
                        <div key={todo.id} className="group/item flex items-center gap-4 py-1 cursor-pointer">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 ring-4 ring-orange-50 group-hover/item:ring-orange-100 transition-all" />

                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-800 truncate group-hover/item:text-orange-600 transition-colors">
                                    {todo.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                                        {todo.categories?.name || "No Category"}
                                    </span>
                                    {todo.due_date && (
                                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                            <Clock size={10} />
                                            <span>{formatDate(new Date(todo.due_date))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <p className="text-sm font-bold">모든 작업을 완료했어요!</p>
                        <p className="text-xs">잠시 휴식을 취하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
