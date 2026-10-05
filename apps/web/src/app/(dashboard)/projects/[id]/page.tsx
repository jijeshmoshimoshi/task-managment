'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Plus,
  Trash2,
  Briefcase,
  Layers,
  Save,
  UserPlus,
  Sparkles,
  LayoutGrid,
  List,
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { KanbanBoard, IKanbanTask } from '@/components/tasks/kanban-board';
import { TaskListView } from '@/components/tasks/task-list-view';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_HEALTH,
  PROJECT_ROLES,
  ROLES,
} from '@taskmaster/shared';

interface IProjectMember {
  userId: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
    jobTitle?: string;
    department?: string;
  };
  role: string;
  joinedAt: string;
}

interface IMilestone {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface IProjectDetail {
  id: string;
  name: string;
  key: string;
  description?: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  priority: string;
  health: string;
  budget?: number;
  tags: string[];
  coverColor?: string;
  icon?: string;
  members: IProjectMember[];
  milestones: IMilestone[];
  stats?: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    progressPercentage: number;
    spentBudget?: number;
  };
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IOrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuth();
  const canViewBudget = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const [project, setProject] = useState<IProjectDetail | null>(null);
  const [orgUsers, setOrgUsers] = useState<IOrgUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Milestone Form
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  // Member Form
  const [memberForm, setMemberForm] = useState({
    userId: '',
    role: PROJECT_ROLES.CONTRIBUTOR,
  });

  // Settings Form
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
    client: '',
    status: '',
    priority: '',
    budget: '',
    coverColor: '#3b82f6',
    startDate: '',
    endDate: '',
    tags: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [tasks, setTasks] = useState<IKanbanTask[]>([]);

