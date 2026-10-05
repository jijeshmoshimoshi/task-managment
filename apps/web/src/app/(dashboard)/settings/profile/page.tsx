'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Save,
  KeyRound,
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

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export default function ProfileSettingsPage() {
  const { user, organization, refetchMe } = useAuth();

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    jobTitle: user?.jobTitle || '',
    phone: '',
    timezone: user?.timezone || 'UTC',
    avatarUrl: user?.avatarUrl || '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data?.success && res.data.data.user) {
          const u = res.data.data.user;
          setForm({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            jobTitle: u.jobTitle || '',
            phone: u.phone || '',
            timezone: u.timezone || 'UTC',
            avatarUrl: u.avatarUrl || '',
          });
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const res = await apiClient.patch('/users/profile/me', form);
      if (res.data?.success) {
        setSuccessMsg('Your profile has been updated successfully.');
        if (refetchMe) {
          refetchMe();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile & Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal details, contact information, and time preferences.
        </p>
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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Profile Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-none border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Personal Details</span>
                </CardTitle>
                <CardDescription>
                  Your display name and identity across organization projects and tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">First Name</label>
                    <Input
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Last Name</label>
                    <Input
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Email Address (Managed)</label>
                  <Input disabled value={user?.email || ''} className="bg-muted/50 font-mono text-xs" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Job Title</label>
                    <Input
                      placeholder="e.g. Staff Software Engineer"
                      value={form.jobTitle}
                      onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Phone</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Timezone</label>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border text-sm bg-background text-foreground"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Avatar Image URL (Optional)</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={form.avatarUrl}
                    onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Overview Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-none border-border/60 bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Account Overview</CardTitle>
                <CardDescription className="text-xs">
                  Your permissions and security status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20 shrink-0">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <Badge variant="secondary" className="font-mono text-[10px] mt-0.5">
                      {user?.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Organization:</span>
                    <span className="font-semibold text-foreground truncate max-w-[140px]">
                      {organization?.name || 'Workspace'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Account Status:</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                      {user?.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>2FA Security:</span>
                    <span className="font-medium text-foreground">
                      {user?.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/settings/security">
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Manage 2FA & Sessions</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2 shadow-sm font-medium">
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
