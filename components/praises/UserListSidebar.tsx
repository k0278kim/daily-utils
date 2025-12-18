import React, { useState } from 'react';
import { User } from '@/model/user';
import { Praise } from '@/model/praise';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface UserListSidebarProps {
    users: User[];
    selectedUser: User | null | undefined; // Allow undefined to match legacy state
    me: User | undefined;
    praises: Praise[];
    onSelectUser: (user: User) => void;
    onAddPraise: () => void;
}

export function UserListSidebar({ users, selectedUser, me, praises, onSelectUser, onAddPraise }: UserListSidebarProps) {
    const [hoverUser, setHoverUser] = useState<User | null>(null);

    return (
        <div className="w-64 h-full flex flex-col bg-white z-10">
            <div className="p-6">
                <button
                    onClick={onAddPraise}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-2xl hover:bg-black transition-all font-bold text-sm shadow-md active:scale-95 duration-200"
                >
                    <Plus size={16} />
                    <span>칭찬하기</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5 scrollbar-hide">
                {users.map((user) => {
                    // Check if current user is selected (using ID if available, otherwise strict equality)
                    // Note: 'me' logic from original file was: selectedUser ? selectedUser : me.
                    // Here we assume the parent handles the "default to me" logic or we check strictly.
                    const isSelected = selectedUser?.email === user.email; // Using email as key based on original map
                    const praiseCount = praises.filter((p) => p.praise_to.email === user.email).length;

                    return (
                        <div
                            key={user.email}
                            className="relative"
                            onMouseEnter={() => setHoverUser(user)}
                            onMouseLeave={() => setHoverUser(null)}
                        >
                            <button
                                onClick={() => onSelectUser(user)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-left relative z-10 group ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative w-9 h-9 rounded-full bg-gray-200 border border-gray-100 overflow-hidden flex-shrink-0">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-50">
                                                {user.name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-semibold transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>
                                            {user.name}
                                        </span>
                                        {user.nickname && (
                                            <span className={`text-[11px] transition-colors ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {user.nickname}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {praiseCount > 0 && (
                                    <div className={`
                                        h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                                        ${isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}
                                    `}>
                                        {praiseCount}
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* My Profile Section at Bottom */}
            {me && (
                <div className="p-6">
                    <div className="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-2xl">
                        <div className="relative w-9 h-9 rounded-full bg-white border border-gray-100 overflow-hidden flex-shrink-0">
                            {me.avatar_url ? (
                                <img src={me.avatar_url} alt={me.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                    {me.name[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900">{me.name}</span>
                            <span className="text-[10px] text-gray-500">{me.email}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
