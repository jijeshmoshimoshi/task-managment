'use client';

import React from 'react';
import Link from 'next/link';
import {
  Kanban,
  Zap,
  ShieldCheck,
  Bell,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  FolderKanban,
  CheckSquare,
  ShieldAlert,
  Clock,
  Layers,
  Lock,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Paperclip,
  Check,
  Building2,
  Laptop,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function HomePage() {

  const features = [
    {
      icon: Kanban,
      title: 'Interactive Kanban Boards',
      description:
        'Visualize project flow, manage task lifecycles, assign story points, and drag tasks across customizable workflow columns.',
      gradient: 'from-blue-500/20 to-indigo-500/20 text-blue-500 border-blue-500/30',
    },
    {
      icon: Zap,
      title: 'Sub-Second Real-Time Sync',
      description:
        'Instant live updates powered by WebSockets. Teammates see board movements, comments, and task modifications in real time.',
      gradient: 'from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30',
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise-Grade RBAC',
      description:
        'Granular role-based permissions for Super Admins, Project Managers, and Contributors with strict server-side policy enforcement.',
      gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-500 border-emerald-500/30',
    },
    {
      icon: Bell,
      title: 'Real-Time Notifications',
      description:
        'Stay ahead of deadlines with real-time in-app alerts, assignment mentions, status triggers, and automated worker notifications.',
      gradient: 'from-rose-500/20 to-pink-500/20 text-rose-500 border-rose-500/30',
    },
    {
      icon: ShieldAlert,
      title: 'Immutable Audit Logs',
      description:
        'Comprehensive security event tracking logging every user action, role change, and project alteration for compliance and governance.',
      gradient: 'from-purple-500/20 to-violet-500/20 text-purple-500 border-purple-500/30',
    },
    {
      icon: Building2,
      title: 'Multi-Department Workspaces',
      description:
        'Organize multiple squads and cross-functional teams under a unified workspace with customized departmental access rules.',
      gradient: 'from-sky-500/20 to-cyan-500/20 text-sky-500 border-sky-500/30',
    },
  ];

  const solutions = [
    {
      role: 'Engineering & Product Teams',
      icon: Laptop,
      badge: 'High Velocity',
      description:
        'Maintain rapid sprint momentum with flexible boards, subtask breakdowns, bug tracking, and real-time dependency resolution.',
      highlights: [
        'Sprint milestone management',
        'Subtask checklists & story estimates',
        'Real-time status changes without reloads',
        'Code and technical task linking',
      ],
    },
    {
      role: 'Project & Operations Managers',
      icon: FolderKanban,
      badge: 'Total Visibility',
      description:
        'Gain immediate clarity on deliverable timelines, team bandwidth, bottleneck detection, and project milestones.',
      highlights: [
        'Comprehensive multi-project dashboards',
        'Team workload and task distribution',
        'Automated due date alerts and priority tags',
        'Custom status pipelines and stages',
      ],
    },
    {
      role: 'Enterprise IT & Security Officers',
      icon: Lock,
      badge: 'Zero Trust',
      description:
        'Ensure rigorous compliance with multi-tenant data segregation, TOTP 2FA, session control, and full audit transparency.',
      highlights: [
        'Centralized RBAC policy governance',
        'Argon2id password hashing & TOTP 2FA',
        'Complete audit trails with IP tracking',
        'Session revocation and security controls',
      ],
    },
  ];

  const testimonials = [
    {
      quote:
        'TaskMaster replaced three disjointed tools for our engineering squad. The real-time synchronization and board speed are unmatched.',
      author: 'Sarah Chen',
      role: 'VP of Engineering',
      company: 'Apex Cloud Solutions',
      avatar: 'SC',
    },
    {
      quote:
        'The role-based security and audit logs gave our enterprise security team the confidence they needed to standardize on TaskMaster across 400+ employees.',
      author: 'Marcus Vance',
      role: 'Director of IT & Security',
      company: 'OmniCorp Global',
      avatar: 'MV',
    },
    {
      quote:
        'Our project turnaround times improved by 35% within the first month. The interface is clean, intuitive, and remarkably fast.',
      author: 'Elena Rostova',
      role: 'Lead Technical Product Manager',
      company: 'Hyperion Labs',
      avatar: 'ER',
    },
  ];

  const stats = [
    { value: '99.99%', label: 'Uptime Reliability', sub: 'High-availability infrastructure' },
    { value: '< 100ms', label: 'Real-Time Latency', sub: 'Instant WebSocket sync' },
    { value: '500k+', label: 'Tasks Orchestrated', sub: 'Across enterprise workspaces' },
    { value: '3.5x', label: 'Velocity Increase', sub: 'Average reported by engineering teams' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b">
        {/* Background decorative grid & gradient glows */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[130px] -z-10 rounded-full pointer-events-none" />

        <div className="container flex flex-col items-center text-center">
          {/* Top Announcement Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-8 shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>TaskMaster 2.0 • The Modern Work Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl max-w-5xl bg-gradient-to-b from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-[1.1]">
            Orchestrate work with speed, clarity, and precision.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            The unified project and task management platform that empowers high-velocity teams to plan, collaborate, and execute complex workflows in real time.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="gap-2.5 font-bold shadow-lg shadow-primary/25 px-8 h-12 text-base">
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="gap-2 font-medium px-6 h-12 text-base">
                <span>Explore Features</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
          </div>

          {/* Value Props Strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Real-time WebSocket sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Role-based access control</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
          </div>

          {/* Interactive UI Showcase Preview */}
          <div className="mt-16 w-full max-w-6xl rounded-2xl border bg-card/80 p-3 sm:p-5 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            <div className="rounded-xl border bg-background overflow-hidden shadow-inner">
              {/* Mock Window Top Bar */}
              <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-muted-foreground hidden sm:inline-block">
                    TaskMaster Workspace • Sprint 24
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Synced</span>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                    TM
                  </div>
                </div>
              </div>

              {/* Mock Workspace Content */}
              <div className="p-4 sm:p-6 text-left">
                {/* Board Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight">Core Platform & Infrastructure</h2>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                        In Progress
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cross-functional sprint deliverable • 12 active tasks
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden mr-2">
                      <div className="inline-block h-7 w-7 rounded-full ring-2 ring-background bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                        AL
                      </div>
                      <div className="inline-block h-7 w-7 rounded-full ring-2 ring-background bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                        JD
                      </div>
                      <div className="inline-block h-7 w-7 rounded-full ring-2 ring-background bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        RK
                      </div>
                    </div>
                    <Button size="sm" className="h-8 text-xs font-semibold">
                      + New Task
                    </Button>
                  </div>
                </div>

                {/* Mock Kanban Board Columns */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                  {/* Column 1: Backlog */}
                  <div className="flex flex-col gap-3 p-3 rounded-xl bg-muted/40 border border-dashed">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-slate-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">To Do</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                    </div>

                    {/* Task Card */}
                    <div className="p-3.5 rounded-lg border bg-card shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5">
                          Medium
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-104</span>
                      </div>
                      <h4 className="text-xs font-semibold line-clamp-2">OAuth2 SSO & SAML Authentication Setup</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> 2/4</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 3</span>
                        </div>
                        <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[9px] font-bold">
                          AL
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/5">
                          Low
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-108</span>
                      </div>
                      <h4 className="text-xs font-semibold line-clamp-2">API Documentation for v2 Endpoints</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> 2</span>
                        </div>
                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[9px] font-bold">
                          JD
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="flex flex-col gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">In Progress</span>
                      </div>
                      <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">2</span>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card shadow-sm border-primary/40 relative">
                      <div className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Urgent
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-092</span>
                      </div>
                      <h4 className="text-xs font-semibold line-clamp-2">Real-Time WebSocket Event Stream</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-primary font-medium"><CheckSquare className="h-3 w-3" /> 4/5</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 8</span>
                        </div>
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">
                          RK
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/5">
                          High
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-097</span>
                      </div>
                      <h4 className="text-xs font-semibold line-clamp-2">Department & Team Access Matrix</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> 1/3</span>
                        </div>
                        <div className="h-5 w-5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[9px] font-bold">
                          AL
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Review */}
                  <div className="flex flex-col gap-3 p-3 rounded-xl bg-muted/40 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">In Review</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5">
                          Medium
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-089</span>
                      </div>
                      <h4 className="text-xs font-semibold line-clamp-2">Automated Background Email Workers</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> 3/3</span>
                          <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> 1</span>
                        </div>
                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[9px] font-bold">
                          JD
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Completed */}
                  <div className="flex flex-col gap-3 p-3 rounded-xl bg-muted/40 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card/60 shadow-sm opacity-85">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                          Done
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-074</span>
                      </div>
                      <h4 className="text-xs font-semibold line-through text-muted-foreground">Multi-Tenant Database Isolation</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> 100% complete
                        </span>
                        <div className="h-5 w-5 rounded-full bg-slate-500/20 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                          RK
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-card/60 shadow-sm opacity-85">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/5">
                          Done
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">TM-071</span>
                      </div>
                      <h4 className="text-xs font-semibold line-through text-muted-foreground">Argon2id Password Security Hardening</h4>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> 100% complete
                        </span>
                        <div className="h-5 w-5 rounded-full bg-slate-500/20 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                          AL
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trusted Logos */}
      <section className="py-12 border-b bg-muted/20">
        <div className="container text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Trusted by forward-thinking product and engineering teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all">
            <span className="text-lg font-black tracking-tighter">HYPERION</span>
            <span className="text-lg font-bold tracking-tight">NEXUS<span className="text-primary">FLOW</span></span>
            <span className="text-lg font-extrabold italic">VELOCITY.AI</span>
            <span className="text-lg font-semibold tracking-wider">CLOUDPULSE</span>
            <span className="text-lg font-black tracking-tight">QUANTUM<span className="text-primary font-light">STACK</span></span>
            <span className="text-lg font-bold tracking-tight">APEX LABS</span>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-24 container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs text-primary border-primary/30 bg-primary/5">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything your team needs to ship on schedule.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg">
            Built from the ground up for speed, reliability, and security without complex configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="border transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5">
                <CardHeader>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${f.gradient} mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-bold">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed mt-2 text-muted-foreground">
                    {f.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Interactive Workflow Tabs */}
      <section id="workflow" className="py-20 border-y bg-muted/10">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="mb-3 px-3 py-1 text-xs text-primary border-primary/30 bg-primary/5">
              Workflows in Action
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Engineered for seamless collaboration.
            </h2>
            <p className="mt-4 text-muted-foreground text-base">
              Explore how TaskMaster streamlines every step of your project lifecycle.
            </p>
          </div>

          <Tabs defaultValue="kanban" className="w-full max-w-5xl mx-auto">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/70">
                <TabsTrigger value="kanban" className="py-2.5 text-xs sm:text-sm font-semibold">
                  <Kanban className="h-4 w-4 mr-2" /> Kanban Board
                </TabsTrigger>
                <TabsTrigger value="realtime" className="py-2.5 text-xs sm:text-sm font-semibold">
                  <Zap className="h-4 w-4 mr-2" /> Live Sync
                </TabsTrigger>
                <TabsTrigger value="security" className="py-2.5 text-xs sm:text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 mr-2" /> Roles & RBAC
                </TabsTrigger>
                <TabsTrigger value="audit" className="py-2.5 text-xs sm:text-sm font-semibold">
                  <ShieldAlert className="h-4 w-4 mr-2" /> Audit Trail
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="kanban" className="mt-0">
              <Card className="border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Fluid Task Progression & Sprint Management</CardTitle>
                  <CardDescription>
                    Organize deliverables by priority, assignees, deadlines, and milestones.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                        <CheckSquare className="h-4 w-4" /> Subtasks & Checklists
                      </div>
                      <p className="text-xs text-muted-foreground">Break complex tickets into manageable, trackable steps.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                        <Clock className="h-4 w-4" /> Due Dates & Alerts
                      </div>
                      <p className="text-xs text-muted-foreground">Never miss a deliverable with automated SLA reminders.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
                        <Flame className="h-4 w-4" /> Story Points & Priority
                      </div>
                      <p className="text-xs text-muted-foreground">Prioritize urgent fixes and balance sprint capacity.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="realtime" className="mt-0">
              <Card className="border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Zero-Lag Collaborative Workspace</CardTitle>
                  <CardDescription>
                    All workspace members see immediate changes without manual refreshes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm mb-1">
                        <Zap className="h-4 w-4" /> WebSocket Streams
                      </div>
                      <p className="text-xs text-muted-foreground">Sub-millisecond event dispatch across all connected users.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm mb-1">
                        <Bell className="h-4 w-4" /> In-App Notification Hub
                      </div>
                      <p className="text-xs text-muted-foreground">Instant popover alerts for mentions, comments, and reviews.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm mb-1">
                        <Users className="h-4 w-4" /> Active Team Presence
                      </div>
                      <p className="text-xs text-muted-foreground">Know who is online and actively updating tasks.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <Card className="border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Granular Role-Based Access Control</CardTitle>
                  <CardDescription>
                    Enforce the principle of least privilege across your entire organization.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-rose-500 font-semibold text-sm mb-1">
                        <ShieldCheck className="h-4 w-4" /> Super Admin
                      </div>
                      <p className="text-xs text-muted-foreground">Workspace ownership, audit logs, and security controls.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-indigo-500 font-semibold text-sm mb-1">
                        <Users className="h-4 w-4" /> Project Admin
                      </div>
                      <p className="text-xs text-muted-foreground">Manage project scopes, invite members, and assign tasks.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-sky-500 font-semibold text-sm mb-1">
                        <Kanban className="h-4 w-4" /> Contributor / Member
                      </div>
                      <p className="text-xs text-muted-foreground">Execute assigned tasks, update checklists, and log progress.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <Card className="border shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Comprehensive Audit & Compliance Logging</CardTitle>
                  <CardDescription>
                    Track every critical change with immutable timestamps and user attribution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-purple-500 font-semibold text-sm mb-1">
                        <ShieldAlert className="h-4 w-4" /> Security Events
                      </div>
                      <p className="text-xs text-muted-foreground">Logins, password updates, 2FA triggers, and failed attempts.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-purple-500 font-semibold text-sm mb-1">
                        <FolderKanban className="h-4 w-4" /> Project Modifications
                      </div>
                      <p className="text-xs text-muted-foreground">Task deletions, permission reassignments, and status shifts.</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <div className="flex items-center gap-2 text-purple-500 font-semibold text-sm mb-1">
                        <Lock className="h-4 w-4" /> IP & Session Tracking
                      </div>
                      <p className="text-xs text-muted-foreground">Complete forensic metadata for SOC2 and enterprise reviews.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Solutions by Role */}
      <section id="solutions" className="py-24 container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs text-primary border-primary/30 bg-primary/5">
            Tailored Solutions
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Designed for every role in your organization.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg">
            Empower every stakeholder with the exact tools and visibility they need to succeed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {solutions.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.role} className="border flex flex-col justify-between hover:border-primary/40 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-semibold">
                      {s.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">{s.role}</CardTitle>
                  <CardDescription className="text-sm mt-2 leading-relaxed">
                    {s.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="space-y-2.5 border-t pt-4">
                    {s.highlights.map((h) => (
                      <div key={h} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Enterprise Security Section */}
      <section id="security" className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="container relative z-10">
          <div className="max-w-3xl mb-14">
            <Badge variant="outline" className="mb-3 px-3 py-1 text-xs text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
              Enterprise Security & Trust
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
              Bank-grade security by design.
            </h2>
            <p className="mt-4 text-slate-300 text-base sm:text-lg">
              Protect your intellectual property and sensitive corporate data with modern cryptographic standards and multi-tenant isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <Lock className="h-8 w-8 text-indigo-400 mb-3" />
              <h3 className="font-bold text-base text-white">Argon2id & TOTP 2FA</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                State-of-the-art password hashing and authenticator-based two-factor authentication.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mb-3" />
              <h3 className="font-bold text-base text-white">Multi-Tenant Isolation</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Complete data separation between organizations with strict query-level tenancy filters.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <ShieldAlert className="h-8 w-8 text-amber-400 mb-3" />
              <h3 className="font-bold text-base text-white">Immutable Audit Trail</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Granular logging of all administrative actions, logins, and project modifications.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <TrendingUp className="h-8 w-8 text-sky-400 mb-3" />
              <h3 className="font-bold text-base text-white">99.99% Availability</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Redundant infrastructure with automatic failover and reliable performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="py-16 border-b bg-muted/20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">{s.value}</span>
                <span className="text-sm font-semibold mt-1 text-foreground">{s.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{s.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section id="testimonials" className="py-24 container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs text-primary border-primary/30 bg-primary/5">
            Customer Stories
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Loved by teams who build the future.
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            See how forward-thinking leaders scale their delivery velocity with TaskMaster.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <Card key={t.author} className="border flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <p className="text-sm text-foreground/90 italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </CardContent>
              <div className="p-6 pt-0 border-t mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{t.author}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {t.role} • {t.company}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Pre-Footer Call to Action */}
      <section className="py-20 relative overflow-hidden border-t bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container text-center max-w-3xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 mx-auto mb-6">
            <Layers className="h-7 w-7" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to streamline your team&apos;s workflow?
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg">
            Join modern organizations delivering projects on time with TaskMaster. Start your free trial today.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="gap-2 font-bold px-8 h-12 shadow-lg shadow-primary/25">
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-6 h-12 font-medium">
                Sign In to Workspace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Production Footer */}
      <footer className="border-t bg-card/60 text-muted-foreground text-xs">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2 font-bold text-foreground text-base">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Layers className="h-4 w-4" />
                </div>
                <span>TaskMaster</span>
              </Link>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                The enterprise project and task management platform. Orchestrate sprints, automate workflows, and collaborate in real-time.
              </p>
              <div className="text-[11px] text-muted-foreground font-medium">
                Enterprise Edition • SOC2 Compliant Ready
              </div>
            </div>

            {/* Column 1: Product */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Kanban Boards</Link></li>
                <li><Link href="#workflow" className="hover:text-foreground transition-colors">Real-Time Sync</Link></li>
                <li><Link href="#security" className="hover:text-foreground transition-colors">RBAC Governance</Link></li>
                <li><Link href="#features" className="hover:text-foreground transition-colors">Notifications</Link></li>
                <li><Link href="#workflow" className="hover:text-foreground transition-colors">Audit Logging</Link></li>
              </ul>
            </div>

            {/* Column 2: Solutions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Solutions</h4>
              <ul className="space-y-2">
                <li><Link href="#solutions" className="hover:text-foreground transition-colors">Engineering</Link></li>
                <li><Link href="#solutions" className="hover:text-foreground transition-colors">Product Management</Link></li>
                <li><Link href="#solutions" className="hover:text-foreground transition-colors">IT & Security</Link></li>
                <li><Link href="#solutions" className="hover:text-foreground transition-colors">Operations</Link></li>
              </ul>
            </div>

            {/* Column 3: Company & Trust */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#security" className="hover:text-foreground transition-colors">Security Overview</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} TaskMaster Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#security" className="hover:text-foreground transition-colors">Security</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Status</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
