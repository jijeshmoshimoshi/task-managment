'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  ROLES,
} from '@taskmaster/shared';
import { useAuth } from '@/hooks/use-auth';
import { IKanbanTask } from './kanban-board';
import { TaskDetailModal } from './task-detail-modal';
import { CreateTaskModal } from './create-task-modal';


interface TaskListViewProps {
  projectId?: string;
  tasks: IKanbanTask[];
  projectMembers?: Array<{
    userId: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  onTasksChanged?: () => void;
}

export function TaskListView({
  projectId,
  tasks,
  projectMembers = [],
  onTasksChanged,
}: TaskListViewProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchKey = t.taskKey?.toLowerCase().includes(q);
      const matchLabels = t.labels?.some((l) => l.toLowerCase().includes(q));
      if (!matchTitle && !matchKey && !matchLabels) return false;
    }
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case TASK_PRIORITIES.URGENT:
        return <Badge variant="destructive">Urgent</Badge>;
      case TASK_PRIORITIES.HIGH:
        return <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">High</Badge>;
      case TASK_PRIORITIES.MEDIUM:
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TASK_STATUSES.DONE:
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Done</Badge>;
      case TASK_STATUSES.IN_PROGRESS:
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">In Progress</Badge>;
      case TASK_STATUSES.IN_REVIEW:
        return <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">In Review</Badge>;
      case TASK_STATUSES.TODO:
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">To Do</Badge>;
      default:
        return <Badge variant="outline">Backlog</Badge>;
    }
  };

  const canDeleteTask = (t: IKanbanTask) => {
    const repIdStr = typeof t.reporterId === 'string' ? t.reporterId : t.reporterId?.id;
    return (
      user?.role === ROLES.SUPER_ADMIN ||
      user?.role === ROLES.ADMIN ||
      (user?.id && t.createdBy === user.id) ||
      (user?.id && repIdStr === user.id) ||
      t.isPersonal === true
    );
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      onTasksChanged?.();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter tasks by key, title, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/80"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background/80 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value={TASK_STATUSES.BACKLOG}>Backlog</option>
            <option value={TASK_STATUSES.TODO}>To Do</option>
            <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
            <option value={TASK_STATUSES.IN_REVIEW}>In Review</option>
            <option value={TASK_STATUSES.DONE}>Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background/80 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Priorities</option>
            <option value={TASK_PRIORITIES.URGENT}>Urgent</option>
            <option value={TASK_PRIORITIES.HIGH}>High</option>
            <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
            <option value={TASK_PRIORITIES.LOW}>Low</option>
          </select>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* Task List Table */}
      <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Key & Title</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Checklist</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Assignees</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                    No tasks match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const completedChecklists =
                    t.checklist?.filter((c) => c.isCompleted).length || 0;
                  const totalChecklists = t.checklist?.length || 0;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setIsDetailOpen(true);
                      }}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {t.taskKey && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border shrink-0">
                              {t.taskKey}
                            </span>
                          )}
                          <span className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                            {t.title}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                      <td className="py-3 px-4">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                          {t.type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {totalChecklists > 0 ? (
                          <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <CheckSquare className="h-3 w-3 text-primary" />
                            <span>
                              {completedChecklists}/{totalChecklists}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3 px-4">
                        {t.assigneeIds && t.assigneeIds.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {t.assigneeIds.slice(0, 3).map((u, i) => {
                              const uName =
                                typeof u === 'string'
                                  ? u
                                  : (u && typeof u === 'object' ? u.name : 'U') || 'U';
                              const uId =
                                typeof u === 'string'
                                  ? u
                                  : u && typeof u === 'object'
                                  ? u.id || (u as any)._id || `assignee-${i}`
                                  : `assignee-${i}`;
                              const keyStr = `list-task-${t.id}-assignee-${String(uId)}-${i}`;

                              return (
                                <div
                                  key={keyStr}
                                  title={uName}
                                  className="h-6 w-6 rounded-full border border-background bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center"
                                >
                                  {uName.slice(0, 2).toUpperCase()}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {canDeleteTask(t) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteTask(t.id, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
        projectMembers={projectMembers}
        onTaskCreated={onTasksChanged}
      />
    </div>
  );
}
