'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Calendar,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  ROLES,
} from '@taskmaster/shared';
import { TaskDetailModal } from './task-detail-modal';
import { CreateTaskModal } from './create-task-modal';


export interface IKanbanTask {
  id: string;
  taskKey?: string;
  title: string;
  descriptionHtml?: string;
  status: string;
  priority: string;
  type: string;
  assigneeIds: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
  }>;
  dueDate?: string;
  labels: string[];
  checklist?: Array<{
    id: string;
    isCompleted: boolean;
  }>;
  orderIndex: number;
  createdBy?: string;
  reporterId?: { id: string; name?: string } | string;
  isPersonal?: boolean;
  approval?: {
    requestedBy?: string;
    requestedAt?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote?: string;
  };
}

const COLUMNS = [
  { id: TASK_STATUSES.BACKLOG, title: 'Backlog', color: 'border-slate-500/30 bg-slate-500/5' },
  { id: TASK_STATUSES.TODO, title: 'To Do', color: 'border-blue-500/30 bg-blue-500/5' },
  { id: TASK_STATUSES.IN_PROGRESS, title: 'In Progress', color: 'border-amber-500/30 bg-amber-500/5' },
  { id: TASK_STATUSES.IN_REVIEW, title: 'In Review', color: 'border-purple-500/30 bg-purple-500/5' },
  { id: TASK_STATUSES.DONE, title: 'Done', color: 'border-emerald-500/30 bg-emerald-500/5' },
];

