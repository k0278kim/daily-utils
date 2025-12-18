import React from 'react';
import { Praise } from '@/model/praise';
import formatDate from '@/lib/utils/format_date';
import { Gift, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface MyPraisesWidgetProps {
    praisesReceived: Praise[];
    praisesGiven: Praise[];
    loading: boolean;
}

export function MyPraisesWidget({ praisesReceived, praisesGiven, loading }: MyPraisesWidgetProps) {
    if (loading) return <div className="w-full h-80 bg-white rounded-[32px] animate-pulse" />;

    return (
        <div className="w-full h-full bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">칭찬</h2>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">받은 칭찬</span>
                        <span className="text-xl font-black text-slate-800">{praisesReceived.length}</span>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">보낸 칭찬</span>
                        <span className="text-xl font-black text-slate-300">{praisesGiven.length}</span>
                    </div>
                </div>
            </div>

            {praisesReceived.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-5">
                    {praisesReceived.slice(0, 5).map((praise) => (
                        <div key={praise.id} className="flex items-start gap-4 group/item cursor-pointer">
                            <div className="relative w-10 h-10 rounded-full bg-yellow-50 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm group-hover/item:scale-105 transition-transform">
                                {praise.praise_from.avatar_url ? (
                                    <img src={praise.praise_from.avatar_url} alt={praise.praise_from.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-yellow-600">
                                        {praise.praise_from.name[0]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm font-bold text-slate-800 truncate group-hover/item:text-yellow-600 transition-colors">{praise.title}</p>
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                    <span className="text-xs text-slate-500 font-medium truncate">from {praise.praise_from.name}</span>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">{formatDate(new Date(praise.created_at))}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-300">
                    <Gift size={32} className="mb-3 opacity-20" />
                    <p className="text-sm font-bold">아직 받은 칭찬이 없어요</p>
                    <p className="text-xs">동료에게 먼저 칭찬을 보내보세요!</p>
                </div>
            )}

            <Link href="/praises" className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors group/link">
                <span>칭찬 더 보기</span>
                <ArrowRight size={12} className="ml-1 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
        </div>
    );
}
