import React, { useEffect, useState } from 'react';
import { Praise } from '@/model/praise';
import { User } from '@/model/user';
import { motion } from 'framer-motion';
import Image from 'next/image';
import formatDate from '@/lib/utils/format_date';
import { useSupabaseClient } from '@/context/SupabaseProvider';


interface PraiseFeedProps {
    praises: Praise[];
    isLoading?: boolean;
    selectedUser?: User | null;
}

export function PraiseFeed({ praises, isLoading, selectedUser }: PraiseFeedProps) {
    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3 opacity-50">
                    <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!selectedUser) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-white">
                <p className="text-gray-400 font-medium">팀원을 선택해 칭찬을 확인해보세요</p>
            </div>
        );
    }

    const totalPraises = praises.length;

    return (
        <div className="flex-1 h-full overflow-y-auto scrollbar-hide bg-white">
            <div className="max-w-5xl mx-auto py-12 px-8">
                {/* Header Section */}
                <div className="mb-16 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400 mb-6 shadow-sm overflow-hidden relative">
                        {selectedUser.avatar_url ? (
                            <Image
                                src={selectedUser.avatar_url}
                                alt={selectedUser.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            selectedUser.name[0]
                        )}
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{selectedUser.name}</h1>
                    <p className="text-gray-500 text-sm font-medium">{selectedUser.email}</p>

                    <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
                        <span className="text-sm font-bold text-gray-900">👏 받은 칭찬</span>
                        <span className="text-sm font-bold text-gray-900">{totalPraises}개</span>
                    </div>
                </div>

                {/* Praises Grid */}
                {totalPraises === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400">아직 받은 칭찬이 없어요.</p>
                        <p className="text-gray-300 text-sm mt-1">첫 번째 칭찬을 남겨보세요!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                        {praises.map((praise, index) => (
                            <PraiseBlock key={praise.id} praise={praise} index={index} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PraiseBlock({ praise, index }: { praise: Praise, index: number }) {
    const supabase = useSupabaseClient();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchAvatar = async () => {
            const { data } = await supabase.from('profiles')
                .select("avatar_url")
                .eq("id", praise.praise_from.id)
                .single();
            if (data) setAvatarUrl(data.avatar_url);
        };
        fetchAvatar();
    }, [praise.praise_from.id, supabase]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "50px" }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="flex flex-col h-full"
        >
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300 border border-gray-100 flex-1 flex flex-col relative group">
                <div className="relative z-10 pt-2 mb-8 flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 leading-snug break-keep">
                        {praise.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-keep text-[15px]">
                        {praise.content}
                    </p>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-50">
                    <div className="relative w-8 h-8 rounded-full bg-gray-50 ring-1 ring-gray-100 overflow-hidden flex-shrink-0">
                        {avatarUrl ? (
                            <Image src={avatarUrl} fill alt={praise.praise_from.name} className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="text-[10px] font-bold">{praise.praise_from.name[0]}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{praise.praise_from.name}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(new Date(praise.created_at))}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
