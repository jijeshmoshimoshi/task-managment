'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  LayoutGrid,
  List,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  User,
  Sparkles,
  Check,
  X,
  FileQuestion,
  Pencil,
  MessageSquare,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanBoard, IKanbanTask } from '@/components/tasks/kanban-board';
import { TaskListView } from '@/components/tasks/task-list-view';

import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TASK_STATUSES, ROLES } from '@taskmaster/shared';

export default function MyTasksPage() {
  const { user } = useAuth();
  const isManager = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const [tasks, setTasks] = useState<IKanbanTask[]>([]);
  const [requestTasks, setRequestTasks] = useState<IKanbanTask[]>([]);
  const [rejectedTasks, setRejectedTasks] = useState<IKanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<
    'assigned' | 'requests' | 'rejected' | 'personal' | 'created'
  >('assigned');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isCreatePersonalOpen, setIsCreatePersonalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (activeCategory === 'assigned') {
        params.append('myTasksOnly', 'true');
        params.append('approvalStatus', 'APPROVED');
      } else if (activeCategory === 'requests') {
        params.append('approvalStatus', 'PENDING');
      } else if (activeCategory === 'rejected') {
        params.append('approvalStatus', 'REJECTED');
        if (!isManager && user?.id) params.append('reporterId', user.id);
      } else if (activeCategory === 'created') {
        if (user?.id) params.append('reporterId', user.id);
        params.append('approvalStatus', 'APPROVED');
      } else if (activeCategory === 'personal') {
        params.append('isPersonal', 'true');
        params.append('approvalStatus', 'APPROVED');
      }

      const res = await apiClient.get<{ success: boolean; data: IKanbanTask[] }>(
        `/tasks?${params.toString()}`,
      );
      if (res.data.success) {
        if (activeCategory === 'requests') {
          setRequestTasks(res.data.data);
        } else if (activeCategory === 'rejected') {
          setRejectedTasks(res.data.data);
        } else {
          setTasks(res.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load my tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, isManager, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleApproveRequest = async (taskId: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}/approve`);
      toast.success('Task request approved!');
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to approve task request');
    }
  };

  const handleRejectRequest = async (taskId: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}/reject`);
      toast.info('Task request rejected');
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to reject task request');
    }
  };

  // Metrics
  const totalAssigned = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === TASK_STATUSES.IN_PROGRESS).length;
  const doneCount = tasks.filter((t) => t.status === TASK_STATUSES.DONE).length;
  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== TASK_STATUSES.DONE,
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">My Personal Workspace</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {isManager ? 'Manager Workspace' : 'Direct Assignments'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isManager
              ? 'Track and assign team deliverables, review task requests, and execute projects.'
              : 'Track approved tasks assigned to you, or request new task assignments from your manager.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50">
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="h-8 px-2.5"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2.5"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => setIsCreatePersonalOpen(true)}
            className="shadow-md shadow-primary/20 gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" />
            {isManager ? 'New Task' : 'Request Task'}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Active Scope</p>
              <p className="text-2xl font-bold mt-1">{totalAssigned}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Progress</p>
              <p className="text-2xl font-bold mt-1 text-amber-500">{inProgressCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Overdue Checkpoints</p>
              <p className="text-2xl font-bold mt-1 text-rose-500">{overdueCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Completed</p>
              <p className="text-2xl font-bold mt-1 text-emerald-500">{doneCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(val) => setActiveCategory(val as any)}
        className="space-y-4"
      >
        <TabsList className="bg-card/70 border p-1">
          <TabsTrigger value="assigned" className="gap-2 text-xs">
            <User className="h-3.5 w-3.5" />
            Assigned to Me
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 text-xs">
            <FileQuestion className="h-3.5 w-3.5" />
            {isManager ? 'Task Requests (Approval Queue)' : 'My Task Requests'}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2 text-xs">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Rejected Requests
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Personal To-Do
          </TabsTrigger>
          <TabsTrigger value="created" className="gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Created by Me
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Rendering */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : activeCategory === 'requests' ? (
        /* Task Requests View */
        <div className="space-y-4">
          {requestTasks.length === 0 ? (
            <Card className="p-8 text-center bg-card/40 border-dashed">
              <FileQuestion className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-muted-foreground">
                {isManager ? 'No pending task requests requiring approval.' : 'You have no pending task requests.'}
              </p>
              {!isManager && (
                <Button
                  onClick={() => setIsCreatePersonalOpen(true)}
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Request a Task
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requestTasks.map((reqTask) => {
                const requestedByName =
                  typeof reqTask.reporterId === 'object' && reqTask.reporterId?.name
                    ? reqTask.reporterId.name
                    : 'Team Member';

                return (
                  <Card
                    key={reqTask.id}
                    onClick={() => setSelectedTaskId(reqTask.id)}
                    className="bg-card/70 border border-amber-500/30 hover:border-amber-500/50 hover:shadow-md transition-all p-4 space-y-3 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        Pending Manager Approval
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {reqTask.priority}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {reqTask.title}
                      </h4>
                      {reqTask.descriptionHtml && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {reqTask.descriptionHtml}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Requested by: <strong className="text-foreground">{requestedByName}</strong></span>
                      <span>Type: <strong className="uppercase">{reqTask.type}</strong></span>
                    </div>

                    <div
                      className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTaskId(reqTask.id)}
                          className="h-7 text-xs px-2.5 gap-1 hover:bg-primary/10 hover:text-primary"
                          title="Edit task request details"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTaskId(reqTask.id)}
                          className="h-7 text-xs px-2.5 gap-1 hover:bg-primary/10 hover:text-primary"
                          title="Comment on task request"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Comment
                        </Button>
                      </div>

                      {isManager && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRequest(reqTask.id);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 h-7 px-2.5 font-semibold"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRequest(reqTask.id);
                            }}
                            className="text-xs gap-1 h-7 px-2.5 font-semibold"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : activeCategory === 'rejected' ? (
        /* Rejected Tasks View */
        <div className="space-y-4">
          {rejectedTasks.length === 0 ? (
            <Card className="p-8 text-center bg-card/40 border-dashed">
              <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-sm font-semibold text-muted-foreground">
                No rejected task requests.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedTasks.map((rejTask) => {
                const requestedByName =
                  typeof rejTask.reporterId === 'object' && rejTask.reporterId?.name
                    ? rejTask.reporterId.name
                    : 'Team Member';

                return (
                  <Card
                    key={rejTask.id}
                    onClick={() => setSelectedTaskId(rejTask.id)}
                    className="bg-card/70 border border-rose-500/30 hover:border-rose-500/50 hover:shadow-md transition-all p-4 space-y-3 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]">
                        Task Request Rejected
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {rejTask.priority}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                        {rejTask.title}
                      </h4>
                      {rejTask.descriptionHtml && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {rejTask.descriptionHtml}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Requested by: <strong className="text-foreground">{requestedByName}</strong></span>
                      <span>Type: <strong className="uppercase">{rejTask.type}</strong></span>
                    </div>

                    <div
                      className="pt-2 border-t border-border/40 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTaskId(rejTask.id)}
                          className="h-7 text-xs px-2.5 gap-1 hover:bg-primary/10 hover:text-primary"
                          title="Edit task details according to comments"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit & Review
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await apiClient.patch(`/tasks/${rejTask.id}/resubmit`);
                            toast.success('Task request resubmitted for manager approval!');
                            fetchTasks();
                          } catch (err: any) {
                            toast.error(
                              err.response?.data?.error?.message || 'Failed to resubmit task request',
                            );
                          }
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 h-7 px-3 font-semibold shadow-xs"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Resubmit Task
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : viewMode === 'board' ? (
        <KanbanBoard initialTasks={tasks} onTasksChanged={fetchTasks} />
      ) : (
        <TaskListView tasks={tasks} onTasksChanged={fetchTasks} />
      )}

      {/* Task Detail Modal for viewing/editing/commenting */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={fetchTasks}
      />

      {/* Create Task / Request Task Modal */}
      <CreateTaskModal
        isOpen={isCreatePersonalOpen}
        onClose={() => setIsCreatePersonalOpen(false)}
        onTaskCreated={fetchTasks}
      />
    </div>
  );
}
