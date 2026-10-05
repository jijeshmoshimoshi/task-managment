'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Trash2,
  LogOut,
  QrCode,
  Copy,
  Check,
  Download,
} from 'lucide-react';

export default function SecuritySettingsPage() {
  const queryClient = useQueryClient();
  const { user, refetchMe } = useAuth();

  // 2FA Setup State
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 1. Query Active Sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/sessions');
      return res.data.data as Array<{
        id: string;
        userAgent: string;
        ipAddress: string;
        createdAt: string;
        lastUsedAt: string;
        isCurrent: boolean;
      }>;
    },
  });

  // 2. Generate 2FA Secret Mutation
  const generate2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/2fa/generate');
      return res.data.data;
    },
    onSuccess: (data) => {
      setSetupSecret(data.secret);
      setQrCodeUrl(data.qrCodeDataUrl);
      setIsSettingUp2FA(true);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to initialize 2FA setup');
    },
  });

  // 3. Enable 2FA Mutation
  const enable2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/2fa/enable', {
        secret: setupSecret,
        code: verifyCode,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      refetchMe();
      toast.success('Two-factor authentication enabled successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Invalid 6-digit code. Please try again.');
    },
  });

  // 4. Disable 2FA Mutation
  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/2fa/disable');
      return res.data.data;
    },
    onSuccess: () => {
      refetchMe();
      setIsSettingUp2FA(false);
      setRecoveryCodes(null);
      toast.info('Two-factor authentication disabled.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to disable 2FA');
    },
  });

  // 5. Revoke Session Mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast.success('Session revoked successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to revoke session');
    },
  });

  // 6. Logout Everywhere Mutation
  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast.success('All other sessions revoked.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to revoke sessions');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success('Secret copied to clipboard');
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const element = document.createElement('a');
    const file = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'taskmaster-recovery-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security & Authentication</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account protection, two-factor authentication, and active sessions.
        </p>
      </div>

      {/* Two-Factor Authentication Section */}
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  user?.isTwoFactorEnabled
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base">Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                  Protect your account with an Authenticator app (Google Authenticator, 1Password, Authy).
                </CardDescription>
              </div>
            </div>

            <Badge variant={user?.isTwoFactorEnabled ? 'success' : 'secondary'}>
              {user?.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {user?.isTwoFactorEnabled ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-emerald-500/5">
              <div className="space-y-1">
                <div className="font-semibold text-sm text-foreground">2FA is active on your account</div>
                <p className="text-xs text-muted-foreground">
                  You will be prompted for a 6-digit code or recovery code whenever you sign in.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disable2FAMutation.mutate()}
                disabled={disable2FAMutation.isPending}
              >
                {disable2FAMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            </div>
          ) : !isSettingUp2FA ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
              <div className="space-y-1">
                <div className="font-semibold text-sm text-foreground">Enhance Account Security</div>
                <p className="text-xs text-muted-foreground">
                  Generate a secret key to pair with your authenticator mobile app.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => generate2FAMutation.mutate()}
                disabled={generate2FAMutation.isPending}
              >
                <QrCode className="h-4 w-4" />
                {generate2FAMutation.isPending ? 'Generating...' : 'Enable 2FA'}
              </Button>
            </div>
          ) : recoveryCodes ? (
            // Recovery Codes Display Step
            <div className="space-y-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <Check className="h-5 w-5" />
                <span>2FA Enabled! Save Your Backup Recovery Codes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                If you lose access to your phone or authenticator app, these single-use codes are the only way to recover your account. Store them in a secure password manager.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-background p-4 rounded-lg border font-mono text-xs text-center font-bold">
                {recoveryCodes.map((code) => (
                  <div key={code} className="p-1.5 rounded bg-muted/40">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadRecoveryCodes}>
                  <Download className="h-3.5 w-3.5" />
                  Download Codes (.txt)
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsSettingUp2FA(false);
                    setRecoveryCodes(null);
                  }}
                >
                  I Have Saved My Codes
                </Button>
              </div>
            </div>
          ) : (
            // QR Code Scan & Verify Step
            <div className="space-y-6 p-4 rounded-xl border bg-card animate-in fade-in">
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Step 1: Scan QR Code with Authenticator App</h3>
                <p className="text-xs text-muted-foreground">
                  Scan this QR code using Google Authenticator, 1Password, Authy, or Microsoft Authenticator.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {qrCodeUrl && (
                  <div className="p-2 bg-white rounded-xl border shadow-sm shrink-0">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="h-40 w-40" />
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  <span className="text-xs text-muted-foreground">Or enter manual key:</span>
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-lg font-mono text-xs">
                    <span className="truncate flex-1">{setupSecret}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => copyToClipboard(setupSecret)}
                    >
                      {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold" htmlFor="verifyCode">
                      Step 2: Enter 6-digit Code to Confirm
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="verifyCode"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        className="font-mono text-center tracking-widest text-sm max-w-[160px]"
                      />
                      <Button
                        size="sm"
                        onClick={() => enable2FAMutation.mutate()}
                        disabled={enable2FAMutation.isPending || verifyCode.length !== 6}
                      >
                        {enable2FAMutation.isPending ? 'Verifying...' : 'Verify & Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSettingUp2FA(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions Section */}
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Laptop className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base">Active Devices & Sessions</CardTitle>
                <CardDescription>
                  Sessions currently authenticated and active in the Redis session registry.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => logoutAllMutation.mutate()}
              disabled={logoutAllMutation.isPending}
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out Everywhere
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loadingSessions ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Loading active sessions...</div>
          ) : !sessions?.length ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No active sessions found.</div>
          ) : (
            <div className="divide-y border rounded-xl overflow-hidden">
              {sessions.map((sess) => (
                <div key={sess.id} className="p-4 flex items-center justify-between gap-4 bg-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      {sess.userAgent.includes('Mobile') ? (
                        <Smartphone className="h-5 w-5" />
                      ) : (
                        <Laptop className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate max-w-xs">{sess.userAgent}</span>
                        {sess.isCurrent && (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5">
                            This Device
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        IP: {sess.ipAddress} &bull; Last active: {new Date(sess.lastUsedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={() => revokeSessionMutation.mutate(sess.id)}
                      disabled={revokeSessionMutation.isPending}
                      aria-label="Revoke Session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
