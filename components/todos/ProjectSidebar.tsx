"use client";

import React, { useState, useRef } from 'react';
import { Plus, Folder, FolderOpen, Pencil, Trash2, X, Check, MoreHorizontal } from 'lucide-react';
import { Project } from '@/model/Project';

interface ProjectSidebarProps {
    selectedProjectId: string | null;
    onSelectProject: (projectId: string | null) => void;
    projects: Project[];
    onCreateProject: (name: string) => Promise<void>;
    onRenameProject: (project: Project, newName: string) => Promise<void>;
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
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    // Rename state
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editProjectName, setEditProjectName] = useState('');

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        await onCreateProject(newProjectName);
        setNewProjectName('');
        setIsCreating(false);
        // Selection is handled by parent if needed, or we can't select effectively because we don't have the new ID immediately here unless we wait or parent selects.
        // Actually, parent should handle selection after create if desired.
    };

    const handleStartRename = (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProjectId(project.id);
        setEditProjectName(project.name);
    };

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editProjectName.trim() || !editingProjectId) return;

        const project = projects.find(p => p.id === editingProjectId);
        if (project) {
            await onRenameProject(project, editProjectName);
        }
        setEditingProjectId(null);
    };

    const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n포함된 모든 할 일도 함께 삭제됩니다.')) return;
        await onDeleteProject(projectId);
    };

    return (
        <div className="w-[260px] bg-white h-full flex flex-col pt-6 pb-4 px-3 border-r border-gray-100">
            <div className="px-2 mb-2 flex justify-between items-center group">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">프로젝트</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="새 프로젝트 생성"
                >
                    <Plus size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-hide">
                {isCreating && (
                    <form onSubmit={handleCreateProject} className="mb-2 px-1">
                        <input
                            autoFocus
                            type="text"
                            placeholder="새 프로젝트 이름"
                            className="w-full text-sm font-medium bg-gray-50 border-none rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-black/5 placeholder:text-gray-400"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onBlur={() => {
                                if (!newProjectName) setIsCreating(false);
                            }}
                        />
                    </form>
                )}

                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => !editingProjectId && onSelectProject(project.id)}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-all duration-200
                            ${selectedProjectId === project.id
                                ? 'bg-gray-100/80 text-gray-900 font-semibold shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        {editingProjectId === project.id ? (
                            <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                                <input
                                    autoFocus
                                    type="text"
                                    className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-gray-400"
                                    value={editProjectName}
                                    onChange={(e) => setEditProjectName(e.target.value)}
                                />
                                <button type="submit" className="p-1 hover:bg-green-50 text-green-600 rounded"><Check size={14} /></button>
                                <button type="button" onClick={() => setEditingProjectId(null)} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={14} /></button>
                            </form>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className={`transition-colors ${selectedProjectId === project.id ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                        {selectedProjectId === project.id ? <FolderOpen size={16} strokeWidth={2.5} /> : <Folder size={16} />}
                                    </span>
                                    <span className="truncate">{project.name}</span>
                                </div>
                                <div className="flex items-center absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent">
                                    <button
                                        onClick={(e) => handleStartRename(project, e)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-md transition-colors"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteProject(project.id, e)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {projects.length === 0 && !isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full mt-4 py-8 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-200 hover:bg-gray-50/50 transition-all gap-2 group"
                    >
                        <div className="p-2 bg-gray-50 rounded-full group-hover:bg-white transition-colors">
                            <Plus size={20} />
                        </div>
                        <span className="text-xs font-medium">첫 프로젝트 만들기</span>
                    </button>
                )}
            </div>

            <div className="mt-auto px-2 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-gray-400">
                    <span>© Daily Utils</span>
                </div>
            </div>
        </div>
    );
};

export default ProjectSidebar;
