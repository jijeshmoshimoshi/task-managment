'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  KeyRound,
  LogOut,
  Ban,
  CheckCircle2,
  Trash2,
  Building,
  Mail,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROLES, USER_STATUSES } from '@taskmaster/shared';

interface IUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  avatarUrl?: string;
  jobTitle?: string;
  phone?: string;
  timezone?: string;
  isTwoFactorEnabled?: boolean;
  departmentId?: string;
  department?: { id: string; name: string };
  teamIds?: string[];
  teams?: Array<{ id: string; name: string }>;
  lastLoginAt?: string;
  createdAt: string;
}

interface IDepartmentItem {
  id: string;
  name: string;
}

interface ITeamItem {
  id: string;
  name: string;
}

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN;
  const isAdmin = currentUser?.role === ROLES.ADMIN || isSuperAdmin;

  const [users, setUsers] = useState<IUserItem[]>([]);
  const [departments, setDepartments] = useState<IDepartmentItem[]>([]);
  const [teams, setTeams] = useState<ITeamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Dialog States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUserItem | null>(null);

  // Form States
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: ROLES.USER,
    departmentId: '',
    teamIds: [] as string[],
  });

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    phone: '',
    timezone: 'UTC',
    departmentId: '',
    teamIds: [] as string[],
  });

  const [selectedNewRole, setSelectedNewRole] = useState(ROLES.USER);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (deptFilter) params.append('departmentId', deptFilter);

      const res = await apiClient.get(`/users?${params.toString()}`);
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, deptFilter]);

  // Fetch Departments & Teams for dropdowns
  const fetchMetadata = async () => {
    try {
      const [deptRes, teamRes] = await Promise.all([
        apiClient.get('/departments'),
        apiClient.get('/teams'),
      ]);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (teamRes.data?.success) setTeams(teamRes.data.data);
    } catch (err) {
      console.error('Failed to load departments/teams', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMetadata();
  }, [fetchUsers]);

  // Handle Invite User
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      };
      if (inviteForm.departmentId) payload.departmentId = inviteForm.departmentId;
      if (inviteForm.teamIds.length > 0) payload.teamIds = inviteForm.teamIds;

      const res = await apiClient.post('/users/invite', payload);
      if (res.data?.success) {
        setActionSuccess(`Invitation sent successfully to ${inviteForm.email}`);
        setIsInviteOpen(false);
        setInviteForm({
          firstName: '',
          lastName: '',
          email: '',
          role: ROLES.USER,
          departmentId: '',
          teamIds: [],
        });
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit User
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.patch(`/users/${selectedUser.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        jobTitle: editForm.jobTitle.trim(),
        phone: editForm.phone.trim(),
        timezone: editForm.timezone,
        departmentId: editForm.departmentId || null,
        teamIds: editForm.teamIds,
      });

      if (res.data?.success) {
        setActionSuccess(`Profile for ${selectedUser.firstName} updated successfully`);
        setIsEditOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Change Role
  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setActionError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.patch(`/users/${selectedUser.id}/role`, {
        role: selectedNewRole,
      });

      if (res.data?.success) {
        setActionSuccess(`Role updated to ${selectedNewRole} for ${selectedUser.firstName}`);
        setIsRoleOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to change role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Status Toggle (Activate / Suspend)
  const handleToggleStatus = async (user: IUserItem) => {
    const newStatus =
      user.status === USER_STATUSES.ACTIVE
        ? USER_STATUSES.SUSPENDED
        : USER_STATUSES.ACTIVE;

    try {
      const res = await apiClient.post(`/users/${user.id}/status`, {
        status: newStatus,
      });
      if (res.data?.success) {
        setActionSuccess(`Status for ${user.firstName} updated to ${newStatus}`);
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user status');
    }
  };

  // Handle Force Logout
  const handleForceLogout = async (user: IUserItem) => {
    try {
      const res = await apiClient.post(`/users/${user.id}/force-logout`);
      if (res.data?.success) {
        setActionSuccess(`All active sessions revoked for ${user.firstName} ${user.lastName}`);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to revoke sessions');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: IUserItem) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await apiClient.delete(`/users/${user.id}`);
      if (res.data?.success) {
        setActionSuccess(`User ${user.firstName} ${user.lastName} has been deleted.`);
        fetchUsers();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete user');
    }
  };

  const openEditModal = (u: IUserItem) => {
    setSelectedUser(u);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      jobTitle: u.jobTitle || '',
      phone: u.phone || '',
      timezone: u.timezone || 'UTC',
      departmentId: u.departmentId || '',
      teamIds: u.teamIds || [],
    });
    setIsEditOpen(true);
  };

  const openRoleModal = (u: IUserItem) => {
    setSelectedUser(u);
    setSelectedNewRole(u.role as any);
    setIsRoleOpen(true);
  };

  // Stats calculation
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === USER_STATUSES.ACTIVE).length;
  const suspendedCount = users.filter((u) => u.status === USER_STATUSES.SUSPENDED).length;
  const invitedCount = users.filter((u) => u.status === USER_STATUSES.INVITED).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team & User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage organization members, role permissions, departments, and active sessions.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              setActionError(null);
              setIsInviteOpen(true);
            }}
            className="gap-2 shadow-sm font-medium"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)} className="h-6 px-2 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)} className="h-6 px-2 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-none border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Members</p>
              <p className="text-2xl font-bold tracking-tight mt-1">{totalCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Accounts</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Invites</p>
              <p className="text-2xl font-bold tracking-tight text-amber-600 mt-1">{invitedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Mail className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Suspended</p>
              <p className="text-2xl font-bold tracking-tight text-rose-600 mt-1">{suspendedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Ban className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-none border-border/60">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/40"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-md border text-xs bg-background text-foreground"
            >
              <option value="">All Roles</option>
              <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.USER}>User (Employee)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border text-xs bg-background text-foreground"
            >
              <option value="">All Statuses</option>
              <option value={USER_STATUSES.ACTIVE}>Active</option>
              <option value={USER_STATUSES.INVITED}>Invited</option>
              <option value={USER_STATUSES.SUSPENDED}>Suspended</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 px-3 rounded-md border text-xs bg-background text-foreground"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <Button variant="outline" size="sm" onClick={() => fetchUsers()} className="shrink-0 h-9 gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-none border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Department / Teams</th>
                <th className="py-3 px-4">Security</th>
                <th className="py-3 px-4">Last Login</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-xs">Loading organization members...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No members found</p>
                      <p className="text-xs text-muted-foreground/80">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const isTargetSuper = u.role === ROLES.SUPER_ADMIN;

                  return (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                            {u.firstName?.[0]}
                            {u.lastName?.[0]}
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                              <span>{u.firstName} {u.lastName}</span>
                              {isSelf && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                            {u.jobTitle && <div className="text-[10px] text-muted-foreground/80">{u.jobTitle}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            u.role === ROLES.SUPER_ADMIN
                              ? 'destructive'
                              : u.role === ROLES.ADMIN
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-[10px] font-mono"
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            u.status === USER_STATUSES.ACTIVE
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : u.status === USER_STATUSES.INVITED
                              ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                              : 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {u.status}
                        </Badge>
                      </td>

                      {/* Department / Teams */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {u.department ? (
                            <div className="flex items-center gap-1 text-xs text-foreground">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              <span>{u.department.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">No department</span>
                          )}

                          {u.teams && u.teams.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {u.teams.map((t) => (
                                <span
                                  key={t.id}
                                  className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Security */}
                      <td className="py-3 px-4">
                        {u.isTwoFactorEnabled ? (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>2FA Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Shield className="h-3.5 w-3.5" />
                            <span>2FA Disabled</span>
                          </div>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>

                      {/* Action Menu */}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(u)}
                              className="h-7 px-2 text-xs"
                              title="Edit User"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRoleModal(u)}
                                className="h-7 px-2 text-xs"
                                title="Change Role"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleForceLogout(u)}
                              className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                              title="Force Logout"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                            </Button>

                            {!isTargetSuper && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(u)}
                                className={`h-7 px-2 text-xs ${
                                  u.status === USER_STATUSES.ACTIVE
                                    ? 'text-rose-600 hover:text-rose-700'
                                    : 'text-emerald-600 hover:text-emerald-700'
                                }`}
                                title={u.status === USER_STATUSES.ACTIVE ? 'Suspend User' : 'Activate User'}
                              >
                                {u.status === USER_STATUSES.ACTIVE ? (
                                  <Ban className="h-3.5 w-3.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}

                            {isSuperAdmin && !isTargetSuper && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u)}
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                                title="Delete User"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>Invite New Team Member</span>
            </DialogTitle>
            <DialogDescription>
              An invitation email with a single-use onboarding link will be sent to the employee.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">First Name</label>
                <Input
                  required
                  placeholder="Jane"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Last Name</label>
                <Input
                  required
                  placeholder="Doe"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Email Address</label>
              <Input
                required
                type="email"
                placeholder="jane.doe@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Workspace Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
              >
                <option value={ROLES.USER}>User (Employee)</option>
                <option value={ROLES.ADMIN}>Admin</option>
                {isSuperAdmin && <option value={ROLES.SUPER_ADMIN}>Super Admin</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Department (Optional)</label>
              <select
                value={inviteForm.departmentId}
                onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
              >
                <option value="">No Department Assigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {teams.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Assign to Teams</label>
                <div className="max-h-28 overflow-y-auto border rounded-md p-2 space-y-1 divide-y divide-border/30">
                  {teams.map((t) => (
                    <label key={t.id} className="flex items-center justify-between p-1 text-xs hover:bg-muted/40 rounded cursor-pointer">
                      <span>{t.name}</span>
                      <input
                        type="checkbox"
                        checked={inviteForm.teamIds.includes(t.id)}
                        onChange={() => {
                          if (inviteForm.teamIds.includes(t.id)) {
                            setInviteForm({ ...inviteForm, teamIds: inviteForm.teamIds.filter((id) => id !== t.id) });
                          } else {
                            setInviteForm({ ...inviteForm, teamIds: [...inviteForm.teamIds, t.id] });
                          }
                        }}
                        className="rounded border-border text-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending Invite...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member Profile</DialogTitle>
            <DialogDescription>
              Update member details, job title, and department assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">First Name</label>
                <Input
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Last Name</label>
                <Input
                  required
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Job Title</label>
              <Input
                placeholder="Senior Architect"
                value={editForm.jobTitle}
                onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Phone</label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Timezone</label>
                <Input
                  placeholder="America/New_York"
                  value={editForm.timezone}
                  onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Department</label>
              <select
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
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

            {teams.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Team Memberships</label>
                <div className="max-h-28 overflow-y-auto border rounded-md p-2 space-y-1 divide-y divide-border/30">
                  {teams.map((t) => (
                    <label key={t.id} className="flex items-center justify-between p-1 text-xs hover:bg-muted/40 rounded cursor-pointer">
                      <span>{t.name}</span>
                      <input
                        type="checkbox"
                        checked={editForm.teamIds.includes(t.id)}
                        onChange={() => {
                          if (editForm.teamIds.includes(t.id)) {
                            setEditForm({ ...editForm, teamIds: editForm.teamIds.filter((id) => id !== t.id) });
                          } else {
                            setEditForm({ ...editForm, teamIds: [...editForm.teamIds, t.id] });
                          }
                        }}
                        className="rounded border-border text-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <span>Modify Role Assignment</span>
            </DialogTitle>
            <DialogDescription>
              Update permissions for {selectedUser?.firstName} {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Select Role</label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
              >
                <option value={ROLES.USER}>User (Standard Employee)</option>
                <option value={ROLES.ADMIN}>Admin (Team & Project Manager)</option>
                <option value={ROLES.SUPER_ADMIN}>Super Admin (Full Workspace Access)</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border">
              Updating the user&apos;s role will immediately invalidate their current active sessions and issue new authorization claims upon their next login.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Confirm Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
