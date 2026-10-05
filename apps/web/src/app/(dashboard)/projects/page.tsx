'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Archive,
  ArrowRight,
  TrendingUp,
  Briefcase,
} from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  ROLES,
} from '@taskmaster/shared';


interface IProjectItem {
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
  members: Array<{
    userId: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
      role: string;
      jobTitle?: string;
    };
    role: string;
    joinedAt: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    dueDate?: string;
  }>;
  stats?: {
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  };
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLOR_PRESETS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#ef4444', // Red
];

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canViewBudget = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const [projects, setProjects] = useState<IProjectItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<IProjectItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    client: '',
    startDate: '',
    endDate: '',
    priority: PROJECT_PRIORITIES.MEDIUM,
    status: PROJECT_STATUSES.PLANNING,
    budget: '',
    coverColor: '#3b82f6',
    tags: '',
  });

  const [duplicateData, setDuplicateData] = useState({
    name: '',
    key: '',
    copyMembers: true,
    copyMilestones: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (healthFilter !== 'ALL') params.append('health', healthFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (myProjectsOnly) params.append('myProjectsOnly', 'true');
      if (showArchived) params.append('isArchived', 'true');

      const res = await apiClient.get<{ success: boolean; data: IProjectItem[] }>(
        `/projects?${params.toString()}`,
      );
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, healthFilter, priorityFilter, myProjectsOnly, showArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle Project Creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: formData.name.trim(),
        key: formData.key.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        client: formData.client.trim() || undefined,
        priority: formData.priority,
        status: formData.status,
        coverColor: formData.coverColor,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      if (formData.startDate) payload.startDate = new Date(formData.startDate).toISOString();
      if (formData.endDate) payload.endDate = new Date(formData.endDate).toISOString();
      if (formData.budget) payload.budget = Number(formData.budget);

      const res = await apiClient.post<{ success: boolean; data: IProjectItem }>(
        '/projects',
        payload,
      );

      if (res.data.success) {
        setIsCreateOpen(false);
        setFormData({
          name: '',
          key: '',
          description: '',
          client: '',
          startDate: '',
          endDate: '',
          priority: PROJECT_PRIORITIES.MEDIUM,
          status: PROJECT_STATUSES.PLANNING,
          budget: '',
          coverColor: '#3b82f6',
          tags: '',
        });
        fetchProjects();
        router.push(`/projects/${res.data.data.id}`);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Project Duplication
  const handleDuplicateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.post<{ success: boolean; data: IProjectItem }>(
        `/projects/${selectedProject.id}/duplicate`,
        {
          name: duplicateData.name.trim(),
          key: duplicateData.key.trim().toUpperCase(),
          copyMembers: duplicateData.copyMembers,
          copyMilestones: duplicateData.copyMilestones,
        },
      );

      if (res.data.success) {
        setIsDuplicateOpen(false);
        fetchProjects();
        router.push(`/projects/${res.data.data.id}`);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to duplicate project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Archive / Unarchive
  const handleToggleArchive = async (project: IProjectItem) => {
    try {
      await apiClient.post(`/projects/${project.id}/archive`);
      fetchProjects();
    } catch (err) {
      console.error('Failed to toggle archive status:', err);
    }
  };

  // Stats calculation
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === PROJECT_STATUSES.ACTIVE).length;
  const onTrackProjects = projects.filter((p) => p.health === PROJECT_HEALTH.ON_TRACK).length;
  const atRiskProjects = projects.filter(
    (p) => p.health === PROJECT_HEALTH.AT_RISK || p.health === PROJECT_HEALTH.DELAYED,
  ).length;
  const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);

  const getHealthBadge = (health: string) => {
    switch (health) {
      case PROJECT_HEALTH.ON_TRACK:
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            On Track
          </Badge>
        );
      case PROJECT_HEALTH.AT_RISK:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            At Risk
          </Badge>
        );
      case PROJECT_HEALTH.DELAYED:
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Delayed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{health}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case PROJECT_PRIORITIES.URGENT:
        return <Badge variant="destructive">Urgent</Badge>;
      case PROJECT_PRIORITIES.HIGH:
        return <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">High</Badge>;
      case PROJECT_PRIORITIES.MEDIUM:
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">Projects & Workspaces</h1>
            <Badge variant="outline" className="font-mono text-xs">
              Phase 4 Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise initiatives, milestone deliverables, team assignments, and health telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
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
            onClick={() => {
              setFormError(null);
              setIsCreateOpen(true);
            }}
            className="shadow-md shadow-primary/20 gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className={`grid grid-cols-2 ${canViewBudget ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Initiatives</p>
              <p className="text-2xl font-bold mt-1">{totalProjects}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Execution</p>
              <p className="text-2xl font-bold mt-1 text-blue-500">{activeProjects}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">On Track</p>
              <p className="text-2xl font-bold mt-1 text-emerald-500">{onTrackProjects}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">At Risk / Delayed</p>
              <p className="text-2xl font-bold mt-1 text-amber-500">{atRiskProjects}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {canViewBudget && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/60 col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Budget</p>
                <p className="text-2xl font-bold mt-1 text-indigo-500">
                  ${totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="p-4 bg-card/40 backdrop-blur-sm border-border/60">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, key, client..."
              className="pl-9 bg-background/80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background/80 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value={PROJECT_STATUSES.ACTIVE}>Active</option>
              <option value={PROJECT_STATUSES.PLANNING}>Planning</option>
              <option value={PROJECT_STATUSES.ON_HOLD}>On Hold</option>
              <option value={PROJECT_STATUSES.COMPLETED}>Completed</option>
              <option value={PROJECT_STATUSES.ARCHIVED}>Archived</option>
            </select>

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background/80 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Health</option>
              <option value={PROJECT_HEALTH.ON_TRACK}>On Track</option>
              <option value={PROJECT_HEALTH.AT_RISK}>At Risk</option>
              <option value={PROJECT_HEALTH.DELAYED}>Delayed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background/80 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Priorities</option>
              <option value={PROJECT_PRIORITIES.URGENT}>Urgent</option>
              <option value={PROJECT_PRIORITIES.HIGH}>High</option>
              <option value={PROJECT_PRIORITIES.MEDIUM}>Medium</option>
              <option value={PROJECT_PRIORITIES.LOW}>Low</option>
            </select>

            <Button
              variant={myProjectsOnly ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setMyProjectsOnly(!myProjectsOnly)}
              className="text-xs h-9"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              My Projects
            </Button>

            <Button
              variant={showArchived ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs h-9"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Projects Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40 border-border/40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl border-dashed bg-muted/10 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg">No projects match criteria</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search queries or filter tags, or create a brand new workspace project.
          </p>
          <Button
            onClick={() => {
              setFormError(null);
              setIsCreateOpen(true);
            }}
            size="sm"
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Project
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const completedMilestones =
              project.milestones?.filter((m) => m.isCompleted).length || 0;
            const totalMilestones = project.milestones?.length || 0;
            const milestoneProgress =
              totalMilestones > 0
                ? Math.round((completedMilestones / totalMilestones) * 100)
                : 0;

            return (
              <Card
                key={project.id}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 flex flex-col justify-between bg-card/60 backdrop-blur-sm"
              >
                {/* Top Accent Strip */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: project.coverColor || '#3b82f6' }}
                />

                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  {/* Top Bar with Key, Name & Health */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                          {project.key}
                        </span>
                        {getHealthBadge(project.health)}
                      </div>
                      {getPriorityBadge(project.priority)}
                    </div>

                    <Link href={`/projects/${project.id}`}>
                      <h3 className="font-bold text-lg tracking-tight mt-2.5 group-hover:text-primary transition-colors line-clamp-1">
                        {project.name}
                      </h3>
                    </Link>

                    {project.client && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{project.client}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground/90 mt-2 line-clamp-2">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {project.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Milestones & Progress */}
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Milestones
                      </span>
                      <span className="font-semibold font-mono">
                        {completedMilestones}/{totalMilestones} ({milestoneProgress}%)
                      </span>
                    </div>
                    <Progress value={milestoneProgress} className="h-1.5" />
                  </div>

                  {/* Bottom Footer Details */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    {/* Team Stack */}
                    <div className="flex items-center -space-x-2">
                      {project.members?.slice(0, 4).map((m, idx) => (
                        <div
                          key={idx}
                          title={m.userId?.name || 'Member'}
                          className="h-7 w-7 rounded-full border-2 border-background bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm"
                        >
                          {m.userId?.name ? m.userId.name.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                      ))}
                      {project.members && project.members.length > 4 && (
                        <div className="h-7 w-7 rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                          +{project.members.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Actions & Workspace Link */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplicate Project"
                        onClick={() => {
                          setSelectedProject(project);
                          setDuplicateData({
                            name: `${project.name} (Copy)`,
                            key: `${project.key}2`.slice(0, 6),
                            copyMembers: true,
                            copyMilestones: true,
                          });
                          setIsDuplicateOpen(true);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title={project.isArchived ? 'Unarchive' : 'Archive'}
                        onClick={() => handleToggleArchive(project)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>

                      <Link href={`/projects/${project.id}`}>
                        <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 font-semibold">
                          <span>Workspace</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List Mode Table */
        <Card className="overflow-hidden bg-card/60 backdrop-blur-sm border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Key & Project</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  {canViewBudget && <th className="py-3 px-4">Budget</th>}
                  <th className="py-3 px-4">Milestones</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-1.5 rounded-full"
                          style={{ backgroundColor: project.coverColor || '#3b82f6' }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted border">
                              {project.key}
                            </span>
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                            >
                              {project.name}
                            </Link>
                          </div>
                          {project.client && (
                            <span className="text-[11px] text-muted-foreground">{project.client}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getHealthBadge(project.health)}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {project.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">{getPriorityBadge(project.priority)}</td>
                    {canViewBudget && (
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {project.budget ? `$${project.budget.toLocaleString()}` : '—'}
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <span className="font-mono">
                        {project.milestones?.filter((m) => m.isCompleted).length || 0} /{' '}
                        {project.milestones?.length || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center -space-x-2">
                        {project.members?.slice(0, 3).map((m, idx) => (
                          <div
                            key={idx}
                            title={m.userId?.name || 'Member'}
                            className="h-6 w-6 rounded-full border border-background bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold"
                          >
                            {m.userId?.name ? m.userId.name.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/projects/${project.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold gap-1">
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <span>Create New Project Workspace</span>
            </DialogTitle>
            <DialogDescription>
              Initialize a project for team tracking, sprint board management, and milestones.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold">Project Name *</label>
                <Input
                  required
                  placeholder="e.g. Next-Gen API Gateway"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoKey = name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 5);
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      key: prev.key ? prev.key : autoKey,
                    }));
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Project Key *</label>
                <Input
                  required
                  maxLength={8}
                  placeholder="e.g. GW"
                  className="font-mono uppercase font-bold"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({ ...formData, key: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Client / Business Unit</label>
              <Input
                placeholder="e.g. Enterprise Cloud Operations"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <textarea
                rows={3}
                placeholder="High-level goal, technical scope, and key deliverables..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Target End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={PROJECT_STATUSES.PLANNING}>Planning</option>
                  <option value={PROJECT_STATUSES.ACTIVE}>Active</option>
                  <option value={PROJECT_STATUSES.ON_HOLD}>On Hold</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
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
                  <label className="text-xs font-semibold">Budget ($ USD)</label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Color Palette */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Theme Color</label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, coverColor: color })}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      formData.coverColor === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Tags (comma-separated)</label>
              <Input
                placeholder="architecture, cloud, q3-goal"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Project Dialog */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              <span>Duplicate Project Workspace</span>
            </DialogTitle>
            <DialogDescription>
              Create a clone of {selectedProject?.name} with its milestones and assigned team members.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleDuplicateProject} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">New Project Name *</label>
              <Input
                required
                value={duplicateData.name}
                onChange={(e) => setDuplicateData({ ...duplicateData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">New Project Key *</label>
              <Input
                required
                maxLength={8}
                className="font-mono uppercase font-bold"
                value={duplicateData.key}
                onChange={(e) =>
                  setDuplicateData({
                    ...duplicateData,
                    key: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateData.copyMembers}
                  onChange={(e) =>
                    setDuplicateData({
                      ...duplicateData,
                      copyMembers: e.target.checked,
                    })
                  }
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Copy project team members and role assignments</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateData.copyMilestones}
                  onChange={(e) =>
                    setDuplicateData({
                      ...duplicateData,
                      copyMilestones: e.target.checked,
                    })
                  }
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Copy project milestone roadmap & phase structures</span>
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDuplicateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? 'Duplicating...' : 'Duplicate Workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
