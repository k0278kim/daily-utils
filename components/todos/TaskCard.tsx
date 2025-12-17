import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Todo } from '@/model/Todo';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

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

    React.useEffect(() => {
        setImageError(false);
    }, [assignee.avatar_url]);

    if (assignee.avatar_url && !imageError) {
        return (
            <div
                className="w-6 h-6 rounded-full overflow-hidden border border-white ring-1 ring-gray-100 relative bg-gray-200"
                title={assignee.name}
                style={{ zIndex: total - index }}
            >
                <img
                    src={assignee.avatar_url}
                    alt={assignee.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            </div>
        );
    }

    return (
        <div
            className="w-6 h-6 rounded-full overflow-hidden border border-white ring-1 ring-gray-100 relative flex items-center justify-center bg-indigo-100 text-indigo-700 text-[10px] font-bold"
            title={assignee.name}
            style={{ zIndex: total - index }}
        >
            {assignee.name ? assignee.name.charAt(0).toUpperCase() : '?'}
        </div>
    );
};

const TaskCard: React.FC<TaskCardProps> = ({ todo, index, onClick, onToggleStatus, currentUserId, onDeleteTodo }) => {

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
                            layoutId={snapshot.isDragging ? undefined : todo.id}
                            layout={!snapshot.isDragging}
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
                        `}
                        >
                            <div className="flex items-center justify-between gap-3">
                                {onToggleStatus && (
                                    <div className="relative group/check">
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
                                        {!canComplete && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover/check:block whitespace-nowrap bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg z-50">
                                                담당자만 완료 가능
                                            </div>
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
                                        <p className={`mt-1 mb-3 line-clamp-2 text-xs text-gray-500 ${todo.status === 'done' ? 'text-gray-300' : ''}`}>
                                            {todo.description}
                                        </p>
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
                                </div>

                                {/* Delete/Edit Actions: Always visible, top right */}
                                <div className="flex items-center gap-1 absolute top-2 right-2">
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
                                    {onClick && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClick();
                                            }}
                                            className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9" />
                                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {
                                (todo.assignees && todo.assignees.length > 0) && <div className="mt-3 flex items-end justify-between border-t border-gray-100 pt-3">
                                    <div className="flex -space-x-2 overflow-hidden py-1 pl-1">
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
                        </motion.div>
                    </div>
                );
            }}
        </Draggable>
    );
};

export default TaskCard;
