"use client";

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Todo } from '@/model/Todo';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface TaskCardProps {
    todo: Todo;
    index: number;
    onClick?: () => void;
    onToggleStatus?: (todo: Todo) => void;
    currentUserId?: string;
    onDeleteTodo?: (id: string) => void;
}

const UserAvatar = ({ assignee, index, total }: { assignee: any, index: number, total: number }) => {
    const [imageError, setImageError] = React.useState(false);
    const [showTooltip, setShowTooltip] = React.useState(false);
    const [coords, setCoords] = React.useState({ top: 0, left: 0 });
    const avatarRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setImageError(false);
    }, [assignee.avatar_url]);

    const handleMouseEnter = () => {
        if (avatarRef.current) {
            const rect = avatarRef.current.getBoundingClientRect();
            // Position above the avatar, centered
            setCoords({
                top: rect.top - 8, // 8px spacer
                left: rect.left + (rect.width / 2)
            });
            setShowTooltip(true);
        }
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
    };

    const Tooltip = () => {
        if (!showTooltip) return null;

        // Ensure we're in the browser
        if (typeof window === 'undefined') return null;

        return createPortal(
            <div
                className="fixed z-[9999] pointer-events-none fade-in zoom-in-95 duration-200"
                style={{
                    top: coords.top,
                    left: coords.left,
                    transform: 'translate(-50%, -100%)' // Center horizontally, Move above
                }}
            >
                <div className="bg-gray-900 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl whitespace-nowrap min-w-[max-content] flex flex-col items-center">
                    <div className="font-semibold">{assignee.nickname || 'Unknown'}({assignee.name || "Unknown"})</div>
                    {assignee.email && <div className="text-[10px] text-gray-400">{assignee.email}</div>}

                    {/* Arrow (Visual only) */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-gray-900"></div>
                </div>
            </div>,
            document.body
        );
    };

    const content = assignee.avatar_url && !imageError ? (
        <div className="w-full h-full rounded-full overflow-hidden">
            <img
                src={assignee.avatar_url}
                alt={assignee.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
            />
        </div>
    ) : (
        <React.Fragment>
            {assignee.name ? assignee.name.charAt(0).toUpperCase() : '?'}
        </React.Fragment>
    );

    const baseClasses = "relative w-6 h-6 rounded-full border border-white ring-1 ring-gray-100 flex items-center justify-center cursor-help transition-transform hover:scale-110 hover:z-50";
    const bgClass = assignee.avatar_url && !imageError ? "bg-gray-200" : "bg-indigo-100 text-indigo-700 text-[10px] font-bold";

    return (
        <>
            <div
                ref={avatarRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`${baseClasses} ${bgClass}`}
                style={{ zIndex: showTooltip ? 9999 : (total - index) }}
            >
                {content}
            </div>
            <Tooltip />
        </>
    );
};

const TaskCard: React.FC<TaskCardProps> = ({ todo, index, onClick, onToggleStatus, currentUserId, onDeleteTodo }) => {
    const router = useRouter();

    const canComplete = React.useMemo(() => {
        if (!currentUserId) return false;
        if (!todo.assignees || todo.assignees.length === 0) return false; // Strict: Must be assigned
        return todo.assignees.some(a => a.id === currentUserId);
    }, [todo.assignees, currentUserId, todo.status]);

    const isAssignedToMe = React.useMemo(() => {
        if (!currentUserId) return false;
        if (!todo.assignees || todo.assignees.length === 0) return false;
        return todo.assignees.some(a => a.id === currentUserId);
    }, [todo.assignees, currentUserId]);

    // Tooltip State for Completion Check
    const [showCompletionTooltip, setShowCompletionTooltip] = React.useState(false);
    const [completionTooltipCoords, setCompletionTooltipCoords] = React.useState({ top: 0, left: 0 });

    // Expand State for Description
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const [shouldAnimate, setShouldAnimate] = React.useState(false);
    const textRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        if (textRef.current) {
            // Check if content exceeds 4.5rem (approx 72px)
            setIsOverflowing(textRef.current.scrollHeight > 72);
        }

        // Enable animation after initial render
        const timer = setTimeout(() => {
            setShouldAnimate(true);
        }, 300);
        return () => clearTimeout(timer);
    }, [todo.description]);
    // ... (skipping context)

    // Debug logging
    console.log(`TaskCard Render: ${todo.id}`, {
        hasOnDelete: !!onDeleteTodo,
        currentUserId,
        assignees: todo.assignees?.length
    });

    return (
        <Draggable draggableId={todo.id} index={index}>
            {(provided, snapshot) => {
                const style = provided.draggableProps.style;
                let transform = style?.transform;

                // "Heavy" drag effect:
                // Only apply if NOT assigned to me AND it's NOT in the backlog.
                // (Backlog items should be easy to drag to "My Tasks" to claim them)
                if (snapshot.isDragging && !isAssignedToMe && todo.status !== 'backlog' && transform) {
                    // Apply "Heavy" resistance: Dampen movement by 90%
                    // We assume transform is something like "translate(100px, 200px)"
                    transform = transform.replace(
                        /(-?\d+(\.\d+)?)px/g,
                        (match, p1) => `${parseFloat(p1) * 0.15}px` // 0.1 -> 15% movement (Very heavy)
                    );
                }

                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="mb-3 relative"
                        style={{
                            ...style,
                            transform, // Overwrite with dampened transform
                            zIndex: snapshot.isDragging ? 9999 : (1000 - index)
                        }}
                    >
                        <motion.div
                            // layoutId={snapshot.isDragging ? undefined : todo.id}
                            // layout={!snapshot.isDragging}
                            // layoutId={snapshot.isDragging ? undefined : todo.id}
                            // layout={!snapshot.isDragging}
                            onClick={() => {
                                // Navigate to Detail Page
                                router.push(`/todos/${todo.id}`);
                            }}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`
                            group relative rounded-xl border border-gray-100 p-4 
                            transition-colors duration-200 ease-in-out
                            hover:shadow-md hover:border-gray-100
                            ${snapshot.isDragging ? 'rotate-2 scale-[1.02] shadow-xl ring-1 ring-black/5 !border-transparent' : ''}
                            ${todo.status === 'done' ? 'opacity-75 bg-gray-50/50 bg-gradient-to-r from-blue-50 to-gray-100' : 'bg-white'}
                            ${isOverflowing ? 'cursor-pointer' : 'cursor-default'}
                        `}
                        >
                            <div className="flex items-center justify-between gap-3">
                                {onToggleStatus && todo.status !== 'backlog' && (
                                    <div
                                        className="relative group/check"
                                        onMouseEnter={(e) => {
                                            if (!canComplete) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setCompletionTooltipCoords({
                                                    top: rect.top - 8,
                                                    left: rect.left + (rect.width / 2)
                                                });
                                                setShowCompletionTooltip(true);
                                            }
                                        }}
                                        onMouseLeave={() => setShowCompletionTooltip(false)}
                                        onClick={(e) => e.stopPropagation()} // Prevent card expansion when hovering/clicking check
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (canComplete) {
                                                    onToggleStatus(todo);
                                                }
                                            }}
                                            disabled={!canComplete}
                                            className={`
                                            mt-0.5 flex-shrink-0 transition-colors duration-200
                                            ${todo.status === 'done' ? 'text-blue-500' : canComplete ? 'text-gray-300 hover:text-blue-500' : 'text-gray-100 cursor-not-allowed'}
                                        `}
                                        >
                                            {todo.status === 'done' ? (
                                                <CheckCircle2 size={20} className="" />
                                            ) : (
                                                <Circle size={20} />
                                            )}
                                        </button>

                                        {/* Portal Tooltip for Completion Restriction */}
                                        {showCompletionTooltip && !canComplete && typeof window !== 'undefined' && createPortal(
                                            <div
                                                className="fixed z-[9999] pointer-events-none fade-in zoom-in-95 duration-200"
                                                style={{
                                                    top: completionTooltipCoords.top,
                                                    left: completionTooltipCoords.left,
                                                    transform: 'translate(-50%, -100%)'
                                                }}
                                            >
                                                <div className="bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap">
                                                    담당자만 완료 가능
                                                    {/* Arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            </div>,
                                            document.body
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <h3 className={`
                                    truncate text-sm font-semibold leading-tight 
                                    ${todo.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}
                                `}>
                                        {todo.title}
                                    </h3>


                                    {todo.description != "" && (
                                        <motion.div
                                            initial={false}
                                            animate={{ height: isExpanded || !isOverflowing ? 'auto' : '4.5rem' }}
                                            transition={{ duration: shouldAnimate ? 0.3 : 0, ease: 'easeInOut' }}
                                            className={`mt-1 mb-3 text-xs text-gray-500 prose prose-xs prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-headings:my-0 relative overflow-hidden ${todo.status === 'done' ? 'text-gray-300' : ''}`}
                                        >
                                            <div ref={textRef}>
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {todo.description}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Blur Gradient Overlay */}
                                            {
                                                isOverflowing && (
                                                    <motion.div
                                                        initial={{ opacity: 1 }}
                                                        animate={{ opacity: isExpanded ? 0 : 1 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={`absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t ${todo.status === 'done' ? 'from-gray-100' : 'from-white'} to-transparent`}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                )
                                            }
                                        </motion.div >
                                    )}

                                    <div className="flex flex-wrap items-center gap-2">
                                        {todo.categories && (
                                            <span
                                                className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border"
                                                style={{
                                                    backgroundColor: todo.categories.color ? `${todo.categories.color}15` : '#f3f4f6',
                                                    color: todo.categories.color || '#4b5563',
                                                    borderColor: todo.categories.color ? `${todo.categories.color}30` : '#e5e7eb'
                                                }}
                                            >
                                                {todo.categories.name}
                                            </span>
                                        )}

                                        {todo.status === 'done' && todo.completed_at ? (
                                            <span className="inline-flex items-center text-[10px] font-medium text-gray-400">
                                                완료: {new Date(todo.completed_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })} {new Date(todo.completed_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        ) : (
                                            todo.due_date && (
                                                <span className={`
                                                inline-flex items-center text-[10px] font-medium
                                                ${new Date(todo.due_date) < new Date() && todo.status !== 'done' ? 'text-red-500' : 'text-gray-400'}
                                            `}>
                                                    {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div >

                                {/* Delete/Edit Actions: Always visible, top right */}
                                < div className="flex items-center gap-1 absolute top-2 right-2" >
                                    {onDeleteTodo && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const hasAssignees = todo.assignees && todo.assignees.length > 0;
                                                const isAssignedToMe = hasAssignees && currentUserId && todo.assignees.some(a => a.id === currentUserId);

                                                console.log('Delete Check:', { id: todo.id, hasAssignees, isAssignedToMe, currentUserId });

                                                if (!hasAssignees || isAssignedToMe) {
                                                    onDeleteTodo(todo.id);
                                                } else {
                                                    alert('담당자가 지정된 할 일은 담당자만 삭제할 수 있습니다.');
                                                }
                                            }}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    {
                                        onClick && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Navigate to Detail Page (Document)
                                                    router.push(`/todos/${todo.id}`);
                                                }}
                                                className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                title="Open Document"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                                </svg>
                                            </button>
                                        )
                                    }
                                </div >
                            </div >

                            {
                                (todo.assignees && todo.assignees.length > 0) && <div className="mt-3 flex items-end justify-between border-t border-gray-100 pt-3">
                                    <div className="flex -space-x-2 py-1 pl-1 isolate">
                                        {todo.assignees && todo.assignees.map((assignee, i) => (
                                            <UserAvatar
                                                key={assignee.id || i}
                                                assignee={assignee}
                                                index={i}
                                                total={todo.assignees?.length || 0}
                                            />
                                        ))}
                                    </div>
                                </div>
                            }
                        </motion.div >
                    </div >
                );
            }}
        </Draggable >
    );
};

export default TaskCard;
