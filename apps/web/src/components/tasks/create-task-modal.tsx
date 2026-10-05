'use client';

import React, { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
  TaskPriority,
  TaskType,
  ROLES,
} from '@taskmaster/shared';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  defaultStatus?: string;
  projectMembers?: Array<{
    userId: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  onTaskCreated?: () => void;
}

const isMongoId = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
};

export function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  defaultStatus = TASK_STATUSES.TODO,
  projectMembers = [],
  onTaskCreated,
}: CreateTaskModalProps) {
  const { user } = useAuth();
  const isManager = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(TASK_PRIORITIES.MEDIUM);
  const [type, setType] = useState<TaskType>(TASK_TYPES.TASK);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [labels, setLabels] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const validAssignee = isMongoId(selectedAssigneeId) ? selectedAssigneeId : null;
      const validProject = isMongoId(projectId) ? projectId : undefined;
      const isPersonalTask = !validProject;

      let assigneeIds: string[] = [];
      if (validAssignee) {
        assigneeIds = [validAssignee];
      } else if (isPersonalTask && user?.id) {
        assigneeIds = [user.id];
      }

      const payload: any = {
        title: title.trim(),
        descriptionHtml: description.trim() || undefined,
        status,
        priority,
        type,
        projectId: validProject,
        assigneeIds,
        labels: labels
          ? labels
              .split(',')
              .map((l) => l.trim())
              .filter(Boolean)
          : [],
        isPersonal: isPersonalTask,
      };

      if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
      if (estimatedMinutes) payload.estimatedMinutes = Number(estimatedMinutes);

      const res = await apiClient.post('/tasks', payload);
      if (res.data.success) {
        if (!isManager) {
          toast.success('Task request submitted to manager for approval!');
        } else {
          toast.success('Task created successfully!');
        }
        setTitle('');
        setDescription('');
        setSelectedAssigneeId('');
        setDueDate('');
        setEstimatedMinutes('');
        setLabels('');
        onTaskCreated?.();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <span>{isManager ? 'Create Task' : 'Request Task'}</span>
          </DialogTitle>
          <DialogDescription>
            {isManager
              ? 'Add a new deliverable, user story, bug, or technical chore.'
              : 'Submit a task request to your manager for review and approval.'}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold">Task Title *</label>
            <Input
              required
              placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold">Description</label>
            <textarea
              rows={3}
              placeholder="Context, specifications, steps to reproduce..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={TASK_STATUSES.BACKLOG}>Backlog</option>
                <option value={TASK_STATUSES.TODO}>To Do</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                <option value={TASK_STATUSES.IN_REVIEW}>In Review</option>
                <option value={TASK_STATUSES.DONE}>Done</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={TASK_PRIORITIES.LOW}>Low</option>
                <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                <option value={TASK_PRIORITIES.HIGH}>High</option>
                <option value={TASK_PRIORITIES.URGENT}>Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={TASK_TYPES.TASK}>Task</option>
                <option value={TASK_TYPES.FEATURE}>Feature</option>
                <option value={TASK_TYPES.BUG}>Bug</option>
                <option value={TASK_TYPES.CHORE}>Chore</option>
              </select>
            </div>
          </div>

          {projectMembers.length > 0 && (
            <div className="space-y-1.5">
              <label className="font-semibold">Assignee</label>
              <select
                value={selectedAssigneeId}
                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m, idx) => {
                  const userObj = typeof m.userId === 'object' && m.userId ? m.userId : null;
                  const candidateId =
                    userObj?.id ||
                    (userObj as any)?._id ||
                    (typeof m.userId === 'string' ? m.userId : null);

                  if (!candidateId || !isMongoId(String(candidateId))) {
                    return null;
                  }

                  const idStr = String(candidateId);
                  const memberName = userObj?.name || 'Member';
                  const memberEmail = userObj?.email ? ` (${userObj.email})` : '';

                  return (
                    <option key={`assignee-opt-${idStr}-${idx}`} value={idStr}>
                      {memberName}{memberEmail}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold">Target Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Estimated Time (Mins)</label>
              <Input
                type="number"
                placeholder="120"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold">Labels (comma-separated)</label>
            <Input
              placeholder="frontend, auth, high-impact"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()} className="font-semibold">
              {isSubmitting
                ? isManager
                  ? 'Creating...'
                  : 'Submitting...'
                : isManager
                ? 'Create Task'
                : 'Submit Task Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
