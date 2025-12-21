"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Board from "@/components/todos/Board";
import ProjectSidebar from "@/components/todos/ProjectSidebar";
import { Folder } from "lucide-react";
import { createClient } from "@/utils/supabase/supabaseClient";
import { Project } from "@/model/Project";

function TodosContent() {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const supabase = createClient();
    const searchParams = useSearchParams();

    useEffect(() => {
        fetchProjects();
        const projectId = searchParams.get("projectId");
        if (projectId) {
            setSelectedProjectId(projectId);
        }

        // Real-time subscriptions
        const projectsChannel = supabase
            .channel('projects-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
                fetchProjects();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, () => {
                fetchProjects();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(projectsChannel);
        };
    }, [searchParams]);

    const fetchProjects = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('projects')
            .select('*, project_members(user_id, role)')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching projects:', error);
        } else {
            const projectsWithRole = (data || []).map((p: any) => ({
                ...p,
                currentUserRole: p.project_members?.find((m: any) => m.user_id === user.id)?.role
            }));
            setProjects(projectsWithRole);

            // Real-time deletion handling: if selected project is gone, deselect it
            if (selectedProjectId && !projectsWithRole.some(p => p.id === selectedProjectId)) {
                setSelectedProjectId(null);
            }
        }
    };

    const handleCreateProject = async (name: string, icon?: string, visibility: 'public' | 'private' = 'private') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('projects')
            .insert([{ name, icon, visibility, user_id: user.id }])
            .select()
            .single();

        if (error) {
            alert('프로젝트 생성 실패');
        } else if (data) {
            const newProject = { ...data, currentUserRole: 'owner' as const };
            setProjects([...projects, newProject]);
            setSelectedProjectId(data.id);
        }
    };

    const handleRenameProject = async (project: Project, newName: string, newIcon?: string, newVisibility?: 'public' | 'private') => {
        const updateData: any = { name: newName, icon: newIcon };
        if (newVisibility) updateData.visibility = newVisibility;

        const { error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', project.id);

        if (!error) {
            setProjects(projects.map(p =>
                p.id === project.id ? { ...p, name: newName, icon: newIcon, visibility: newVisibility || p.visibility } : p
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
                    <Board
                        projectId={selectedProjectId}
                        currentUserRole={projects.find(p => p.id === selectedProjectId)?.currentUserRole}
                    />
                ) : (
                    <div className="h-full overflow-y-auto px-6 py-12 md:px-12 md:py-20 bg-slate-50/30">
                        <div className="max-w-5xl mx-auto space-y-12">
                            <div className="space-y-2">
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">프로젝트 선택</h2>
                                <p className="text-gray-500 text-sm md:text-base font-medium">관리할 프로젝트를 선택하여 할 일을 확인하세요.</p>
                            </div>

                            {projects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 px-8 bg-white/50 backdrop-blur-sm rounded-[32px] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="w-20 h-20 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-500 mb-8 ring-8 ring-blue-50/50">
                                        <Folder size={32} />
                                    </div>
                                    <div className="text-center space-y-2 max-w-sm">
                                        <h3 className="text-xl font-bold text-gray-900">참여 중인 프로젝트가 없습니다</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed">
                                            아직 생성하거나 초대받은 프로젝트가 없네요.<br />
                                            사이드바 상단의 '+' 버튼을 눌러 첫 프로젝트를 만들어보세요!
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {projects.map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => setSelectedProjectId(project.id)}
                                            className="group relative flex flex-col p-8 bg-white border border-gray-100 rounded-[32px] hover:border-blue-500/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 text-left"
                                        >
                                            <div className="h-14 w-14 bg-gray-50 rounded-[22px] flex items-center justify-center text-gray-400 mb-8 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-500 text-2xl ring-4 ring-transparent group-hover:ring-blue-50/50">
                                                {project.icon || <Folder size={24} />}
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 truncate w-full">{project.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${project.visibility === 'public' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                                                    <p className="text-xs text-gray-400 font-medium">{project.visibility === 'public' ? '공개 워크스페이스' : '프라이빗'}</p>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500 text-blue-500">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    <polyline points="12 5 19 12 12 19"></polyline>
                                                </svg>
                                            </div>
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

export default function TodosPage() {
    return (
        <Suspense fallback={<div className="w-full h-full bg-white flex items-center justify-center">Loading...</div>}>
            <TodosContent />
        </Suspense>
    );
}