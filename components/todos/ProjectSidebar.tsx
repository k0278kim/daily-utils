"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Folder, FolderOpen, Pencil, Trash2, LayoutGrid, Lock, Globe, Settings } from 'lucide-react';
import { Project } from '@/model/Project';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import ProjectSettingsModal from './ProjectSettingsModal';

interface ProjectSidebarProps {
    selectedProjectId: string | null;
    onSelectProject: (projectId: string | null) => void;
    projects: Project[];
    onCreateProject: (name: string, icon?: string, visibility?: 'public' | 'private') => Promise<void>;
    onRenameProject: (project: Project, newName: string, newIcon?: string, newVisibility?: 'public' | 'private') => Promise<void>;
    onDeleteProject: (projectId: string) => Promise<void>;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
    selectedProjectId,
    onSelectProject,
    projects,
    onCreateProject,
    onRenameProject,
    onDeleteProject
}) => {
    // Create State
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectIcon, setNewProjectIcon] = useState('📁'); // Default Icon
    const [newProjectVisibility, setNewProjectVisibility] = useState<'public' | 'private'>('private');

    // Emoji Picker State
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
    const pickerRef = useRef<HTMLDivElement>(null);
    const [projectForSettingsId, setProjectForSettingsId] = useState<string | null>(null);

    // Close picker on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const openPicker = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPickerPosition({
            top: rect.bottom + 8,
            left: rect.left
        });
        setShowPicker(true);
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        await onCreateProject(newProjectName, newProjectIcon, newProjectVisibility);
        setNewProjectName('');
        setNewProjectIcon('📁');
        setNewProjectVisibility('private');
        setIsCreating(false);
    };


    const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n포함된 모든 할 일도 함께 삭제됩니다.')) return;
        await onDeleteProject(projectId);
    };

    return (
        <div className="w-[260px] bg-[#FBFBFB] h-full flex flex-col border-r border-gray-100 font-sans relative">
            {/* Emoji Picker Portal - Renders in Body */}
            {showPicker && typeof document !== 'undefined' && createPortal(
                <div
                    ref={pickerRef}
                    className="fixed z-[9999] shadow-2xl rounded-xl border border-gray-100 fade-in zoom-in-95 duration-200"
                    style={{
                        top: pickerPosition.top,
                        left: pickerPosition.left
                    }}
                >
                    <EmojiPicker
                        onEmojiClick={(emojiData) => {
                            setNewProjectIcon(emojiData.emoji);
                            setShowPicker(false);
                        }}
                        width={300}
                        height={400}
                    />
                </div>,
                document.body
            )}

            {/* Header Area */}
            <div className="px-4 pt-6 pb-2">

                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Projects</h2>
                    <button
                        onClick={() => {
                            setIsCreating(true);
                            setNewProjectIcon('📁');
                        }}
                        className="p-1 hover:bg-gray-200 text-gray-500 hover:text-gray-900 rounded transition-colors"
                        title="Add Project"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1">
                {/* Creation Input */}
                {isCreating && (
                    <form onSubmit={handleCreateProject} className="mb-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-500 shadow-sm rounded-lg">
                            <button
                                type="button"
                                onClick={(e) => openPicker(e)}
                                className="text-lg hover:bg-gray-50 rounded p-0.5 transition-colors"
                            >
                                {newProjectIcon}
                            </button>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Project Name"
                                className="w-full text-sm bg-transparent outline-none placeholder:text-gray-300"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                            />
                            <select
                                className="text-[10px] bg-gray-50 border-none outline-none rounded p-1 text-gray-500 font-medium cursor-pointer"
                                value={newProjectVisibility}
                                onChange={(e) => setNewProjectVisibility(e.target.value as 'public' | 'private')}
                            >
                                <option value="private">Private</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                    </form>
                )}

                {/* Project List */}
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => onSelectProject(project.id)}
                        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200
                            ${selectedProjectId === project.id
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5 font-medium'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`flex items-center justify-center w-5 h-5 transition-colors duration-200 ${selectedProjectId === project.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                                {project.icon && project.icon.startsWith('http') ? (
                                    <img src={project.icon} alt="" className="w-full h-full rounded-md object-cover shadow-sm border border-gray-100" />
                                ) : (
                                    project.icon || (selectedProjectId === project.id ? <FolderOpen size={18} className="text-blue-500" strokeWidth={2.5} /> : <Folder size={18} />)
                                )}
                            </span>
                            <span className="truncate tracking-tight">{project.name}</span>
                            {project.visibility === 'private' ? (
                                <Lock size={10} className="text-gray-400 shrink-0 ml-1" />
                            ) : (
                                <Globe size={10} className="text-blue-400 shrink-0 ml-1" />
                            )}
                        </div>

                        {/* Hover Actions */}
                        {project.currentUserRole === 'owner' && (
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setProjectForSettingsId(project.id); }}
                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md"
                                    title="Project Settings"
                                >
                                    <Settings size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {projectForSettingsId && projects.find(p => p.id === projectForSettingsId) && (
                    <ProjectSettingsModal
                        project={projects.find(p => p.id === projectForSettingsId)!}
                        onClose={() => setProjectForSettingsId(null)}
                        onUpdate={(updated) => {
                            onRenameProject(updated, updated.name, updated.icon, updated.visibility);
                            setProjectForSettingsId(null);
                        }}
                        onDelete={onDeleteProject}
                    />
                )}

                {/* Empty State */}
                {projects.length === 0 && !isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full mt-8 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-gray-600 transition-colors py-8"
                    >
                        <div className="p-3 bg-gray-100 rounded-full">
                            <Plus size={24} />
                        </div>
                        <span className="text-xs font-medium">Create your first project</span>
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
                <div className="text-[10px] text-gray-400 font-medium text-center">
                    Daily Utils Workspace
                </div>
            </div>
        </div>
    );
};

export default ProjectSidebar;
