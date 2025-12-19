"use client";

import { useState, useEffect } from "react";
import Board from "@/components/todos/Board";
import ProjectSidebar from "@/components/todos/ProjectSidebar";
import { Folder } from "lucide-react";
import { createClient } from "@/utils/supabase/supabaseClient"; // Assuming path
import { Project } from "@/model/Project"; // Assuming path

export default function TodosPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
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

    const handleCreateProject = async (name: string, icon?: string) => {
        const { data, error } = await supabase
            .from('projects')
            .insert([{ name, icon }])
            .select()
            .single();

        if (error) {
            alert('프로젝트 생성 실패');
        } else if (data) {
            setProjects([...projects, data]);
            setSelectedProjectId(data.id);
        }
    };

    const handleRenameProject = async (project: Project, newName: string, newIcon?: string) => {
        const { error } = await supabase
            .from('projects')
            .update({ name: newName, icon: newIcon })
            .eq('id', project.id);

        if (!error) {
            setProjects(projects.map(p =>
                p.id === project.id ? { ...p, name: newName, icon: newIcon } : p
            ));
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (!error) {
            setProjects(projects.filter(p => p.id !== projectId));
            if (selectedProjectId === projectId) {
                setSelectedProjectId(null);
            }
        }
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-white">
            <ProjectSidebar
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                projects={projects}
                onCreateProject={handleCreateProject}
                onRenameProject={handleRenameProject}
                onDeleteProject={handleDeleteProject}
            />
            <div className="flex-1 h-full overflow-hidden bg-white relative">
                {selectedProjectId ? (
                    <Board projectId={selectedProjectId} />
                ) : (
                    <div className="h-full overflow-y-auto p-8">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">프로젝트 선택</h2>
                            {projects.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <p className="text-gray-500">생성된 프로젝트가 없습니다.</p>
                                    <p className="text-gray-400 text-sm mt-1">사이드바에서 새 프로젝트를 만들어보세요.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {projects.map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => setSelectedProjectId(project.id)}
                                            className="group flex flex-col p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-500/30 hover:ring-1 hover:ring-blue-500/30 transition-all duration-200 text-left"
                                        >
                                            <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-200">
                                                <Folder size={20} />
                                            </div>
                                            <h3 className="font-semibold text-gray-900 mb-1 truncate w-full">{project.name}</h3>
                                            <p className="text-xs text-gray-400">클릭하여 할 일 보기</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}