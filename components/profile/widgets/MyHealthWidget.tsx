import React from 'react';
import { Activity } from 'lucide-react';
import { Healthcheck } from '@/model/healthcheck';
import formatDate from '@/lib/utils/format_date';

interface MyHealthWidgetProps {
    myHealth: Healthcheck[];
    loading: boolean;
}

export function MyHealthWidget({ myHealth, loading }: MyHealthWidgetProps) {
    if (loading) return <div className="w-full h-40 bg-white rounded-[32px] animate-pulse" />;

    // 1. Prepare Last 5 Days
    const today = new Date();
    const days: { date: Date; dateStr: string; label: string; score: number | null }[] = [];

    for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push({
            date: d,
            dateStr: formatDate(d) || "",
            // Label: "MM/DD"
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            score: null
        });
    }

    // 2. Map Data to Days
    // myHealth contains healthchecks from the team.
    // We need to group by date and average the scores.
    const dateScores: { [key: string]: number[] } = {};

    myHealth.forEach(check => {
        const dStr = formatDate(new Date(check.date));
        if (dStr && check.responses) {
            if (!dateScores[dStr]) dateScores[dStr] = [];

            // Average of THIS check's responses
            const total = check.responses.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const avg = check.responses.length > 0 ? total / check.responses.length : 0;

            if (avg > 0) dateScores[dStr].push(avg);
        }
    });

    // 3. Calc Final Daily Averages
    days.forEach(day => {
        const scores = dateScores[day.dateStr];
        if (scores && scores.length > 0) {
            const sum = scores.reduce((a, b) => a + b, 0);
            day.score = sum / scores.length;
        }
    });

    // 4. Graph Constants
    const maxScore = 5;
    const height = 100; // SVG height
    const width = 200; // SVG width (approx)
    const padding = 10;

    // Y position calculation (higher score = lower Y value)
    const getY = (score: number) => {
        return height - padding - ((score / maxScore) * (height - (padding * 2)));
    };

    // Generate Path
    const points = days.map((day, i) => {
        const x = (i / (days.length - 1)) * (100 - 20) + 10; // spread evenly in %
        const y = day.score ? getY(day.score) : height - padding; // null -> bottom
        return `${x},${y}`;
    }).join(' ');

    // For curve
    // Simple polyline for now

    return (
        <div className="w-full h-full bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">팀 건강</h2>
                </div>
                <div className="text-xs font-bold text-slate-400">
                    최근 5일
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-end pb-2">
                {myHealth.length > 0 ? (
                    <div className="w-full h-[120px] relative">
                        {/* Grid Lines */}
                        <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-slate-100" />
                        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-100" />

                        {/* Bars / Points Visualization */}
                        <div className="w-full h-full flex items-end justify-between px-2">
                            {days.map((day, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 group/bar">
                                    {/* Simple Bar for robustness */}
                                    <div
                                        className="w-3 bg-rose-200 rounded-t-full relative transition-all duration-500 group-hover/bar:bg-rose-400"
                                        style={{
                                            height: day.score ? `${(day.score / 5) * 100}%` : '4px',
                                            opacity: day.score ? 1 : 0.3
                                        }}
                                    >
                                        {/* Score Tooltip */}
                                        {day.score && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] font-bold text-rose-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                                {day.score.toFixed(1)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold">{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-300">
                        <Activity size={24} className="opacity-30 mb-2" />
                        <p className="text-xs font-bold">데이터가 없어요</p>
                    </div>
                )}
            </div>
        </div>
    );
}
