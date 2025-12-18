import React, { useState, useEffect } from 'react';
import { User } from '@/model/user';
import { addPraise } from '@/app/actions/addPraise';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Send, User as UserIcon, Edit2 } from 'lucide-react';
import Hangul from 'hangul-js';
import CircularLoader from '@/components/CircularLoader';

interface AddPraiseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPraiseAdded: () => void;
    users: User[]; // Passed from parent to avoid refetching
    me: User | undefined;
}

export function AddPraiseModal({ isOpen, onClose, onPraiseAdded, users, me }: AddPraiseModalProps) {
    const [praiseTo, setPraiseTo] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(false);

    // Filter users logic
    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
            return;
        }

        const query = searchQuery.toLowerCase();
        const queryDisassembled = Hangul.disassemble(query).join(""); // Support Chosung search if Hangul.js supports it this way

        const filtered = users.filter((user) => {
            const nameDisassembled = Hangul.disassemble(user.name).join("");
            return nameDisassembled.includes(queryDisassembled) ||
                user.name.includes(query) ||
                (user.nickname && user.nickname.includes(query));
        });
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const handleSubmit = async () => {
        if (!me || !praiseTo || !title.trim() || !content.trim()) return;
        if (!me.team_id) {
            alert("팀 정보가 없습니다.");
            return;
        }

        try {
            setLoading(true);
            await addPraise(me, praiseTo, title, content, me.team_id);
            onPraiseAdded();
            onClose();
            // Reset form
            setPraiseTo(null);
            setTitle("");
            setContent("");
            setSearchQuery("");
        } catch (error) {
            console.error(error);
            alert("칭찬 등록에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Backdrop click handler
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    }

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleBackdropClick}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">새로운 칭찬 보내기</h2>
                                    <p className="text-sm text-gray-500 mt-1">동료의 멋진 행동을 칭찬해주세요!</p>
                                </div>
                                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-6">
                                {/* 1. Who to praise? */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-900">누구에게 칭찬할까요?</label>

                                    {!praiseTo ? (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    placeholder="이름으로 검색..."
                                                    value={searchQuery}
                                                    onChange={(e) => {
                                                        setSearchQuery(e.target.value);
                                                        setIsSearching(true);
                                                    }}
                                                    onFocus={() => setIsSearching(true)}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all font-medium text-sm"
                                                />
                                            </div>

                                            {/* Dropdown Results */}
                                            {isSearching && (
                                                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20">
                                                    {filteredUsers.length > 0 ? (
                                                        filteredUsers.map(user => (
                                                            <button
                                                                key={user.id}
                                                                onClick={() => {
                                                                    setPraiseTo(user);
                                                                    setIsSearching(false);
                                                                    setSearchQuery("");
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                                                            >
                                                                <div className="relative w-8 h-8 rounded-full bg-gray-200 border border-gray-100 overflow-hidden flex-shrink-0">
                                                                    {user.avatar_url ? (
                                                                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-50">
                                                                            {user.name[0]}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-sm text-gray-900">{user.name}</div>
                                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-sm text-gray-400">검색 결과가 없습니다.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-full bg-blue-100 border border-blue-200 overflow-hidden flex-shrink-0">
                                                    {praiseTo.avatar_url ? (
                                                        <img src={praiseTo.avatar_url} alt={praiseTo.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-blue-700">
                                                            {praiseTo.name[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{praiseTo.name}</div>
                                                    <div className="text-xs text-blue-600/70">{praiseTo.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setPraiseTo(null)}
                                                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="변경하기"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Title & Content */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-900">어떤 점이 훌륭했나요?</label>
                                        <input
                                            type="text"
                                            placeholder="한 줄 요약 (예: 꼼꼼한 코드 리뷰 감사합니다!)"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors font-medium text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <textarea
                                            placeholder="구체적인 내용을 적어주시면 더 좋아요."
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-colors min-h-[120px] resize-none text-sm leading-relaxed"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !praiseTo || !title.trim() || !content.trim()}
                                    className={`
                                        px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all
                                        ${loading || !praiseTo || !title.trim() || !content.trim()
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-black text-white hover:bg-gray-800 active:scale-95'}
                                    `}
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span>보내기</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