// Sortable Task Card Component
function SortableTaskCard({
  task,
  onClick,
  onDeleteTask,
}: {
  task: IKanbanTask;
  onClick: (task: IKanbanTask) => void;
  onDeleteTask?: (taskId: string, e: React.MouseEvent) => void;
}) {
  const { user } = useAuth();
  const reporterIdStr = typeof task.reporterId === 'string' ? task.reporterId : task.reporterId?.id;
  const canDelete =
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.ADMIN ||
    (user?.id && task.createdBy === user.id) ||
    (user?.id && reporterIdStr === user.id) ||
    task.isPersonal === true;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedChecklists = task.checklist?.filter((c) => c.isCompleted).length || 0;
  const totalChecklists = task.checklist?.length || 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TASK_PRIORITIES.URGENT:
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case TASK_PRIORITIES.HIGH:
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case TASK_PRIORITIES.MEDIUM:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border/40';
    }
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-28 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 opacity-60"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className="group p-3.5 rounded-xl border border-border/70 bg-card hover:bg-card/90 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing space-y-2.5 text-xs select-none"
    >
      {/* Top Header with Key, Type, Priority */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          {task.taskKey && (
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
              {task.taskKey}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {task.type}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </Badge>

          {onDeleteTask && canDelete && (
            <button
              type="button"
              title="Delete Task"
              onClick={(e) => onDeleteTask(task.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Task Title */}
      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Tags */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((label, idx) => (
            <span
              key={`task-label-${task.id}-${label}-${idx}`}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/70 text-secondary-foreground"
            >
              #{label}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-muted text-muted-foreground">
              +{task.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer Info: Checklist, Due Date & Assignees */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {totalChecklists > 0 && (
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <CheckSquare className="h-3 w-3 text-primary" />
              <span>
                {completedChecklists}/{totalChecklists}
              </span>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] font-mono">
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Assignees stack */}
        {task.assigneeIds && task.assigneeIds.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {task.assigneeIds.slice(0, 3).map((u, i) => {
              const uId =
                typeof u === 'string'
                  ? u
                  : u && typeof u === 'object'
                  ? u.id || (u as any)._id || `assignee-${i}`
                  : `assignee-${i}`;
              const uName =
                typeof u === 'string'
                  ? u
                  : (u && typeof u === 'object' ? u.name : 'U') || 'U';
              const keyStr = `task-${task.id}-assignee-${String(uId)}-${i}`;

              return (
                <div
                  key={keyStr}
                  title={uName}
                  className="h-5 w-5 rounded-full border border-background bg-primary/20 text-primary font-bold text-[8px] flex items-center justify-center shadow-xs"
                >
                  {uName.slice(0, 2).toUpperCase()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
  onDeleteTask,
}: {
  column: { id: string; title: string; color: string };
  tasks: IKanbanTask[];
  onTaskClick: (task: IKanbanTask) => void;
  onAddTask: (status: string) => void;
  onDeleteTask?: (taskId: string, e: React.MouseEvent) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border ${column.color} backdrop-blur-sm p-3.5 min-w-[280px] w-full lg:w-[280px] shrink-0 min-h-[500px]`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">{column.title}</h3>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onAddTask(column.id)}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Task Cards Sortable Container */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={onTaskClick} onDeleteTask={onDeleteTask} />
          ))}

          {tasks.length === 0 && (
            <div className="h-24 rounded-xl border border-dashed border-border/50 flex items-center justify-center text-muted-foreground text-[11px]">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Main Kanban Board Component
interface KanbanBoardProps {
  projectId?: string;
  initialTasks: IKanbanTask[];
  projectMembers?: Array<{
    userId: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  onTasksChanged?: () => void;
}

export function KanbanBoard({
  projectId,
  initialTasks,
  projectMembers = [],
  onTasksChanged,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<IKanbanTask[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<IKanbanTask | null>(null);

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<string>(TASK_STATUSES.TODO);

  const handleDeleteTask = async (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await apiClient.delete(`/tasks/${taskId}`);
        onTasksChanged?.();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };


  // Sync internal state when initialTasks updates
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    // Check if dragging over a column container directly
    const isOverColumn = COLUMNS.some((c) => c.id === overId);
    if (isOverColumn && activeTaskItem.status !== overId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: overId } : t)),
      );
      return;
    }

    // Check if dragging over another task
    const overTaskItem = tasks.find((t) => t.id === overId);
    if (overTaskItem && activeTaskItem.status !== overTaskItem.status) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: overTaskItem.status } : t)),
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    let targetStatus = activeTaskItem.status;
    let targetIndex = 0;

    // If dropped on column directly
    const isOverColumn = COLUMNS.some((c) => c.id === overId);
    if (isOverColumn) {
      targetStatus = overId;
      const columnTasks = tasks.filter((t) => t.status === targetStatus);
      targetIndex = columnTasks.length;
    } else {
      const overTaskItem = tasks.find((t) => t.id === overId);
      if (overTaskItem) {
        targetStatus = overTaskItem.status;
        const columnTasks = tasks.filter((t) => t.status === targetStatus);
        targetIndex = columnTasks.findIndex((t) => t.id === overId);
        if (targetIndex < 0) targetIndex = 0;
      }
    }

    try {
      await apiClient.patch(`/tasks/${activeId}/reorder`, {
        status: targetStatus,
        orderIndex: targetIndex,
      });
      onTasksChanged?.();
    } catch (err) {
      console.error('Failed to persist task reorder:', err);
      onTasksChanged?.();
    }
  };

  const handleTaskClick = (task: IKanbanTask) => {
    setSelectedTaskId(task.id);
    setIsDetailOpen(true);
  };

  const handleAddTask = (status: string) => {
    setCreateStatus(status);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.id);
            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                onTaskClick={handleTaskClick}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="p-3.5 rounded-xl border border-primary bg-card shadow-2xl space-y-2 text-xs opacity-95 rotate-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {activeTask.taskKey || 'TASK'}
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {activeTask.priority}
                </Badge>
              </div>
              <h4 className="font-semibold">{activeTask.title}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={onTasksChanged}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId}
        defaultStatus={createStatus}
        projectMembers={projectMembers}
        onTaskCreated={onTasksChanged}
      />
    </div>
  );
}
