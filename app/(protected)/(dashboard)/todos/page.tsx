"use client";

import Board from "@/components/todos/Board";
import ProjectSidebar from "@/components/todos/ProjectSidebar";
import { useState } from "react";

export default function TodosPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    return (
        <div className="flex h-full w-full overflow-hidden bg-white">
            <ProjectSidebar
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
            />
            <div className="flex-1 h-full overflow-hidden">
                {selectedProjectId ? (
                    <Board projectId={selectedProjectId} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Select a project to view tasks
                    </div>
                )}
            </div>
        </div>
    );
}