import React from 'react';
import { User } from '@/model/user';
import Image from 'next/image';
import { LogOut } from 'lucide-react';

interface ProfileHeaderProps {
    user: User | null;
    email: string | undefined;
    onLogout: () => void;
}

export function ProfileHeader({ user, email, onLogout }: ProfileHeaderProps) {
    if (!user) return <div className="w-full h-40 bg-white rounded-[32px] animate-pulse" />;

    return (
        <div className="w-full bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 rounded-full bg-slate-50 overflow-hidden shadow-inner">
                    {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={user.name} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-300">
                            {user.name[0]}
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {user.name}
                        <span className="text-xl font-medium text-slate-400">@{user.nickname || "user"}</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">{email}</p>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            {user.team_id || "Team"}
                        </span>
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="text-sm text-slate-400 font-medium">근무중</span>
                    </div>
                </div>
            </div>

            <button
                onClick={onLogout}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-red-500 font-bold transition-all duration-300"
            >
                <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
                <span>로그아웃</span>
            </button>
        </div>
    );
}
