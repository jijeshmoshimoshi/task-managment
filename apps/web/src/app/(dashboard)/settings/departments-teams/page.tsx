'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users2,
  Plus,
  Edit2,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROLES } from '@taskmaster/shared';

interface IDepartment {
  id: string;
  name: string;
  description?: string;
  leadId?: string;
  lead?: { id: string; firstName: string; lastName: string; email: string };
  userCount?: number;
  teamCount?: number;
}

interface ITeam {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  department?: { id: string; name: string };
  leadId?: string;
  lead?: { id: string; firstName: string; lastName: string; email: string };
  memberIds: string[];
  members?: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  memberCount?: number;
}

interface IUserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function DepartmentsAndTeamsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const [activeTab, setActiveTab] = useState<'departments' | 'teams'>('departments');
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [users, setUsers] = useState<IUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<IDepartment | null>(null);
  const [editingTeam, setEditingTeam] = useState<ITeam | null>(null);

  // Form States
  const [deptForm, setDeptForm] = useState({ name: '', description: '', leadId: '' });
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    leadId: '',
    memberIds: [] as string[],
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [deptRes, teamRes, userRes] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/teams'),
        apiClient.get('/users?limit=100'),
      ]);

      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (teamRes.data?.success) setTeams(teamRes.data.data);
      if (userRes.data?.success) setUsers(userRes.data.data);
    } catch (err: any) {
      console.error('Failed to load department and team data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Department Submit
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (editingDept) {
        await apiClient.patch(`/departments/${editingDept.id}`, deptForm);
        setSuccessMsg(`Department '${deptForm.name}' updated successfully.`);
      } else {
        await apiClient.post('/departments', deptForm);
        setSuccessMsg(`Department '${deptForm.name}' created successfully.`);
      }
      setIsDeptModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Department
  const handleDeleteDept = async (dept: IDepartment) => {
    if (!confirm(`Are you sure you want to delete department '${dept.name}'?`)) return;
    try {
      await apiClient.delete(`/departments/${dept.id}`);
      setSuccessMsg(`Department '${dept.name}' deleted.`);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete department');
    }
  };

  // Handle Team Submit
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (editingTeam) {
        await apiClient.patch(`/teams/${editingTeam.id}`, teamForm);
        setSuccessMsg(`Team '${teamForm.name}' updated successfully.`);
      } else {
        await apiClient.post('/teams', teamForm);
        setSuccessMsg(`Team '${teamForm.name}' created successfully.`);
      }
      setIsTeamModalOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save team');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async (team: ITeam) => {
    if (!confirm(`Are you sure you want to delete team '${team.name}'?`)) return;
    try {
      await apiClient.delete(`/teams/${team.id}`);
      setSuccessMsg(`Team '${team.name}' deleted.`);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete team');
    }
  };

  const openAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: '', description: '', leadId: '' });
    setIsDeptModalOpen(true);
  };

  const openEditDept = (d: IDepartment) => {
    setEditingDept(d);
    setDeptForm({
      name: d.name,
      description: d.description || '',
      leadId: d.leadId || '',
    });
    setIsDeptModalOpen(true);
  };

  const openAddTeam = () => {
    setEditingTeam(null);
    setTeamForm({
      name: '',
      description: '',
      departmentId: '',
      leadId: '',
      memberIds: [],
    });
    setIsTeamModalOpen(true);
  };

  const openEditTeam = (t: ITeam) => {
    setEditingTeam(t);
    setTeamForm({
      name: t.name,
      description: t.description || '',
      departmentId: t.departmentId || '',
      leadId: t.leadId || '',
      memberIds: t.memberIds || [],
    });
    setIsTeamModalOpen(true);
  };

  const toggleTeamMember = (userId: string) => {
    if (teamForm.memberIds.includes(userId)) {
      setTeamForm({
        ...teamForm,
        memberIds: teamForm.memberIds.filter((id) => id !== userId),
      });
    } else {
      setTeamForm({
        ...teamForm,
        memberIds: [...teamForm.memberIds, userId],
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading departments and teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments & Teams</h1>
          <p className="text-sm text-muted-foreground">
            Structure your organization into functional departments and cross-functional project teams.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'departments' ? (
              <Button onClick={openAddDept} className="gap-2 shadow-sm font-medium">
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </Button>
            ) : (
              <Button onClick={openAddTeam} className="gap-2 shadow-sm font-medium">
                <Plus className="h-4 w-4" />
                <span>Add Team</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccessMsg(null)} className="h-6 px-2 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button variant="ghost" size="sm" onClick={() => setErrorMsg(null)} className="h-6 px-2 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'departments'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'teams'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users2 className="h-4 w-4" />
          <span>Teams ({teams.length})</span>
        </button>
      </div>

      {/* Departments Tab Content */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.length === 0 ? (
            <Card className="col-span-full shadow-none border-border/60 p-8 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">No departments yet</p>
              <p className="text-xs">Create your first department to organize employees.</p>
            </Card>
          ) : (
            departments.map((dept) => (
              <Card key={dept.id} className="shadow-none border-border/60 hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold">{dept.name}</CardTitle>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDept(dept)}
                          className="h-7 w-7 text-muted-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDept(dept)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {dept.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {dept.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>Head of Department:</span>
                    </span>
                    <span className="font-medium text-foreground">
                      {dept.lead ? `${dept.lead.firstName} ${dept.lead.lastName}` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>Assigned Members:</span>
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {dept.userCount || 0} Members
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Teams Tab Content */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.length === 0 ? (
            <Card className="col-span-full shadow-none border-border/60 p-8 text-center text-muted-foreground">
              <Users2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">No teams created yet</p>
              <p className="text-xs">Create teams to organize members around specific projects.</p>
            </Card>
          ) : (
            teams.map((team) => (
              <Card key={team.id} className="shadow-none border-border/60 hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold">{team.name}</CardTitle>
                      {team.department && (
                        <span className="text-[11px] font-medium text-primary mt-0.5 block">
                          {team.department.name}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTeam(team)}
                          className="h-7 w-7 text-muted-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTeam(team)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {team.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {team.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>Team Lead:</span>
                    </span>
                    <span className="font-medium text-foreground">
                      {team.lead ? `${team.lead.firstName} ${team.lead.lastName}` : 'Unassigned'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>Team Members ({team.memberCount || 0}):</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {team.members && team.members.length > 0 ? (
                        team.members.slice(0, 5).map((m) => (
                          <span
                            key={m.id}
                            className="bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground font-medium"
                          >
                            {m.firstName} {m.lastName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No members assigned</span>
                      )}
                      {team.members && team.members.length > 5 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          +{team.members.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Department Modal */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? 'Edit Department' : 'Create New Department'}
            </DialogTitle>
            <DialogDescription>
              Define department name, description, and assign a department head.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeptSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Department Name</label>
              <Input
                required
                placeholder="Engineering"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <Input
                placeholder="Product architecture, frontend, backend and QA..."
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Department Head</label>
              <select
                value={deptForm.leadId}
                onChange={(e) => setDeptForm({ ...deptForm, leadId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
              >
                <option value="">No Department Head Assigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Modal */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              Organize members into functional project teams and assign a team lead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTeamSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Team Name</label>
              <Input
                required
                placeholder="Core Platform Team"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <Input
                placeholder="Building core microservices and design system..."
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Department</label>
                <select
                  value={teamForm.departmentId}
                  onChange={(e) => setTeamForm({ ...teamForm, departmentId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
                >
                  <option value="">No Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Team Lead</label>
                <select
                  value={teamForm.leadId}
                  onChange={(e) => setTeamForm({ ...teamForm, leadId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
                >
                  <option value="">No Team Lead</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Member Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Team Members ({teamForm.memberIds.length} Selected)
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1 divide-y divide-border/40">
                {users.map((u) => {
                  const isChecked = teamForm.memberIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center justify-between p-1.5 text-xs hover:bg-muted/40 rounded cursor-pointer"
                    >
                      <span className="font-medium">
                        {u.firstName} {u.lastName}{' '}
                        <span className="text-muted-foreground font-normal">({u.email})</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTeamMember(u.id)}
                        className="rounded border-border text-primary"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsTeamModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingTeam ? 'Save Changes' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
