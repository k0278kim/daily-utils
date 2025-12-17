import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Todo } from '@/model/Todo';
import { CheckCircle2, Circle } from 'lucide-react';

interface TaskCardProps {
    todo: Todo;
    index: number;
    onClick?: () => void;
    onToggleStatus?: (todo: Todo) => void;
}

const UserAvatar = ({ assignee, index, total }: { assignee: any, index: number, total: number }) => {
    const [imageError, setImageError] = React.useState(false);

    // reset error if url changes (though key usually handles this)
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

const TaskCard: React.FC<TaskCardProps> = ({ todo, index, onClick, onToggleStatus }) => {
    return (
        <Draggable draggableId={todo.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 transition-shadow group relative ${snapshot.isDragging ? 'shadow-lg ring-2 ring-black ring-opacity-10' : 'hover:shadow-md'
                        } ${todo.status === 'done' ? 'opacity-60 bg-gray-50' : ''}`}
                    style={{ ...provided.draggableProps.style }}
                >
                    <div className="flex justify-between items-start gap-2">
                        {onToggleStatus && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleStatus(todo);
                                }}
                                className={`mt-0.5 text-gray-400 hover:text-green-600 transition-colors ${todo.status === 'done' ? 'text-green-600' : ''}`}
                            >
                                {todo.status === 'done' ? (
                                    <CheckCircle2 size={18} />
                                ) : (
                                    <Circle size={18} />
                                )}
                            </button>
                        )}
                        <h3 className={`text-sm font-semibold text-gray-800 flex-1 ${todo.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                            {todo.title}
                        </h3>
                        {onClick && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                                className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                    <path d="m15 5 4 4" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 mb-2">
                        {todo.categories && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                {todo.categories.name}
                            </span>
                        )}
                    </div>
                    {todo.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {todo.description}
                        </p>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400">
                        {todo.created_at && (
                            <div>
                                Created: {new Date(todo.created_at).toLocaleDateString()}
                            </div>
                        )}
                        {todo.due_date && (
                            <div className="text-red-400 font-medium">
                                Due: {new Date(todo.due_date).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${todo.status === 'done' ? 'bg-green-100 text-green-700' :
                            todo.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {todo.status === 'backlog' ? 'Backlog' :
                                todo.status === 'in-progress' ? 'In Progress' : 'Done'}
                        </span>
                        <div className="flex -space-x-1 ml-2">
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
                </div>
            )}
        </Draggable>
    );
};

export default TaskCard;
