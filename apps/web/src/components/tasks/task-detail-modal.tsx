'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  Calendar,
  Send,
  CheckSquare,
  FileQuestion,
  Check,
  X,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
  ROLES,
} from '@taskmaster/shared';


export interface ITaskDetailItem {
  id: string;
  taskKey?: string;
  title: string;
  descriptionHtml?: string;
  status: string;
  priority: string;
  type: string;
  approval?: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    requestedAt?: string;
  };
  assigneeIds: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }>;
  reporterId: {
    id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  startDate?: string;
  estimatedMinutes?: number;
  labels: string[];
  checklist: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    completedAt?: string;
  }>;
  timeEntries: Array<{
    id: string;
    durationSeconds: number;
    description?: string;
    startedAt: string;
  }>;
  comments: Array<{
    id: string;
    userId: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
    content: string;
    createdAt: string;
  }>;
  isPersonal?: boolean;
  createdBy?: string;
  createdAt: string;
}

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailModal({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const [task, setTask] = useState<ITaskDetailItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Editable fields
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Checklist input
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Comment input
  const [commentText, setCommentText] = useState('');

  // Time logging input
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeNote, setTimeNote] = useState('');
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  // Fetch Task details
  useEffect(() => {
    if (!taskId || !isOpen) return;

    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get<{ success: boolean; data: ITaskDetailItem }>(
          `/tasks/${taskId}`,
        );
        if (res.data.success) {
          setTask(res.data.data);
          setTitle(res.data.data.title);
          setDescription(res.data.data.descriptionHtml || '');
        }
      } catch (err) {
        console.error('Failed to load task details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [taskId, isOpen]);

  if (!isOpen || !taskId) return null;

  // Update Status or Priority
  const handleUpdateField = async (field: 'status' | 'priority' | 'type', value: string) => {
    if (!task) return;
    try {
      const res = await apiClient.patch<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}`,
        { [field]: value },
      );
      if (res.data.success) {
        setTask(res.data.data);
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    }
  };

  // Save Title
  const handleSaveTitle = async () => {
    if (!task || !title.trim()) return;
    try {
      const res = await apiClient.patch<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}`,
        { title: title.trim() },
      );
      if (res.data.success) {
        setTask(res.data.data);
        setIsEditingTitle(false);
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error('Failed to save title:', err);
    }
  };

  // Save Description
  const handleSaveDescription = async () => {
    if (!task) return;
    try {
      const res = await apiClient.patch<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}`,
        { descriptionHtml: description },
      );
      if (res.data.success) {
        setTask(res.data.data);
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error('Failed to save description:', err);
    }
  };

  // Add Checklist item
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newChecklistTitle.trim()) return;
    try {
      const res = await apiClient.post<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}/checklist`,
        { title: newChecklistTitle.trim() },
      );
      if (res.data.success) {
        setTask(res.data.data);
        setNewChecklistTitle('');
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  // Toggle Checklist item
  const handleToggleChecklist = async (itemId: string, current: boolean) => {
    if (!task) return;
    try {
      const res = await apiClient.patch<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}/checklist/${itemId}`,
        { isCompleted: !current },
      );
      if (res.data.success) {
        setTask(res.data.data);
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error('Failed to toggle checklist:', err);
    }
  };

  // Delete Checklist item
  const handleDeleteChecklist = async (itemId: string) => {
    if (!task) return;
    try {
      const res = await apiClient.delete<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}/checklist/${itemId}`,
      );
      if (res.data.success) {
        setTask(res.data.data);
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentText.trim()) return;
    try {
      const res = await apiClient.post<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}/comments`,
        { content: commentText.trim() },
      );
      if (res.data.success) {
        setTask(res.data.data);
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  // Log Time
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !timeMinutes) return;
    try {
      const res = await apiClient.post<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}/time-logs`,
        {
          durationSeconds: Math.round(Number(timeMinutes) * 60),
          description: timeNote.trim() || undefined,
          startedAt: new Date().toISOString(),
        },
      );
      if (res.data.success) {
        setTask(res.data.data);
        setTimeMinutes('');
        setTimeNote('');
        setIsLoggingTime(false);
      }
    } catch (err) {
      console.error('Failed to log time:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!task) return;
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await apiClient.delete(`/tasks/${task.id}`);
        onTaskUpdated?.();
        onClose();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const isManager = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const handleApprove = async () => {
    if (!task) return;
    try {
      await apiClient.patch(`/tasks/${task.id}/approve`);
      toast.success('Task request approved!');
      const res = await apiClient.get<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}`,
      );
      if (res.data.success) {
        setTask(res.data.data);
      }
      onTaskUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to approve task request');
    }
  };

  const handleReject = async () => {
    if (!task) return;
    try {
      await apiClient.patch(`/tasks/${task.id}/reject`);
      toast.info('Task request rejected');
      const res = await apiClient.get<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}`,
      );
      if (res.data.success) {
        setTask(res.data.data);
      }
      onTaskUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reject task request');
    }
  };

  const handleResubmit = async () => {
    if (!task) return;
    try {
      await apiClient.patch(`/tasks/${task.id}/resubmit`, {
        title,
        descriptionHtml: description,
      });
      toast.success('Task request resubmitted for manager approval!');
      const res = await apiClient.get<{ success: boolean; data: ITaskDetailItem }>(
        `/tasks/${task.id}`,
      );
      if (res.data.success) {
        setTask(res.data.data);
      }
      onTaskUpdated?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to resubmit task request');
    }
  };

  const completedChecklist = task?.checklist?.filter((c) => c.isCompleted).length || 0;
  const totalChecklist = task?.checklist?.length || 0;
  const checklistPercent =
    totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const totalLoggedSeconds =
    task?.timeEntries?.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) || 0;
  const totalLoggedHours = (totalLoggedSeconds / 3600).toFixed(1);

  const canDelete =
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.ADMIN ||
    (user?.id && task?.createdBy === user.id) ||
    (user?.id && task?.reporterId?.id === user.id) ||
    task?.isPersonal === true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        {isLoading || !task ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Task Request Pending Approval Banner */}
            {task.approval?.status === 'PENDING' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2.5">
                  <FileQuestion className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Pending Manager Approval
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      This task request requires approval before active execution.
                    </p>
                  </div>
                </div>
                {isManager && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-semibold gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve Task
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleReject}
                      className="text-xs h-8 px-3 font-semibold gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Task Request Rejected Banner */}
            {task.approval?.status === 'REJECTED' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="flex items-center gap-2.5">
                  <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      Task Request Rejected
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {task.approval?.reviewNote
                        ? `Manager feedback: "${task.approval.reviewNote}"`
                        : 'Review comments, update task details as needed, and resubmit for approval.'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleResubmit}
                  className="bg-primary text-primary-foreground text-xs h-8 px-3.5 font-semibold gap-1.5 shrink-0 shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resubmit Request
                </Button>
              </div>
            )}

            {/* Header / Key / Type / Status */}
            <div className="space-y-3 pb-3 border-b border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {task.taskKey && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                      {task.taskKey}
                    </span>
                  )}

                  <select
                    value={task.type}
                    onChange={(e) => handleUpdateField('type', e.target.value)}
                    className="h-7 rounded border border-input bg-background px-2 text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={TASK_TYPES.TASK}>Task</option>
                    <option value={TASK_TYPES.FEATURE}>Feature</option>
                    <option value={TASK_TYPES.BUG}>Bug</option>
                    <option value={TASK_TYPES.CHORE}>Chore</option>
                  </select>

                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateField('status', e.target.value)}
                    className="h-7 rounded border border-input bg-primary/10 text-primary font-bold px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={TASK_STATUSES.BACKLOG}>Backlog</option>
                    <option value={TASK_STATUSES.TODO}>To Do</option>
                    <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                    <option value={TASK_STATUSES.IN_REVIEW}>In Review</option>
                    <option value={TASK_STATUSES.DONE}>Done</option>
                  </select>

                  <select
                    value={task.priority}
                    onChange={(e) => handleUpdateField('priority', e.target.value)}
                    className="h-7 rounded border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={TASK_PRIORITIES.LOW}>Low Priority</option>
                    <option value={TASK_PRIORITIES.MEDIUM}>Medium Priority</option>
                    <option value={TASK_PRIORITIES.HIGH}>High Priority</option>
                    <option value={TASK_PRIORITIES.URGENT}>Urgent Priority</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted/40 px-2.5 py-1 rounded-md">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteTask}
                      className="h-7 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5 font-semibold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Task</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Title Section */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-bold"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveTitle}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTitle(task.title);
                      setIsEditingTitle(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className="text-xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors"
                  title="Click to edit title"
                >
                  {task.title}
                </h2>
              )}
            </div>

            {/* Main Content Grid: Left 2 cols Details, Right 1 col Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Description, Subtasks, Comments */}
              <div className="md:col-span-2 space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add detailed technical requirements, repro steps, or acceptance criteria..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSaveDescription}
                    className="w-full rounded-lg border border-input bg-background/80 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  />
                </div>

                {/* Subtask / Checklist */}
                <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-card/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold">Checklist & Subtasks</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {completedChecklist}/{totalChecklist} ({checklistPercent}%)
                    </span>
                  </div>

                  <Progress value={checklistPercent} className="h-1.5" />

                  <div className="space-y-2 pt-1">
                    {task.checklist && task.checklist.map((item, idx) => (
                      <div
                        key={item.id || (item as any)._id || `checklist-item-${idx}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/60 hover:bg-background border border-border/40 text-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleToggleChecklist(item.id || (item as any)._id, item.isCompleted)}
                            className={
                              item.isCompleted ? 'text-emerald-500' : 'text-muted-foreground'
                            }
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                          <span
                            className={
                              item.isCompleted ? 'line-through text-muted-foreground' : 'font-medium'
                            }
                          >
                            {item.title}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteChecklist(item.id || (item as any)._id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
                    <Input
                      placeholder="Add subtask or acceptance check..."
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <Button type="submit" size="sm" className="h-8 text-xs font-semibold px-3">
                      Add
                    </Button>
                  </form>
                </div>

                {/* Discussion Thread */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold">Activity & Discussion</span>
                  </div>

                  <div className="space-y-3">
                    {task.comments && task.comments.map((comment, idx) => (
                      <div
                        key={comment.id || (comment as any)._id || `comment-item-${idx}`}
                        className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{comment.userId?.name || 'User'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(comment.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Input
                      placeholder="Write a comment or update..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                    <Button type="submit" size="sm" className="h-9 px-3 gap-1.5 font-semibold">
                      <Send className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </Button>
                  </form>
                </div>
              </div>

              {/* Right Column: Metadata & Time Tracking */}
              <div className="space-y-5 text-xs">
                {/* Assignees Card */}
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-2">
                  <span className="font-bold text-[11px] text-muted-foreground uppercase block">
                    Assignees
                  </span>
                  {task.assigneeIds && task.assigneeIds.length > 0 ? (
                    <div className="space-y-2">
                      {task.assigneeIds.map((u, idx) => {
                        const uId = typeof u === 'string' ? u : u.id || (u as any)._id || `assignee-${idx}`;
                        const uName = typeof u === 'string' ? u : u.name || 'User';
                        return (
                          <div key={uId} className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                              {uName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium truncate">{uName}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-[11px]">Unassigned</p>
                  )}
                </div>

                {/* Reporter */}
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <span className="font-bold text-[11px] text-muted-foreground uppercase block">
                    Reporter
                  </span>
                  <p className="font-medium">{task.reporterId?.name || 'System'}</p>
                </div>

                {/* Time Tracking */}
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Time Spent
                    </span>
                    <span className="font-mono font-bold">{totalLoggedHours} hrs</span>
                  </div>

                  {isLoggingTime ? (
                    <form onSubmit={handleLogTime} className="space-y-2 pt-1">
                      <Input
                        type="number"
                        placeholder="Minutes spent (e.g. 45)"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(e.target.value)}
                        className="h-8 text-xs"
                        required
                      />
                      <Input
                        placeholder="Optional work description"
                        value={timeNote}
                        onChange={(e) => setTimeNote(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="h-7 text-xs flex-1">
                          Log Time
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsLoggingTime(false)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLoggingTime(true)}
                      className="w-full h-8 text-xs gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      Log Work Time
                    </Button>
                  )}
                </div>

                {/* Tags */}
                {task.labels && task.labels.length > 0 && (
                  <div className="p-3.5 rounded-xl border bg-card/40 space-y-2">
                    <span className="font-bold text-[11px] text-muted-foreground uppercase block">
                      Labels
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {task.labels.map((l, i) => (
                        <Badge key={`label-${l}-${i}`} variant="secondary" className="text-[10px] font-mono">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