  // Fetch Project Tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: IKanbanTask[] }>(
        `/tasks?projectId=${projectId}`,
      );
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [projectId]);

  // Fetch Project
  const fetchProject = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}`,
      );
      if (res.data.success) {
        const p = res.data.data;
        setProject(p);
        setSettingsForm({
          name: p.name,
          description: p.description || '',
          client: p.client || '',
          status: p.status,
          priority: p.priority,
          budget: p.budget?.toString() || '',
          coverColor: p.coverColor || '#3b82f6',
          startDate: p.startDate ? (p.startDate.split('T')[0] ?? '') : '',
          endDate: p.endDate ? (p.endDate.split('T')[0] ?? '') : '',
          tags: p.tags?.join(', ') || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch Org Users for Member Assignment
  const fetchOrgUsers = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: IOrgUser[] }>('/users?limit=100');
      if (res.data.success) {
        setOrgUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch org users:', err);
    }
  }, []);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchOrgUsers();
  }, [fetchProject, fetchTasks, fetchOrgUsers]);


  // Add Milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim() || undefined,
      };
      if (milestoneForm.dueDate) {
        payload.dueDate = new Date(milestoneForm.dueDate).toISOString();
      }

      const res = await apiClient.post<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}/milestones`,
        payload,
      );

      if (res.data.success) {
        setProject(res.data.data);
        setIsAddMilestoneOpen(false);
        setMilestoneForm({ title: '', description: '', dueDate: '' });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to add milestone');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Milestone Complete
  const handleToggleMilestone = async (milestone: IMilestone) => {
    try {
      const res = await apiClient.patch<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}/milestones/${milestone.id}`,
        {
          isCompleted: !milestone.isCompleted,
        },
      );
      if (res.data.success) {
        setProject(res.data.data);
      }
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      const res = await apiClient.delete<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}/milestones/${milestoneId}`,
      );
      if (res.data.success) {
        setProject(res.data.data);
      }
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}/members`,
        {
          userId: memberForm.userId,
          role: memberForm.role,
        },
      );

      if (res.data.success) {
        setProject(res.data.data);
        setIsAddMemberOpen(false);
        setMemberForm({ userId: '', role: PROJECT_ROLES.CONTRIBUTOR });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to safely extract 24-char ObjectId string from member
  const getMemberUserId = (m: any): string => {
    if (!m) return '';
    if (typeof m === 'string') return /^[0-9a-fA-F]{24}$/.test(m) ? m : '';
    if (typeof m.userId === 'object' && m.userId) {
      const candidate = (m.userId as any).id || (m.userId as any)._id;
      if (typeof candidate === 'string' && /^[0-9a-fA-F]{24}$/.test(candidate)) return candidate;
    }
    if (typeof m.userId === 'string' && /^[0-9a-fA-F]{24}$/.test(m.userId)) return m.userId;
    if (typeof m === 'object') {
      const candidate = m.id || m._id;
      if (typeof candidate === 'string' && /^[0-9a-fA-F]{24}$/.test(candidate)) return candidate;
    }
    return '';
  };

  // Remove Member
  const handleRemoveMember = async (memberOrUserId: any) => {
    const userId = getMemberUserId(memberOrUserId);
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Invalid member userId for removal:', userId);
      return;
    }

    try {
      const res = await apiClient.delete<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}/members/${userId}`,
      );
      if (res.data.success) {
        setProject(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to remove member');
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        name: settingsForm.name.trim(),
        description: settingsForm.description.trim() || undefined,
        client: settingsForm.client.trim() || undefined,
        status: settingsForm.status,
        priority: settingsForm.priority,
        coverColor: settingsForm.coverColor,
        tags: settingsForm.tags
          ? settingsForm.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      if (settingsForm.startDate) payload.startDate = new Date(settingsForm.startDate).toISOString();
      if (settingsForm.endDate) payload.endDate = new Date(settingsForm.endDate).toISOString();
      if (settingsForm.budget) payload.budget = Number(settingsForm.budget);

      const res = await apiClient.patch<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}`,
        payload,
      );

      if (res.data.success) {
        setProject(res.data.data);
        setSuccessMessage('Project settings saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/projects/${projectId}`);
      router.push('/projects');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Failed to delete project');
      setIsSubmitting(false);
    }
  };

  // Archive Project
  const handleToggleArchive = async () => {
    try {
      const res = await apiClient.post<{ success: boolean; data: IProjectDetail }>(
        `/projects/${projectId}/archive`,
      );
      if (res.data.success) {
        setProject(res.data.data);
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">Loading workspace telemetry...</p>
        </div>
      </div>
    );
  }

  const completedMilestones = project.milestones?.filter((m) => m.isCompleted).length || 0;
  const totalMilestones = project.milestones?.length || 0;
  const milestoneProgress =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const isUserProjectLead =
    user?.role === ROLES.SUPER_ADMIN ||
    user?.role === ROLES.ADMIN ||
    project.members.some((m) => {
      const uId = getMemberUserId(m);
      const currentUserId = user?.id || (user as any)?._id;
      return uId === currentUserId && m.role === PROJECT_ROLES.MANAGER;
    });

  // Available users not yet in project
  const availableUsers = orgUsers.filter((u) => {
    const orgUserId = u.id || (u as any)?._id;
    return !project.members.some((m) => getMemberUserId(m) === orgUserId);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>All Projects</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setErrorMessage(null);
              setIsAddMilestoneOpen(true);
            }}
            className="text-xs gap-1.5 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setErrorMessage(null);
              setIsAddMemberOpen(true);
            }}
            className="text-xs gap-1.5 font-semibold"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Project Hero Banner */}
      <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm">
        <div
          className="h-3 w-full"
          style={{ backgroundColor: project.coverColor || '#3b82f6' }}
        />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {project.key}
                </span>
                <Badge
                  variant={
                    project.health === PROJECT_HEALTH.ON_TRACK
                      ? 'default'
                      : project.health === PROJECT_HEALTH.AT_RISK
                      ? 'secondary'
                      : 'destructive'
                  }
                  className="font-medium text-xs gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {project.health.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {project.status}
                </Badge>
                {project.isArchived && (
                  <Badge variant="destructive" className="text-xs">
                    ARCHIVED
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                {project.name}
              </h1>

              {project.client && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span>Client / Unit: <strong className="text-foreground">{project.client}</strong></span>
                </div>
              )}
            </div>

            {/* Quick Stats Ribbon */}
            <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border border-border/50">
              <div className="text-center px-2">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Milestones</p>
                <p className="text-lg font-bold font-mono">
                  {completedMilestones}/{totalMilestones}
                </p>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center px-2">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Team Size</p>
                <p className="text-lg font-bold font-mono">{project.members.length}</p>
              </div>
              {canViewBudget && (
                <>
                  <div className="h-8 w-px bg-border/60" />
                  <div className="text-center px-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Budget</p>
                    <p className="text-lg font-bold font-mono text-emerald-500">
                      {project.budget ? `$${(project.budget / 1000).toFixed(0)}k` : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/70 border p-1">
          <TabsTrigger value="overview" className="gap-2 text-xs">
            <FolderKanban className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2 text-xs">
            <LayoutGrid className="h-4 w-4" />
            Board (Kanban) ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2 text-xs">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4" />
            Milestones ({project.milestones?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2 text-xs">
            <Users className="h-4 w-4" />
            Team Members ({project.members?.length || 0})
          </TabsTrigger>
          {isUserProjectLead && (
            <TabsTrigger value="settings" className="gap-2 text-xs">
              <Layers className="h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>


        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Milestones */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Scope Card */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Initiative Description & Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {project.description || 'No detailed scope description provided.'}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Start Date
                      </span>
                      <span className="font-mono font-medium">
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : 'Not scheduled'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Target End Date
                      </span>
                      <span className="font-mono font-medium">
                        {project.endDate
                          ? new Date(project.endDate).toLocaleDateString()
                          : 'Not specified'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Priority Tier
                      </span>
                      <span className="font-semibold text-primary">{project.priority}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1.5">
                        Domain Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="font-mono text-[10px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Milestones Roadmap */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/60">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Milestone Roadmap & Key Deliverables
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Phase-gate progress tracking and target deadlines
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setErrorMessage(null);
                      setIsAddMilestoneOpen(true);
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </Button>
                </CardHeader>
                <CardContent>
                  {project.milestones?.length === 0 ? (
                    <div className="text-center py-8 border rounded-xl border-dashed bg-muted/10 space-y-2">
                      <p className="text-xs text-muted-foreground">No milestones added to this roadmap yet.</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setIsAddMilestoneOpen(true)}
                        className="text-xs"
                      >
                        Add First Milestone
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.milestones.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            m.isCompleted
                              ? 'bg-muted/20 border-border/40 opacity-75'
                              : 'bg-card/80 border-border/60 hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleMilestone(m)}
                              className={`mt-0.5 rounded-full transition-colors ${
                                m.isCompleted
                                  ? 'text-emerald-500'
                                  : 'text-muted-foreground hover:text-primary'
                              }`}
                            >
                              {m.isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>

                            <div>
                              <h4
                                className={`text-xs font-bold ${
                                  m.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {m.title}
                              </h4>
                              {m.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {m.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {m.dueDate && (
                              <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(m.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMilestone(m.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Health Telemetry & Team */}
            <div className="space-y-6">
              {/* Health & Progress Card */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Health & Delivery Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Roadmap Completion</span>
                      <span className="font-mono font-bold">{milestoneProgress}%</span>
                    </div>
                    <Progress value={milestoneProgress} className="h-2" />
                  </div>

                  {canViewBudget && project.budget && (
                    <div className="p-3.5 rounded-xl bg-muted/30 border space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Allocated Budget</span>
                        <span className="font-mono font-bold">${project.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Est. Spent</span>
                        <span className="font-mono text-emerald-500 font-semibold">$0</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Team Members Snapshot Card */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/60">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Project Team
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveTab('members')}
                    className="h-7 text-xs"
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.members.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs">
                          {m.userId?.name ? m.userId.name.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold">{m.userId?.name || 'User'}</p>
                          <p className="text-[10px] text-muted-foreground">{m.userId?.email}</p>
                        </div>
                      </div>

                      <Badge variant="outline" className="font-mono text-[9px]">
                        {m.role}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Board (Kanban) */}
        <TabsContent value="board" className="space-y-4">
          <KanbanBoard
            projectId={projectId}
            initialTasks={tasks}
            projectMembers={project.members}
            onTasksChanged={fetchTasks}
          />
        </TabsContent>

        {/* Tab: List View */}
        <TabsContent value="list" className="space-y-4">
          <TaskListView
            projectId={projectId}
            tasks={tasks}
            projectMembers={project.members}
            onTasksChanged={fetchTasks}
          />
        </TabsContent>

        {/* Tab: Full Milestones View */}
        <TabsContent value="milestones" className="space-y-4">

          <Card className="bg-card/50 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Milestones & Phase-Gates</CardTitle>
                <CardDescription className="text-xs">
                  Manage major deliverables, target release dates, and sprint milestones.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setErrorMessage(null);
                  setIsAddMilestoneOpen(true);
                }}
                className="gap-1.5 font-semibold text-xs"
              >
                <Plus className="h-4 w-4" />
                Add Milestone
              </Button>
            </CardHeader>
            <CardContent>
              {project.milestones?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  No milestones added to this workspace.
                </div>
              ) : (
                <div className="space-y-3">
                  {project.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border bg-card/80 border-border/60 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleMilestone(m)}
                          className={m.isCompleted ? 'text-emerald-500' : 'text-muted-foreground'}
                        >
                          {m.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <div>
                          <h4 className={`font-bold text-sm ${m.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {m.title}
                          </h4>
                          {m.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {m.dueDate && (
                          <span className="text-xs font-mono text-muted-foreground">
                            Target: {new Date(m.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Team Members */}
        <TabsContent value="members" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Workspace Team Members</CardTitle>
                <CardDescription className="text-xs">
                  Configure role-based access for Managers, Contributors, and Viewers.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setErrorMessage(null);
                  setIsAddMemberOpen(true);
                }}
                className="gap-1.5 font-semibold text-xs"
              >
                <UserPlus className="h-4 w-4" />
                Assign Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Workspace Role</th>
                      <th className="py-3 px-4">Job Title & Dept</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {project.members.map((m, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center">
                              {m.userId?.name ? m.userId.name.slice(0, 2).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <p className="font-bold">{m.userId?.name || 'User'}</p>
                              <p className="text-[11px] text-muted-foreground">{m.userId?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {m.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {m.userId?.jobTitle || 'Team Member'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(m)}
                            className="text-xs text-muted-foreground hover:text-destructive h-7"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Settings */}
        {isUserProjectLead && (
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/60">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Project Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Update project metadata, target dates, priority levels, and budget.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorMessage && (
                  <div className="p-3 mb-4 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
                    {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 mb-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg font-medium">
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold">Project Name</label>
                      <Input
                        required
                        value={settingsForm.name}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold">Client / Business Unit</label>
                      <Input
                        value={settingsForm.client}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, client: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold">Scope & Description</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      value={settingsForm.description}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold">Status</label>
                      <select
                        value={settingsForm.status}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, status: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={PROJECT_STATUSES.PLANNING}>Planning</option>
                        <option value={PROJECT_STATUSES.ACTIVE}>Active</option>
                        <option value={PROJECT_STATUSES.ON_HOLD}>On Hold</option>
                        <option value={PROJECT_STATUSES.COMPLETED}>Completed</option>
                        <option value={PROJECT_STATUSES.ARCHIVED}>Archived</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold">Priority</label>
                      <select
                        value={settingsForm.priority}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, priority: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={PROJECT_PRIORITIES.LOW}>Low</option>
                        <option value={PROJECT_PRIORITIES.MEDIUM}>Medium</option>
                        <option value={PROJECT_PRIORITIES.HIGH}>High</option>
                        <option value={PROJECT_PRIORITIES.URGENT}>Urgent</option>
                      </select>
                    </div>

                    {canViewBudget && (
                      <div className="space-y-1.5">
                        <label className="font-semibold">Budget ($ USD)</label>
                        <Input
                          type="number"
                          value={settingsForm.budget}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, budget: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold">Start Date</label>
                      <Input
                        type="date"
                        value={settingsForm.startDate}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, startDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold">Target End Date</label>
                      <Input
                        type="date"
                        value={settingsForm.endDate}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold">Tags (comma-separated)</label>
                    <Input
                      value={settingsForm.tags}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, tags: e.target.value })
                      }
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="font-semibold gap-2">
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base font-bold text-destructive">Danger Zone</CardTitle>
                <CardDescription className="text-xs">
                  Irreversible actions for this workspace project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs">
                      {project.isArchived ? 'Unarchive Project' : 'Archive Project'}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Archived projects are set to read-only and hidden from active boards.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleToggleArchive} className="text-xs">
                    {project.isArchived ? 'Restore' : 'Archive'}
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-destructive/20">
                  <div>
                    <h4 className="font-bold text-xs text-destructive">Delete Project</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Permanently remove this project and its tasks.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-xs font-semibold"
                  >
                    Delete Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Milestone Modal */}
      <Dialog open={isAddMilestoneOpen} onOpenChange={setIsAddMilestoneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Add Roadmap Milestone</span>
            </DialogTitle>
            <DialogDescription>
              Create a new key milestone or delivery checkpoint for {project.name}.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAddMilestone} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Milestone Title *</label>
              <Input
                required
                placeholder="e.g. System Integration Testing Signoff"
                value={milestoneForm.title}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <textarea
                rows={2}
                placeholder="Criteria for completing this milestone..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                value={milestoneForm.description}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Target Due Date</label>
              <Input
                type="date"
                value={milestoneForm.dueDate}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })
                }
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMilestoneOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? 'Adding...' : 'Add Milestone'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>Assign Member to Workspace</span>
            </DialogTitle>
            <DialogDescription>
              Grant access and set project role permissions for a team member.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAddMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Select User *</label>
              <select
                required
                value={memberForm.userId}
                onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select team member...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.jobTitle || u.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Project Role</label>
              <select
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as any })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={PROJECT_ROLES.MANAGER}>Manager (Manage Settings, Milestones & Team)</option>
                <option value={PROJECT_ROLES.CONTRIBUTOR}>Contributor (Create & Update Tasks)</option>
                <option value={PROJECT_ROLES.VIEWER}>Viewer (Read-only)</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMemberOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !memberForm.userId} className="font-semibold">
                {isSubmitting ? 'Assigning...' : 'Assign Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirm Project Deletion</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{project.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isSubmitting}
              className="font-semibold"
            >
              {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
