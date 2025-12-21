'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Globe, Users, Trash2, Shield, Search, UserPlus, Check, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/supabaseClient';
import { Project } from '@/model/Project';
import { ProjectMember } from '@/model/ProjectMember';
import { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

interface ProjectSettingsModalProps {
    project: Project;
    onClose: () => void;
    onUpdate: (updatedProject: Project) => void;
    onDelete: (projectId: string) => Promise<void>;
}

interface Profile {
    id: string;
    email: string;
    name: string;
    nickname?: string;
    avatar_url: string;
}

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({ project, onClose, onUpdate, onDelete }) => {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');
    const [name, setName] = useState(project.name);
    const [icon, setIcon] = useState(project.icon || '📁');
    const [visibility, setVisibility] = useState(project.visibility || 'private');
    const [members, setMembers] = useState<(ProjectMember & { profiles: Profile })[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Sync state with props if they change externally (Real-time sync)
    useEffect(() => {
        setName(project.name);
        setVisibility(project.visibility || 'private');
        setIcon(project.icon || '📁');
    }, [project.name, project.visibility, project.icon]);

    useEffect(() => {
        fetchCurrentUser();
        fetchMembers();

        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [project.id]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const fetchMembers = async () => {
        const { data, error } = await supabase
            .from('project_members')
            .select('*, profiles(*)')
            .eq('project_id', project.id);

        if (!error && data) {
            setMembers(data as any);
        }
    };

    const handleSearch = async () => {
        const query = searchQuery.trim().replace(/^@/, '');
        if (!query) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`email.ilike.%${query}%,name.ilike.%${query}%,nickname.ilike.%${query}%`)
            .limit(5);

        if (!error && data) {
            const memberIds = members.map(m => m.user_id);
            setSearchResults(data.filter(p => !memberIds.includes(p.id)));
        }
        setIsLoading(false);
    };

    const handleInvite = async (profile: Profile) => {
        const { error } = await supabase
            .from('project_members')
            .insert([{
                project_id: project.id,
                user_id: profile.id,
                role: 'editor'
            }]);

        if (!error) {
            setSearchQuery('');
            setSearchResults([]);
            fetchMembers();
        }
    };

    const handleRemoveMember = async (userId: string) => {
        const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', project.id)
            .eq('user_id', userId);

        if (!error) {
            fetchMembers();
        }
    };

    const handleUpdateRole = async (userId: string, newRole: ProjectMember['role']) => {
        const { error } = await supabase
            .from('project_members')
            .update({ role: newRole })
            .eq('project_id', project.id)
            .eq('user_id', userId);

        if (!error) {
            fetchMembers();
        }
    };

    const handleSaveGeneral = async () => {
        const { error } = await supabase
            .from('projects')
            .update({ name, visibility, icon })
            .eq('id', project.id);

        if (!error) {
            onUpdate({ ...project, name, visibility, icon });
            onClose();
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n포함된 모든 할 일도 함께 삭제됩니다.')) return;
        await onDelete(project.id);
        onClose();
    };

    const currentMember = members.find(m => m.user_id === currentUser?.id);
    const isOwner = currentMember?.role === 'owner';

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Ultra-light backdrop with organic transition */}
            <div
                className="absolute inset-0 bg-white/20 backdrop-blur-2xl transition-opacity duration-700 ease-out overlay-backdrop"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-[580px] rounded-[32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] overlay-content">
                {/* Minimal Header */}
                <div className="px-10 pt-12 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative group" ref={emojiPickerRef}>
                            <button
                                onClick={() => isOwner && setShowEmojiPicker(!showEmojiPicker)}
                                className={`w-16 h-16 flex items-center justify-center bg-gray-50 rounded-[22px] text-3xl transition-all duration-300 ${isOwner ? 'hover:scale-105 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer active:scale-95' : 'cursor-default'}`}
                                disabled={!isOwner}
                            >
                                {icon}
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute top-20 left-0 z-[10001] animate-in zoom-in-95 duration-300 slide-in-from-top-4">
                                    <div className="shadow-2xl rounded-3xl border border-gray-100 overflow-hidden bg-white">
                                        <EmojiPicker
                                            onEmojiClick={(emojiData) => {
                                                setIcon(emojiData.emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            width={320}
                                            height={400}
                                            previewConfig={{ showPreview: false }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 group/header">
                            <input
                                type="text"
                                className={`text-2xl font-semibold tracking-tight text-gray-900 bg-transparent border-none p-0 outline-none focus:ring-0 placeholder:text-gray-200 w-full ${isOwner ? 'cursor-text' : 'cursor-default'}`}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={!isOwner}
                                placeholder="프로젝트 이름"
                            />
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                <span className={`flex items-center gap-1.5 ${visibility === 'public' ? 'text-blue-500/80' : ''}`}>
                                    {visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                                    {visibility === 'private' ? '비공개' : '공개'} 권한
                                </span>
                                <span className="w-1 h-1 rounded-full bg-gray-200" />
                                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                    {currentMember?.role === 'owner' ? '소유자' : currentMember?.role === 'editor' ? '편집자' : currentMember?.role === 'viewer' ? '조회자' : '게스트'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-2xl transition-all duration-300 active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Refined Modern Tabs */}
                <div className="px-10 flex gap-8">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`py-4 text-sm font-semibold relative transition-all duration-300 ${activeTab === 'general' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        개요
                        {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full animate-in fade-in slide-in-from-bottom-1" />}
                    </button>
                    {visibility === 'private' && (
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`py-4 text-sm font-semibold relative transition-all duration-300 ${activeTab === 'members' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            멤버
                            {activeTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full animate-in fade-in slide-in-from-bottom-1" />}
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 px-10 py-8 overflow-y-auto custom-scrollbar">
                    {activeTab === 'general' ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-3 duration-500">
                            {/* General Info */}
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">공개 설정</h3>
                                    <div className="p-1.5 bg-gray-50/50 rounded-[24px] border border-gray-100/50">
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button
                                                onClick={() => setVisibility('private')}
                                                className={`relative flex flex-col items-center gap-3 p-5 rounded-[20px] transition-all duration-500 group/vis ${visibility === 'private' ? 'bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-gray-100' : 'hover:bg-white/50 border border-transparent'}`}
                                                disabled={!isOwner}
                                            >
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-500 ${visibility === 'private' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 group-hover/vis:text-gray-600'}`}>
                                                    <Lock size={18} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className={`text-[13px] font-bold transition-colors duration-500 ${visibility === 'private' ? 'text-gray-900' : 'text-gray-400'}`}>비공개</p>
                                                    <p className={`text-[10px] font-medium transition-colors duration-500 ${visibility === 'private' ? 'text-gray-500' : 'text-gray-300'}`}>초대한 멤버 전용</p>
                                                </div>
                                                {visibility === 'private' && (
                                                    <div className="absolute top-3 right-3 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setVisibility('public')}
                                                className={`relative flex flex-col items-center gap-3 p-5 rounded-[20px] transition-all duration-500 group/vis ${visibility === 'public' ? 'bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-gray-100' : 'hover:bg-white/50 border border-transparent'}`}
                                                disabled={!isOwner}
                                            >
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-500 ${visibility === 'public' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 group-hover/vis:text-blue-400'}`}>
                                                    <Globe size={18} />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className={`text-[13px] font-bold transition-colors duration-500 ${visibility === 'public' ? 'text-blue-600' : 'text-gray-400'}`}>공개</p>
                                                    <p className={`text-[10px] font-medium transition-colors duration-500 ${visibility === 'public' ? 'text-blue-400' : 'text-gray-300'}`}>워크스페이스 공유</p>
                                                </div>
                                                {visibility === 'public' && (
                                                    <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                                        <Check size={10} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Danger Zone - More integrated and subtle */}
                            {isOwner && (
                                <div className="pt-10 border-t border-gray-50">
                                    <div className="flex items-center justify-between group">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">워크스페이스 삭제</h4>
                                            <p className="text-[11px] text-gray-400 font-medium">모든 데이터가 영구적으로 삭제됩니다</p>
                                        </div>
                                        <button
                                            onClick={handleDelete}
                                            className="px-6 py-2.5 bg-gray-50 group-hover:bg-red-50 text-gray-400 group-hover:text-red-500 text-xs font-bold rounded-2xl transition-all duration-300 active:scale-95"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
                            {/* Member Search - Minimalism */}
                            {isOwner && (
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">멤버 추가</h3>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors">
                                            <Search size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-gray-900/5 transition-all duration-500 rounded-3xl text-sm placeholder:text-gray-300 outline-none"
                                            placeholder="이름, 이메일 또는 @닉네임으로 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                        {isLoading && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-900/10 border-t-gray-900 rounded-full animate-spin" />}
                                    </div>

                                    {/* Real-time search result feel */}
                                    {searchResults.length > 0 && (
                                        <div className="p-1 space-y-1 bg-gray-50/50 rounded-[20px] animate-in fade-in zoom-in-95 duration-500">
                                            {searchResults.map((profile) => (
                                                <div key={profile.id} className="flex items-center justify-between p-2 bg-white rounded-[16px] border border-gray-100/50 hover:border-gray-200 transition-all duration-300 group/item">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden ring-2 ring-gray-100/50">
                                                            {profile.avatar_url ? (
                                                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="uppercase">{profile.name?.[0] || profile.email[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[12px] font-bold text-gray-900 leading-none">{profile.name || '알 수 없음'}</span>
                                                                {profile.nickname && (
                                                                    <span className="text-[9px] text-gray-400 font-medium leading-none">@{profile.nickname}</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[9px] text-gray-400 font-medium mt-0.5 leading-none opacity-80">{profile.email}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleInvite(profile)}
                                                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all duration-300 active:scale-95"
                                                        title="초대하기"
                                                    >
                                                        <UserPlus size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Refined Members Management */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">워크스페이스 멤버</h3>
                                <div className="space-y-1.5">
                                    {members.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 hover:border-gray-200 rounded-[18px] group/member transition-all duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-gray-500 uppercase overflow-hidden ring-2 ring-gray-100/50">
                                                    {member.profiles.avatar_url ? (
                                                        <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-[10px]">
                                                            {member.profiles.name?.[0] || member.profiles.email[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[13px] font-bold text-gray-900 tracking-tight">{member.profiles.name || '동료'}</span>
                                                        {member.profiles.nickname && (
                                                            <span className="text-[9px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-50 rounded-lg">@{member.profiles.nickname}</span>
                                                        )}
                                                        {member.user_id === currentUser?.id && (
                                                            <span className="text-[7px] px-1.5 py-0.5 bg-blue-600 text-white rounded-md font-black uppercase tracking-widest leading-none">ME</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] text-gray-400 font-medium opacity-70">{member.profiles.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isOwner && member.user_id !== currentUser?.id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="relative group/select">
                                                            <select
                                                                className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 border border-transparent hover:border-gray-200 hover:bg-white text-[10px] font-bold text-gray-700 rounded-lg outline-none transition-all cursor-pointer focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500/30 shadow-none hover:shadow-sm"
                                                                value={member.role}
                                                                onChange={(e) => handleUpdateRole(member.user_id, e.target.value as any)}
                                                            >
                                                                <option value="owner">소유자</option>
                                                                <option value="editor">편집자</option>
                                                                <option value="viewer">조회자</option>
                                                            </select>
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 transition-transform group-hover/select:scale-110">
                                                                <ChevronRight size={10} className="rotate-90" />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveMember(member.user_id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="멤버 삭제"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${member.role === 'owner' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                                                        {member.role === 'owner' && <Shield size={9} />}
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">{member.role === 'owner' ? '소유자' : member.role === 'editor' ? '편집자' : '조회자'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Floating Button Look */}
                <div className="px-10 py-8 bg-white border-t border-gray-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="text-[13px] font-bold text-gray-300 hover:text-gray-900 transition-colors duration-300"
                    >
                        뒤로
                    </button>
                    {isOwner && (
                        <button
                            onClick={handleSaveGeneral}
                            className="group relative px-10 py-4 bg-gray-900 text-white rounded-[22px] font-bold text-sm shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 flex items-center gap-2 active:scale-95"
                        >
                            변경 사항 저장
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f3f4f6;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #e5e7eb;
                }

                @keyframes backdrop-fade {
                    from { 
                        opacity: 0; 
                        backdrop-filter: blur(0px); 
                    }
                    to { 
                        opacity: 1; 
                        backdrop-filter: blur(20px); 
                    }
                }

                @keyframes modal-entry {
                    from { 
                        opacity: 0; 
                        transform: scale(0.96) translateY(10px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                }

                .overlay-backdrop {
                    animation: backdrop-fade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .overlay-content {
                    animation: modal-entry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ProjectSettingsModal;
