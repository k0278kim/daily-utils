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

import MindMapNode from './MindMapNode';

const nodeTypes = {
    mindMap: MindMapNode,
};

const initialNodes: Node[] = [
    {
        id: '1',
        data: { label: '중심 아이디어' },
        position: { x: 250, y: 250 },
        type: 'mindMap', // Use custom type
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

    // ... existing setup ...
    const isRemoteUpdate = useRef(false);

    // Initial Data Sync - Important: Remap type to 'mindMap' if needed, or ensure DB saves it correctly
    useEffect(() => {
        if (initialData && initialData.nodes && initialData.nodes.length > 0) {
            isRemoteUpdate.current = true;
            // Ensure all nodes use the custom type for consistent UI
            const processedNodes = initialData.nodes.map(n => ({
                ...n,
                type: 'mindMap',
                data: { ...n.data, onAddNode: readOnly ? undefined : handleAddNodeDirectional } // Inject callback
            }));
            setNodes(processedNodes);
            setEdges(initialData.edges || []);
        } else if (!initialData || !initialData.nodes || initialData.nodes.length === 0) {
            // Even for default init, inject callbacks
            setNodes(nds => nds.map(n => ({
                ...n,
                data: { ...n.data, onAddNode: readOnly ? undefined : handleAddNodeDirectional }
            })));
        }
    }, [initialData, readOnly]); // Dependencies need to include handleAddNodeDirectional if not stable? It is defined below.

    // ... notifyChange ... 
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

    // Effect to notify parent - kept same
    useEffect(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        if (nodes === initialNodes && edges.length === 0) return;

        if (onChange) {
            onChange({ nodes, edges });
        }
    }, [nodes, edges, onChange]);

    // ... React Flow hooks ...
    const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);

    // Directional Add Logic
    const handleAddNodeDirectional = useCallback((sourceId: string, direction: 'top' | 'bottom' | 'left' | 'right') => {
        setNodes((currentNodes) => {
            const sourceNode = currentNodes.find(n => n.id === sourceId);
            if (!sourceNode) return currentNodes;

            const offset = 200;
            let newPos = { ...sourceNode.position };

            // Very simple layout logic: just place at fixed offset
            switch (direction) {
                case 'top': newPos.y -= offset; break;
                case 'bottom': newPos.y += offset; break;
                case 'left': newPos.x -= offset; break;
                case 'right': newPos.x += offset; break;
            }

            const newId = `${new Date().getTime()}`;
            const newNode: Node = {
                id: newId,
                position: newPos,
                data: { label: '새 아이디어', onAddNode: handleAddNodeDirectional }, // Pass recursive callback
                type: 'mindMap',
            };

            // Add Edge
            const newEdge: Edge = {
                id: `e${sourceId}-${newId}`,
                source: sourceId,
                target: newId,
                sourceHandle: direction, // Using direction as handle ID if we set specific handle IDs
                targetHandle: direction === 'top' ? 'bottom' : direction === 'bottom' ? 'top' : direction === 'left' ? 'right' : 'left', // Connect to opposite side
            };

            // It's cleaner to handle Edge update outside setState of nodes for batching, 
            // but we can't easily. So we'll use a functional state update for edges separately?
            // Or just do a separate setEdges call.
            // React batching handles this well.
            setTimeout(() => {
                setEdges((eds) => eds.concat(newEdge));
            }, 0);

            return currentNodes.concat(newNode);
        });
    }, []);

    // Also update existing generic addNode to use custom type
    const addNode = () => {
        const id = `${new Date().getTime()}`;
        const newNode: Node = {
            id,
            position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
            data: { label: '새 아이디어', onAddNode: handleAddNodeDirectional },
            type: 'mindMap',
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const onReset = () => {
        // Reset with callback injection
        const resetNodes = initialNodes.map(n => ({ ...n, data: { ...n.data, onAddNode: handleAddNodeDirectional } }));
        setNodes(resetNodes);
        setEdges([]);
        if (onChange) onChange({ nodes: resetNodes, edges: [] });
    };

    return (
        <div className="w-full h-full min-h-[500px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={readOnly ? undefined : onNodesChange}
                onEdgesChange={readOnly ? undefined : onEdgesChange}
                onConnect={readOnly ? undefined : onConnect}
                nodeTypes={nodeTypes} // Register custom types
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
