"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Connection,
    Edge,
    Node,
    NodeChange,
    EdgeChange,
    useReactFlow,
    ReactFlowProvider,
    Panel,
    BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, RotateCcw } from 'lucide-react';

const initialNodes: Node[] = [
    {
        id: '1',
        data: { label: '중심 아이디어' },
        position: { x: 250, y: 250 },
        type: 'input',
    },
];

interface MindMapCanvasProps {
    initialData?: { nodes: Node[]; edges: Edge[] } | null;
    onChange?: (data: { nodes: Node[]; edges: Edge[] }) => void;
    readOnly?: boolean;
}

const MindMapContent: React.FC<MindMapCanvasProps> = ({ initialData, onChange, readOnly }) => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>([]);

    // Track if the initial data has been loaded to avoid overwriting user changes with stale props?
    // Actually, we trust initialData updates if they come from the parent (e.g. valid DB load).
    // But we must NOT trigger onChange if the update came from props.
    const isRemoteUpdate = useRef(false);

    // Load initial data if provided
    useEffect(() => {
        if (initialData && initialData.nodes && initialData.nodes.length > 0) {
            isRemoteUpdate.current = true;
            setNodes(initialData.nodes);
            setEdges(initialData.edges || []);
        }
    }, [initialData]);

    const notifyChange = (newNodes: Node[], newEdges: Edge[]) => {
        if (readOnly) return;
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        if (onChange) {
            onChange({ nodes: newNodes, edges: newEdges });
        }
    };

    // We use a separate effect to notify parent of changes, 
    // BUT we must filter out changes caused by 'setNodes' from the effect above.
    // The problem with standard 'useEffect([nodes, edges])' is it runs on ANY state change.
    // We use the useRef flag to skip the one caused by props.
    useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        if (nodes === initialNodes && edges.length === 0) return; // Don't notify generic init if unnecessary

        // Debounce not strictly needed if parent handles it, but good practice.
        // For now direct call.
        if (onChange) {
            onChange({ nodes, edges });
        }
    }, [nodes, edges, onChange]);


    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
        },
        []
    );

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
        },
        []
    );

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge(params, eds));
        },
        []
    );

    const addNode = () => {
        const id = `${new Date().getTime()}`;
        const newNode: Node = {
            id,
            position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
            data: { label: '새 아이디어' },
            type: 'default', // React Flow default node type
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const onReset = () => {
        setNodes(initialNodes);
        setEdges([]);
        // Force notify on reset
        if (onChange) onChange({ nodes: initialNodes, edges: [] });
    };

    return (
        <div className="w-full h-full min-h-[500px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={readOnly ? undefined : onNodesChange}
                onEdgesChange={readOnly ? undefined : onEdgesChange}
                onConnect={readOnly ? undefined : onConnect}
                fitView
                className="bg-slate-50"
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                elementsSelectable={!readOnly}
            >
                <Background color="#ccc" variant={BackgroundVariant.Dots} />
                <Controls />
                {!readOnly && (
                    <Panel position="top-right" className="flex gap-2 p-2">
                        <button
                            onClick={addNode}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all"
                        >
                            <Plus size={14} /> 노드 추가
                        </button>
                        <button
                            onClick={onReset}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-all"
                            title="초기화"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
};

export default function MindMapCanvas(props: MindMapCanvasProps) {
    return (
        <ReactFlowProvider>
            <MindMapContent {...props} />
        </ReactFlowProvider>
    );
}
