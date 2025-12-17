import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import Column from './Column';
import { Todo } from '@/model/Todo';
import { createClient } from "@/utils/supabase/supabaseClient";
import EditTodoModal from './EditTodoModal';

// Define Columns type for better type safety
type Columns = {
    [key: string]: Todo[];
};

const Board: React.FC<{ projectId: string }> = ({ projectId }) => {
    const [columns, setColumns] = useState<Columns>({
        backlog: [],
        'my-tasks': [],
        done: []
    });
    const supabase = createClient();

    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (projectId) {
            fetchTodos();

            const channel = supabase
                .channel('realtime todos')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'todos',
                        // Filter removed to ensure UPDATE events are received even if project_id is not in user payload (Replica Identity issue)
                    },
                    (payload) => {
                        console.log('Realtime change (todos):', payload);
                        handleRealtimeChange(payload);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'todo_assignees',
                    },
                    (payload) => {
                        // console.log('Realtime change (assignees):', payload);
                        handleAssigneeChange(payload);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [projectId]); // Add projectId to dependency array

    const fetchTodoById = async (id: string) => {
        const { data, error } = await supabase
            .from('todos')
            .select(`
                *,
                todo_assignees (
                    user_id,
                    profiles:user_id (*)
                ),
                categories (
                    id,
                    name,
                    color
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching single todo:', error);
            return null;
        }

        const t = data;

        // Debug logging
        // console.log('Fetched todo raw:', t);

        const formattedTodo: Todo = {
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            created_at: t.created_at,
            completed_at: t.completed_at,
            due_date: t.due_date,
            project_id: t.project_id,
            category_id: t.category_id,
            categories: t.categories,
            assignees: t.todo_assignees.map((ta: any) => {
                if (ta.profiles) return ta.profiles;
                // Fallback: if profile is null but user_id exists, return a placeholder
                // This ensures we don't lose the "assigned" status just because profile load failed.
                if (ta.user_id) {
                    return {
                        id: ta.user_id,
                        name: 'Unknown User',
                        avatar_url: '',
                        email: '',
                        nickname: '',
                        team_id: ''
                    };
                }
                return null;
            }).filter(Boolean)
        };
        return formattedTodo;
    };

    const upsertTodoInState = (todo: Todo | null, user: any) => {
        if (!todo || !user) return;

        setColumns(prev => {
            const newColumns = { ...prev };

            // Remove from old location (if exists)
            let found = false;
            for (const colKey in newColumns) {
                const idx = newColumns[colKey].findIndex(t => t.id === todo.id);
                if (idx > -1) {
                    newColumns[colKey] = [...newColumns[colKey]];
                    newColumns[colKey].splice(idx, 1);
                    found = true;
                }
            }

            // Determine new location
            const isAssignedToMe = todo.assignees && todo.assignees.some(a => a.id === user.id);
            let status = '';

            if (todo.status === 'backlog') {
                status = 'backlog';
            } else if (todo.status === 'in-progress') {
                if (isAssignedToMe) {
                    status = 'my-tasks';
                } else {
                    status = 'backlog';
                }
            } else if (todo.status === 'done') {
                if (isAssignedToMe) {
                    status = 'my-tasks';
                } else {
                    // Done by others -> Hide? Or maybe just return newColumns (removed)
                    const backlogHasIt = newColumns['backlog'].find(t => t.id === todo.id);
                    if (!backlogHasIt && !found) return prev; // If not in list and shouldn't be, do nothing
                    // If it was in list and now hidden, we already removed it.
                    return newColumns;
                }
            }

            if (!status) return newColumns;

            // Add to new location (avoid duplicates if not removed?)
            // We already removed it from everywhere, so safe to add.
            newColumns[status] = [todo, ...newColumns[status]];

            // Re-sort column
            newColumns[status].sort((a, b) => {
                if (a.due_date && b.due_date) {
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
                if (a.due_date) return -1;
                if (b.due_date) return 1;
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            return newColumns;
        });
    };

    const handleRealtimeChange = async (payload: any) => {
        // console.log('Realtime change (todos):', payload);
        // Simply refetch all todos to ensure consistency and avoid state logic bugs.
        // We can optimize this later if needed, but correctness is priority.
        fetchTodos();
    };

    const handleAssigneeChange = async (payload: any) => {
        // console.log('Assignee change:', payload);
        const todoId = payload.new?.todo_id || payload.old?.todo_id;
        if (!todoId) return;

        // Verify relevance before fetching all (optional optimization)
        // Since we can't easily check project_id without fetching the todo, 
        // we might just fetchTodos() if the current list contains the todo, 
        // but it's safer to just fetch. 
        // To avoid excessive fetches from other projects, we can try to fetch the single todo checks.

        // But for now, let's just fetchTodos() to be absolutely sure.
        // Actually, fetching everything on every global assignment is risky.
        // Let's at least check if the todo is in our current columns?
        // Or fetch single todo to check project_id.

        const { data: todo } = await supabase
            .from('todos')
            .select('project_id')
            .eq('id', todoId)
            .single();

        if (todo && todo.project_id === projectId) {
            fetchTodos();
        }
    };

    const fetchTodos = async () => {
        if (!projectId) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: todosData, error } = await supabase
            .from('todos')
            .select(`
                *,
                todo_assignees (
                    user_id,
                    profiles:user_id (*)
                ),
                categories (
                    id,
                    name,
                    color
                )
            `)
            .eq('project_id', projectId)
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching todos:', error);
            return;
        }

        if (todosData) {
            const formattedTodos: Todo[] = todosData.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                created_at: t.created_at,
                completed_at: t.completed_at,
                due_date: t.due_date,
                project_id: t.project_id,
                category_id: t.category_id,
                categories: t.categories,
                assignees: t.todo_assignees.map((ta: any) => {
                    if (ta.profiles) return ta.profiles;
                    if (ta.user_id) {
                        return {
                            id: ta.user_id,
                            name: 'Unknown User',
                            avatar_url: '',
                            email: '',
                            nickname: '',
                            team_id: ''
                        };
                    }
                    return null;
                }).filter(Boolean)
            }));

            const sortedTodos = formattedTodos.sort((a, b) => {
                if (a.due_date && b.due_date) {
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
                if (a.due_date) return -1;
                if (b.due_date) return 1;

                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            setColumns({
                backlog: sortedTodos.filter(t =>
                    t.status === 'backlog' ||
                    (t.status === 'in-progress' && !t.assignees.some(a => a.id === user.id))
                ),
                'my-tasks': sortedTodos.filter(t =>
                    t.status === 'in-progress' && t.assignees.some(a => a.id === user.id)
                ),
                done: sortedTodos.filter(t => t.status === 'done')
            });
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Use cached currentUser for immediate UI update
        let user = currentUser;

        // Optimistic UI Update
        const newColumns = { ...columns };
        const sourceItems = Array.from(newColumns[source.droppableId]);

        let movedItem: Todo;
        // Don't wait for supabase here to avoid UI lag

        if (source.droppableId === destination.droppableId) {
            const [reorderedItem] = sourceItems.splice(source.index, 1);
            sourceItems.splice(destination.index, 0, reorderedItem);
            newColumns[source.droppableId] = sourceItems;
            movedItem = reorderedItem;
        } else {
            const destItems = Array.from(newColumns[destination.droppableId] || []);
            const [removed] = sourceItems.splice(source.index, 1);
            movedItem = { ...removed };

            // Logic will be handled below based on destination
            // Instead of just splicing at destination.index, we should sort to match fetchTodos logic
            // to prevent "Jumping" when realtime update kicks in.
            // But if user wants to reorder, this disables reordering.
            // Since we sort by date in fetchTodos, we must sort here too.
            destItems.push(movedItem);
            destItems.sort((a, b) => {
                if (a.due_date && b.due_date) {
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
                if (a.due_date) return -1;
                if (b.due_date) return 1;
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            newColumns[source.droppableId] = sourceItems;
            newColumns[destination.droppableId] = destItems;
        }

        // Apply Optimistic Auto-Assignment Logic BEFORE setColumns
        // CRITICAL: Capture the *original* assignment state before we mutate anything for UI.
        const isOriginallyAssignedToMe = movedItem.assignees?.some(a => a.id === user?.id);

        let targetAssignees = [...(movedItem.assignees || [])];
        let targetStatus = movedItem.status;
        let targetCompletedAt: string | undefined = movedItem.completed_at;

        if (source.droppableId !== destination.droppableId) {

            // Strict check: Cannot move FROM done if not assigned (Un-complete restriction)
            if (source.droppableId === 'done') {
                const isAssignedToMe = movedItem.assignees && movedItem.assignees.some(a => a.id === user?.id);
                if (!isAssignedToMe) {
                    return;
                }
            }

            if (destination.droppableId === 'my-tasks') {
                targetStatus = 'in-progress';
                targetCompletedAt = undefined; // Unset completion
                if (user) {
                    // Optimistic update: Add me if not there
                    if (!isOriginallyAssignedToMe) {
                        const me = {
                            id: user.id,
                            name: user.user_metadata.full_name || user.email || 'Me',
                            avatar_url: user.user_metadata.avatar_url || '',
                            email: user.email || '',
                            nickname: user.user_metadata.nickname || '',
                            team_id: ''
                        };
                        targetAssignees.push(me);
                    }
                }
            } else if (destination.droppableId === 'done') {
                // Strict check: Cannot drag to done if not assigned
                // Since this runs before we optimistically update 'assignees', we must check original item or current user.
                const isAssignedToMe = movedItem.assignees && movedItem.assignees.some(a => a.id === user?.id);

                // If moving to Done, and not assigned to me, BLOCK it.
                // Exception: Logic below was auto-assigning me. 
                // BUT user requested STRICT blocking. "Must be assigned to complete".
                // If I am not assigned, I cannot complete it. Even if I want to claim it, I should claim it (move to My Tasks) first?
                // Or does dragging to done count as "Claim & Complete"?
                // The prompt says "drag and drop event needs to be blocked" for unassigned things.
                // So strict block.

                if (!isAssignedToMe) {
                    alert('이 작업을 완료하려면 담당자로 지정되어야 합니다. 먼저 내 할 일로 가져오세요.');
                    return;
                }

                targetStatus = 'done';
                targetCompletedAt = new Date().toISOString(); // Set completion
                if (user) {
                    // When moving to Done, usually implies "I finished it", so assign me if not assigned?
                    // Or just leave it. Let's add me to track contribution.
                    if (!isOriginallyAssignedToMe) {
                        const me = {
                            id: user.id,
                            name: user.user_metadata.full_name || user.email || 'Me',
                            avatar_url: user.user_metadata.avatar_url || '',
                            email: user.email || '',
                            nickname: user.user_metadata.nickname || '',
                            team_id: ''
                        };
                        targetAssignees.push(me);
                    }
                }
            } else if (destination.droppableId === 'backlog') {
                if (user) {
                    targetAssignees = targetAssignees.filter(a => a.id !== user.id);
                    // Determine status based on remaining assignees
                    if (targetAssignees.length === 0) {
                        targetStatus = 'backlog';
                    } else {
                        // Stays in-progress (shared task) or backlog if explicitly moved there?
                        // If moved to backlog, it implies "Backlog" status usually.
                        // But if others are working on it, it shouldn't be 'backlog'.
                        // However, user dragged it to "Backlog" UI.
                        // If we set 'backlog', it might disrupt others.
                        // But for now, let's reset to 'backlog' if no one else is assigned.
                        // If others are assigned, it stays 'in-progress' but unassigned from me.
                        // This matches "Backlog" column filter logic: (in-progress && !assignedToMe).
                    }
                    // Explicitly set to backlog if moving to backlog column and logic permits?
                    // Actually, if I move to backlog, I want it to be 'backlog' status usually.
                    // But if Assignee exists, 'backlog' status might be weird.
                    // Let's stick to: Unassign Me. If no assignees -> Backlog.
                    if (targetAssignees.length === 0) {
                        targetStatus = 'backlog';
                    } else {
                        // It stays in-progress but I am removed.
                        // It will appear in Backlog column because filter catches it.
                        targetStatus = 'in-progress';
                    }
                    targetCompletedAt = undefined; // Unset completion
                }
            }
        }

        // Update the item in the columns with new status and assignees
        const destList = newColumns[destination.droppableId];
        const itemInDest = destList.find(t => t.id === draggableId);
        if (itemInDest) {
            itemInDest.status = targetStatus;
            itemInDest.assignees = targetAssignees;
            itemInDest.completed_at = targetCompletedAt;
        }

        setColumns(newColumns);

        // --- Now Perform Async Operations ---
        if (!user) {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        }

        if (source.droppableId !== destination.droppableId) {

            // Auto-assign if moving to My Tasks or Done
            if (destination.droppableId === 'my-tasks' || destination.droppableId === 'done') {
                if (user) {
                    // Use the captured original state, NOT the mutated item
                    if (!isOriginallyAssignedToMe) {
                        const { error: assignError } = await supabase
                            .from('todo_assignees')
                            .insert({ todo_id: draggableId, user_id: user.id });

                        if (assignError) {
                            console.error('Error assigning user:', assignError);
                            fetchTodos();
                            return;
                        }
                    }
                }
            } else if (destination.droppableId === 'backlog') {
                if (user) {
                    const { error: unassignError } = await supabase
                        .from('todo_assignees')
                        .delete()
                        .eq('todo_id', draggableId)
                        .eq('user_id', user.id);

                    if (unassignError) {
                        console.error('Error unassigning user:', unassignError);
                    }
                }
            }

            const updates: any = {
                status: targetStatus,
                completed_at: targetCompletedAt || null
            };
            const { error } = await supabase
                .from('todos')
                .update(updates)
                .eq('id', draggableId);

            if (error) {
                console.error('Error updating status:', error);
                fetchTodos(); // Fallback
            }
        }
    };

    const addTodo = async (title: string, dueDate?: string, description?: string, categoryId?: string) => {
        if (!title.trim() || !projectId) return;

        const newTodo: any = {
            title,
            description,
            status: 'backlog',
            project_id: projectId,
            category_id: categoryId || null
        };
        if (dueDate) {
            newTodo.due_date = new Date(dueDate).toISOString();
        }

        const { error } = await supabase
            .from('todos')
            .insert([newTodo]);

        if (error) {
            console.error('Error adding todo:', error);
            alert('할 일을 추가하는 중 오류가 발생했습니다.');
        } else {
            fetchTodos();
        }
    };

    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

    const updateTodo = async (updatedTodo: Todo) => {
        const { error } = await supabase
            .from('todos')
            .update({
                title: updatedTodo.title,
                description: updatedTodo.description,
                due_date: updatedTodo.due_date,
                category_id: updatedTodo.category_id
            })
            .eq('id', updatedTodo.id);

        if (error) {
            console.error('Error updating todo:', error);
            alert('할 일을 수정하는 중 오류가 발생했습니다.');
        } else {
            fetchTodos();
        }
    };

    const handleToggleStatus = async (todo: Todo) => {
        // Enforce completion permission (Strict)
        const isAssignedToMe = currentUser && todo.assignees && todo.assignees.some(a => a.id === currentUser.id);
        if (!isAssignedToMe) {
            alert('이 작업을 변경하려면 담당자로 지정되어야 합니다.');
            return;
        }

        let newStatus = todo.status === 'done' ? 'in-progress' : 'done';
        let newCompletedAt = todo.status === 'done' ? null : new Date().toISOString();

        if (newStatus === 'in-progress' && (!todo.assignees || todo.assignees.length === 0)) {
            newStatus = 'backlog';
        }

        const { error } = await supabase
            .from('todos')
            .update({
                status: newStatus,
                completed_at: newCompletedAt
            })
            .eq('id', todo.id);

        if (error) {
            console.error('Error toggling status:', error);
        } else {
            fetchTodos();
        }
    };

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full w-full gap-8 p-8 bg-white">
                    <div className="flex-1 h-full min-w-[320px]">
                        <Column
                            droppableId="backlog"
                            title="백로그 (할 일)"
                            todos={columns['backlog']}
                            onAddTodo={addTodo}
                            onEditTodo={setEditingTodo}
                            enableDateFilter={true}
                            projectId={projectId}
                            onToggleStatus={handleToggleStatus}
                            currentUserId={currentUser?.id}
                        />
                    </div>
                    <div className="flex-1 h-full min-w-[300px]">
                        <Column
                            droppableId="my-tasks"
                            title="내 할 일 (진행 중)"
                            todos={columns['my-tasks']}
                            onEditTodo={setEditingTodo}
                            enableStatusFilter={true}
                            projectId={projectId}
                            onToggleStatus={handleToggleStatus}
                            currentUserId={currentUser?.id}
                        />
                    </div>
                    <div className="flex-1 h-full min-w-[300px]">
                        <Column
                            droppableId="done"
                            title="완료한 일"
                            todos={columns['done']}
                            onEditTodo={setEditingTodo}
                            projectId={projectId}
                            onToggleStatus={handleToggleStatus}
                            currentUserId={currentUser?.id}
                        />
                    </div>
                </div>
            </DragDropContext>

            <EditTodoModal
                todo={editingTodo}
                isOpen={!!editingTodo}
                onClose={() => setEditingTodo(null)}
                onSave={updateTodo}
                projectId={projectId}
            />
        </>
    );
};

export default Board;
