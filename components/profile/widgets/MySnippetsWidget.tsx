import React from 'react';
import { FileCode } from 'lucide-react';
import formatDate from '@/lib/utils/format_date';

interface MySnippetsWidgetProps {
    snippets: any[];
    loading: boolean;
}

export function MySnippetsWidget({ snippets, loading }: MySnippetsWidgetProps) {
    if (loading) return <div className="w-full h-40 bg-white rounded-[32px] animate-pulse" />;

    // 1. Calculate the date range (Last 28 days = 4 weeks)
    const today = new Date();
    const days = [];
    const dateCountMap: { [key: string]: number } = {};

    // 2. Process snippets to count per date
    snippets.forEach(snippet => {
        // Use snippet_date (YYYY-MM-DD or ISO) if available, otherwise created_at
        // The model says snippet_date is string.
        let dateStr = "";

        if (snippet.snippet_date) {
            // Assuming snippet_date is YYYY-MM-DD or compatible
            dateStr = snippet.snippet_date.split('T')[0]; // simple normalize
        } else if (snippet.created_at) {
            const date = new Date(snippet.created_at);
            dateStr = formatDate(date) || "";
        }

        if (dateStr) {
            // Since user says only 1 per day is possible, just set to 1 (presence)
            dateCountMap[dateStr] = 1;
        }
    });

    // 3. Generate array for the last 28 days
    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push({
            date: d,
            dateStr: formatDate(d) || "",
            count: 0
        });
    }

    // 4. Fill counts
    days.forEach(day => {
        day.count = dateCountMap[day.dateStr] || 0;
    });

    // Color mapper - simplified for binary state (0 or 1)
    const getColor = (count: number) => {
        if (count > 0) return "bg-green-500 shadow-sm"; // Active
        return "bg-slate-50 border border-slate-100"; // Empty - cleaner look
    };

    return (
        <div className="w-full h-full bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">스니펫</h2>
                </div>
                <div className="text-xs font-bold text-slate-400">
                    최근 4주
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5 px-1">
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                        <div key={d} className="text-center text-[10px] text-slate-300 font-medium">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 px-1">
                    {days.map((day, i) => (
                        <div
                            key={i}
                            className={`aspect-square rounded-[4px] ${getColor(day.count)} flex items-center justify-center transition-all hover:scale-105 relative group/cell cursor-default`}
                        >
                            <span className={`text-[10px] font-bold ${day.count > 0 ? 'text-white' : 'text-slate-400'}`}>
                                {day.date.getDate()}
                            </span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl">
                                <span className="font-bold text-slate-200 mr-1">{day.dateStr}</span>
                                <span className={day.count > 0 ? "text-green-400 font-bold" : "text-slate-400"}>
                                    {day.count > 0 ? "작성완료" : "미작성"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
