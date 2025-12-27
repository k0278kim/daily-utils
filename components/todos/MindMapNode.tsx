import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus } from 'lucide-react';

// Define the data type for our custom node's DATA field
export type MindMapNodeData = {
    label: string;
    onAddNode?: (id: string, direction: 'top' | 'bottom' | 'left' | 'right') => void;
};

// Define props for our custom node component
const MindMapNode = ({ id, data, selected }: NodeProps<MindMapNodeData>) => {

    const onAdd = (direction: 'top' | 'bottom' | 'left' | 'right') => {
        if (data.onAddNode) {
            data.onAddNode(id, direction);
        }
    };

    return (
        <div className={`
            px-4 py-2 shadow-md rounded-md bg-white border-2 
            ${selected ? 'border-blue-500' : 'border-stone-400'}
            min-w-[100px] text-center transition-colors relative
        `}>
            {/* Directional Add Buttons - Visible only when selected (or hovered?) - Let's do selected for mobile friendliness */}
            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 transition-opacity ${selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={() => onAdd('top')} className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm" title="Add Top">
                    <Plus size={12} />
                </button>
            </div>
            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 transition-opacity ${selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={() => onAdd('bottom')} className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm" title="Add Bottom">
                    <Plus size={12} />
                </button>
            </div>
            <div className={`absolute -left-8 top-1/2 -translate-y-1/2 transition-opacity ${selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={() => onAdd('left')} className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm" title="Add Left">
                    <Plus size={12} />
                </button>
            </div>
            <div className={`absolute -right-8 top-1/2 -translate-y-1/2 transition-opacity ${selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <button onClick={() => onAdd('right')} className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm" title="Add Right">
                    <Plus size={12} />
                </button>
            </div>


            {/* Handles for connections */}
            <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400" />
            <Handle type="source" position={Position.Top} className="w-2 h-2 !bg-slate-400" />

            <Handle type="target" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />
            <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400" />

            <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400" />
            <Handle type="source" position={Position.Left} className="w-2 h-2 !bg-slate-400" />

            <Handle type="target" position={Position.Right} className="w-2 h-2 !bg-slate-400" />
            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-400" />


            {/* Content */}
            <div className="text-sm font-medium text-slate-900">
                {data.label}
            </div>
        </div>
    );
};

export default memo(MindMapNode);
