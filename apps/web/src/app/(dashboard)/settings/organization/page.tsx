'use client';

import React, { useState, useEffect } from 'react';
import { Building, Palette, Sparkles, Check, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLES } from '@taskmaster/shared';

const PRESET_COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Slate', hex: '#64748b' },
];

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: 'Acme Corporation',
    supportEmail: 'support@acmecorp.com',
    logoUrl: '',
    primaryColor: '#3b82f6',
    accentColor: '#6366f1',
  });

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await apiClient.get('/orgs/current');
        if (res.data?.success && res.data.data.organization) {
          const org = res.data.data.organization;
          setForm({
            companyName: org.branding?.companyName || org.name || '',
            supportEmail: org.branding?.supportEmail || '',
            logoUrl: org.branding?.logoUrl || '',
            primaryColor: org.branding?.primaryColor || '#3b82f6',
            accentColor: org.branding?.accentColor || '#6366f1',
          });
        }
      } catch (err) {
        console.error('Failed to load organization branding', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const res = await apiClient.patch('/orgs/current/branding', form);
      if (res.data?.success) {
        setSuccessMsg('Organization branding and appearance updated successfully.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update organization branding');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading workspace branding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization & Branding</h1>
        <p className="text-sm text-muted-foreground">
          Customize your organization identity, workspace logos, and primary theme colors.
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
          {/* Main Settings Form */}
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-none border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <span>General Information</span>
                </CardTitle>
                <CardDescription>
                  Your company name and support contact displayed in notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Company / Workspace Name</label>
                  <Input
                    required
                    disabled={!isSuperAdmin}
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Support Email</label>
                  <Input
                    type="email"
                    disabled={!isSuperAdmin}
                    placeholder="support@yourcompany.com"
                    value={form.supportEmail}
                    onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Logo Image URL</label>
                  <Input
                    type="url"
                    disabled={!isSuperAdmin}
                    placeholder="https://example.com/logo.png"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span>Brand Theme & Color Palette</span>
                </CardTitle>
                <CardDescription>
                  Select your organization&apos;s primary and accent colors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Primary Color */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold flex items-center justify-between">
                    <span>Primary Brand Color</span>
                    <span className="font-mono text-muted-foreground">{form.primaryColor}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      disabled={!isSuperAdmin}
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="h-9 w-12 rounded cursor-pointer border border-border"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => setForm({ ...form, primaryColor: c.hex })}
                          style={{ backgroundColor: c.hex }}
                          className="h-6 w-6 rounded-full border border-black/10 flex items-center justify-center transition-transform hover:scale-110"
                          title={c.name}
                        >
                          {form.primaryColor.toLowerCase() === c.hex.toLowerCase() && (
                            <Check className="h-3 w-3 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold flex items-center justify-between">
                    <span>Secondary / Accent Color</span>
                    <span className="font-mono text-muted-foreground">{form.accentColor}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      disabled={!isSuperAdmin}
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="h-9 w-12 rounded cursor-pointer border border-border"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => setForm({ ...form, accentColor: c.hex })}
                          style={{ backgroundColor: c.hex }}
                          className="h-6 w-6 rounded-full border border-black/10 flex items-center justify-center transition-transform hover:scale-110"
                          title={c.name}
                        >
                          {form.accentColor.toLowerCase() === c.hex.toLowerCase() && (
                            <Check className="h-3 w-3 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-4">
            <Card className="shadow-none border-border/60 bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Branding Preview</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  How your workspace header and buttons will appear.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mock Header */}
                <div className="p-3 bg-card border rounded-xl flex items-center gap-2.5 shadow-sm">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded" />
                    ) : (
                      form.companyName?.[0] || 'A'
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-xs truncate">{form.companyName || 'Company'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{form.supportEmail || 'support@company.com'}</p>
                  </div>
                </div>

                {/* Mock Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    style={{ backgroundColor: form.primaryColor }}
                    className="w-full py-2 px-3 text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                  >
                    Primary Action Button
                  </button>

                  <button
                    type="button"
                    style={{ borderColor: form.accentColor, color: form.accentColor }}
                    className="w-full py-2 px-3 border text-xs font-semibold rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    Secondary Accent Button
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Branding Settings'}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
