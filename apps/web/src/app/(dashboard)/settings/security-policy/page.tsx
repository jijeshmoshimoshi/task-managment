'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Clock,
  Globe,
  Save,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLES } from '@taskmaster/shared';

export default function SecurityPolicyPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newIp, setNewIp] = useState('');

  const [policy, setPolicy] = useState({
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    passwordRequireUppercase: true,
    enforce2FARoles: [] as string[],
    sessionMaxLifetimeMinutes: 10080, // 7 days
    ipAllowList: [] as string[],
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  });

  useEffect(() => {
    async function loadPolicy() {
      try {
        const res = await apiClient.get('/orgs/current');
        if (res.data?.success && res.data.data.organization?.securityPolicy) {
          const sp = res.data.data.organization.securityPolicy;
          setPolicy({
            passwordMinLength: sp.passwordMinLength || 8,
            passwordRequireNumbers: sp.passwordRequireNumbers ?? true,
            passwordRequireSymbols: sp.passwordRequireSymbols ?? true,
            passwordRequireUppercase: sp.passwordRequireUppercase ?? true,
            enforce2FARoles: sp.enforce2FARoles || [],
            sessionMaxLifetimeMinutes: sp.sessionMaxLifetimeMinutes || 10080,
            ipAllowList: sp.ipAllowList || [],
            maxFailedLoginAttempts: sp.maxFailedLoginAttempts || 5,
            lockoutDurationMinutes: sp.lockoutDurationMinutes || 15,
          });
        }
      } catch (err) {
        console.error('Failed to load security policies', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const res = await apiClient.patch('/orgs/current/security', policy);
      if (res.data?.success) {
        setSuccessMsg('Security policies updated successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update security policies');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRole2FA = (role: string) => {
    if (policy.enforce2FARoles.includes(role)) {
      setPolicy({
        ...policy,
        enforce2FARoles: policy.enforce2FARoles.filter((r) => r !== role),
      });
    } else {
      setPolicy({
        ...policy,
        enforce2FARoles: [...policy.enforce2FARoles, role],
      });
    }
  };

  const handleAddIp = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    if (policy.ipAllowList.includes(trimmed)) return;
    setPolicy({
      ...policy,
      ipAllowList: [...policy.ipAllowList, trimmed],
    });
    setNewIp('');
  };

  const handleRemoveIp = (ip: string) => {
    setPolicy({
      ...policy,
      ipAllowList: policy.ipAllowList.filter((item) => item !== ip),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading workspace security policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security & Governance Policies</h1>
        <p className="text-sm text-muted-foreground">
          Configure organization-wide password complexity, mandatory 2FA, session lifetimes, and lockout rules.
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

      {!isSuperAdmin && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-600 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Only Super Administrators can modify organization security policies.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Password Policy */}
        <Card className="shadow-none border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>Password Complexity Standards</span>
            </CardTitle>
            <CardDescription>
              Rules enforced when users register, accept invitations, or reset credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Minimum Password Length</label>
                <Input
                  type="number"
                  min={8}
                  max={32}
                  disabled={!isSuperAdmin}
                  value={policy.passwordMinLength}
                  onChange={(e) =>
                    setPolicy({ ...policy, passwordMinLength: parseInt(e.target.value, 10) || 8 })
                  }
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={policy.passwordRequireUppercase}
                    onChange={(e) =>
                      setPolicy({ ...policy, passwordRequireUppercase: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Require at least one uppercase letter (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={policy.passwordRequireNumbers}
                    onChange={(e) =>
                      setPolicy({ ...policy, passwordRequireNumbers: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Require at least one numeric digit (0-9)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={policy.passwordRequireSymbols}
                    onChange={(e) =>
                      setPolicy({ ...policy, passwordRequireSymbols: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <span>Require at least one special character (@$!%*?&)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2FA Role Enforcement */}
        <Card className="shadow-none border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Mandatory Two-Factor Authentication (2FA)</span>
            </CardTitle>
            <CardDescription>
              Enforce mandatory TOTP authenticator setup based on workspace role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER].map((role) => {
                const isEnforced = policy.enforce2FARoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => toggleRole2FA(role)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      isEnforced
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full border flex items-center justify-center ${
                        isEnforced ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}
                    />
                    <span>{role.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Session Lifetime & Brute Force Lockout */}
        <Card className="shadow-none border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Session Lifetimes & Lockout Thresholds</span>
            </CardTitle>
            <CardDescription>
              Control session revocation timers and progressive delays on repeated login failures.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Max Session Lifetime (Hours)</label>
              <Input
                type="number"
                min={1}
                max={720}
                disabled={!isSuperAdmin}
                value={Math.round(policy.sessionMaxLifetimeMinutes / 60)}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    sessionMaxLifetimeMinutes: (parseInt(e.target.value, 10) || 1) * 60,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Max Failed Login Attempts</label>
              <Input
                type="number"
                min={3}
                max={10}
                disabled={!isSuperAdmin}
                value={policy.maxFailedLoginAttempts}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    maxFailedLoginAttempts: parseInt(e.target.value, 10) || 5,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Lockout Duration (Minutes)</label>
              <Input
                type="number"
                min={5}
                max={1440}
                disabled={!isSuperAdmin}
                value={policy.lockoutDurationMinutes}
                onChange={(e) =>
                  setPolicy({
                    ...policy,
                    lockoutDurationMinutes: parseInt(e.target.value, 10) || 15,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* IP Allow List */}
        <Card className="shadow-none border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span>IP Address Allow-List (Optional)</span>
            </CardTitle>
            <CardDescription>
              Restrict API and workspace login access to specified corporate IP addresses. Leave empty to allow all.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSuperAdmin && (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 192.168.1.100 or 10.0.0.0/24"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="max-w-md font-mono text-xs"
                />
                <Button type="button" variant="outline" onClick={handleAddIp} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Add IP</span>
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {policy.ipAllowList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No IP restrictions configured (open access).</p>
              ) : (
                policy.ipAllowList.map((ip) => (
                  <Badge
                    key={ip}
                    variant="secondary"
                    className="font-mono text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <span>{ip}</span>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIp(ip)}
                        className="hover:text-destructive transition-colors ml-1"
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Updating...' : 'Save Security Policies'}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
