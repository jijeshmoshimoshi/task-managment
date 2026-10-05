'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Users,
  PlusCircle,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data?.data;
    },
  });

  if (!user) return null;

  const kpis = analyticsData?.kpis || {
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    totalLoggedHours: 0,
    activeUsersCount: 0,
    onTrackProjectsCount: 0,
    atRiskProjectsCount: 0,
  };

  const velocityTrend = analyticsData?.velocityTrend || [];
  const statusBreakdown = analyticsData?.statusBreakdown || [];
  const priorityBreakdown = analyticsData?.priorityBreakdown || [];
  const memberWorkload = analyticsData?.memberWorkload || [];
  const recentProjects = analyticsData?.recentProjects || [];
  const activityFeed = analyticsData?.activityFeed || [];

  return (
    <div className="space-y-8 pb-10">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Executive Command Center
            </h1>
            <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
              {user.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {organization?.name || 'Workspace'} &bull; Welcome back, {user.firstName}!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/tasks/my">
            <Button variant="outline" size="sm" className="gap-1.5">
              <CheckSquare className="h-4 w-4 text-primary" />
              My Work
            </Button>
          </Link>
          <Link href="/projects">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <PlusCircle className="h-4 w-4" />
              Explore Projects
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Projects */}
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Projects</span>
              <FolderKanban className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : kpis.totalProjects}
            </div>
            <div className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" />
              <span>{kpis.onTrackProjectsCount} on track</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Tasks */}
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Tasks</span>
              <CheckSquare className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : kpis.totalTasks}
            </div>
            <div className="text-[11px] text-blue-500 font-medium">
              {kpis.inProgressTasks} in progress
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Completion</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${kpis.completionRate}%`}
            </div>
            <Progress value={kpis.completionRate} className="h-1.5 bg-muted" />
          </CardContent>
        </Card>

        {/* Hours Logged */}
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Time Tracked</span>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${kpis.totalLoggedHours}h`}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">Billable & effort</div>
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : kpis.overdueTasks}
            </div>
            <div className={`text-[11px] font-medium ${kpis.overdueTasks > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {kpis.overdueTasks > 0 ? 'Requires attention' : 'All deadlines met'}
            </div>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card className="border shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Team</span>
              <Users className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : kpis.activeUsersCount}
            </div>
            <div className="text-[11px] text-muted-foreground">Active seats</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Velocity Trend Area Chart */}
        <Card className="lg:col-span-2 border">
          <CardHeader className="p-5 pb-2 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Task Velocity & Delivery Trend
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Daily task creation vs resolution velocity over the last 7 days.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">
              7 Days
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {mounted && velocityTrend.length > 0 ? (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name="Created"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#createdGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#completedGrad)"
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                Loading velocity trend data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Breakdown Donut Chart */}
        <Card className="border">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Priority Distribution
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Task urgency breakdown across all projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {mounted && priorityBreakdown.length > 0 ? (
              <div className="h-[260px] w-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={priorityBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {priorityBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  {priorityBreakdown.map((p: any) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-muted-foreground">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-foreground">{p.name}:</span>
                      <span>{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                Loading priority distribution...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Status Pipeline & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pipeline Breakdown Bar Chart */}
        <Card className="border">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Workflow Pipeline Status
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Distribution of tasks across Kanban workflow columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {mounted && statusBreakdown.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusBreakdown.map((entry: any, index: number) => (
                        <Cell key={`bar-${index}`} fill={entry.color || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                Loading status pipeline...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Workload Bar Chart */}
        <Card className="border">
          <CardHeader className="p-5 pb-2 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Team Capacity & Workload
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Open tasks vs completed assignments per team member.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            {mounted && memberWorkload.length > 0 ? (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberWorkload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="open" name="Open Tasks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                No active member task assignments recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Recent Projects Portfolio & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects Portfolio */}
        <Card className="lg:col-span-2 border">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Active Project Portfolio</CardTitle>
              <CardDescription className="text-xs">
                Key milestones progress and delivery health metrics.
              </CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No projects created yet. Launch your first project workspace.
              </div>
            ) : (
              <div className="divide-y">
                {recentProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: project.coverColor || '#6366f1' }}
                      >
                        {project.key}
                      </div>
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-semibold text-sm hover:text-primary transition-colors block text-foreground"
                        >
                          {project.name}
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{project.status}</span>
                          <span>&bull;</span>
                          <span>
                            {project.completedMilestones}/{project.totalMilestones} Milestones
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-1.5" />
                      </div>

                      <Badge
                        variant={
                          project.health === 'ON_TRACK'
                            ? 'success'
                            : project.health === 'AT_RISK'
                            ? 'warning'
                            : 'destructive'
                        }
                        className="text-[10px] shrink-0 font-medium"
                      >
                        {project.health.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Workspace Activity Feed */}
        <Card className="border">
          <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Live Activity Feed
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time workspace events & audits.
              </CardDescription>
            </div>
            <Link href="/audit-logs">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                Audit Trail <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            {activityFeed.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {activityFeed.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 text-xs">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {item.actorName ? item.actorName[0].toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="text-foreground leading-snug flex items-center flex-wrap gap-1.5">
                        <span className="font-semibold">{item.actorName || 'User'}</span>
                        <span className="text-muted-foreground">performed</span>
                        <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 h-4">
                          {item.action}
                        </Badge>
                      </div>
                      {item.resourceTitle && (
                        <p className="text-[11px] text-muted-foreground truncate font-medium">
                          {item.resourceTitle}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Architecture Status */}
      <Card className="border bg-muted/20">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-sm font-bold">Enterprise Security & Multi-Tenancy Active</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Isolated tenant boundaries, Argon2id security credentials, and tamper-evident audit logging active across all workspaces.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
