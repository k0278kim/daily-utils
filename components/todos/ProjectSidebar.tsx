import React, { useEffect, useState, useRef } from 'react';
import { Plus, Folder, FolderOpen, Pencil, Trash2, X, Check } from 'lucide-react';
import { createClient } from "@/utils/supabase/supabaseClient";
import { Project } from '@/model/Project';

interface ProjectSidebarProps {
    selectedProjectId: string | null;
    onSelectProject: (projectId: string | null) => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ selectedProjectId, onSelectProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    // Rename state
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editProjectName, setEditProjectName] = useState('');

    const supabase = createClient();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            setProjects(data || []);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        const { data, error } = await supabase
            .from('projects')
            .insert([{ name: newProjectName }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            alert('프로젝트 생성 실패');
        } else {
            const newProjects = [...projects, data];
            setProjects(newProjects);
            setNewProjectName('');
            setIsCreating(false);
            onSelectProject(data.id);
        }
    };

    const handleStartRename = (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProjectId(project.id);
        setEditProjectName(project.name);
    };

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editProjectName.trim() || !editingProjectId) return;

        const { error } = await supabase
            .from('projects')
            .update({ name: editProjectName })
            .eq('id', editingProjectId);

        if (error) {
            console.error('Error renaming project:', error);
            alert('프로젝트 수정 실패');
        } else {
            setProjects(projects.map(p =>
                p.id === editingProjectId ? { ...p, name: editProjectName } : p
            ));
            setEditingProjectId(null);
        }
    };

    const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n포함된 모든 할 일도 함께 삭제됩니다.')) return;

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            alert('프로젝트 삭제 실패');
        } else {
            setProjects(projects.filter(p => p.id !== projectId));
            if (selectedProjectId === projectId) {
                onSelectProject(null);
            }
        }
    };

    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-bold text-gray-700">Projects</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isCreating && (
                    <form onSubmit={handleCreateProject} className="mb-2 px-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="New Project Name"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 mb-1"
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
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedProjectId === project.id
                                ? 'bg-black text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {editingProjectId === project.id ? (
                            <form onSubmit={handleRenameSubmit} className="flex-1 flex gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                    autoFocus
                                    type="text"
                                    className="flex-1 text-sm border border-gray-300 rounded px-1 text-black bg-white"
                                    value={editProjectName}
                                    onChange={(e) => setEditProjectName(e.target.value)}
                                // Remove onBlur/KeyDown specifics to avoid complexity, rely on buttons
                                />
                                <button type="submit" className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                                <button type="button" onClick={() => setEditingProjectId(null)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                            </form>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {selectedProjectId === project.id ? <FolderOpen size={16} /> : <Folder size={16} />}
                                    <span className="truncate">{project.name}</span>
                                </div>
                                <div className={`flex gap-1 ${selectedProjectId === project.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                    <button
                                        onClick={(e) => handleStartRename(project, e)}
                                        className={`p-1 rounded hover:bg-white/20 ${selectedProjectId === project.id ? 'text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteProject(project.id, e)}
                                        className={`p-1 rounded hover:bg-white/20 ${selectedProjectId === project.id ? 'text-white' : 'text-red-400 hover:text-red-600 hover:bg-gray-200'}`}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {projects.length === 0 && !isCreating && (
                    <div className="text-xs text-gray-400 text-center py-4">
                        No projects yet. <br /> Click + to create one.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectSidebar;
