'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { ROLES, IAuditLog } from '@taskmaster/shared';
import { toast } from 'sonner';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchAction, setSearchAction] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<IAuditLog | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', page, searchAction, resourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (searchAction) params.append('action', searchAction);
      if (resourceFilter) params.append('resourceType', resourceFilter);

      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
    enabled: user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN,
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (searchAction) params.append('action', searchAction);
      if (resourceFilter) params.append('resourceType', resourceFilter);

      const res = await apiClient.get(`/audit-logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `taskmaster_audit_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Audit log CSV exported successfully');
    } catch (err: any) {
      toast.error('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

  if (user?.role !== ROLES.SUPER_ADMIN && user?.role !== ROLES.ADMIN) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The immutable audit log is strictly restricted to workspace Administrators and Super Administrators.
        </p>
      </div>
    );
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('delete') || action.includes('revoked') || action.includes('suspended')) {
      return 'destructive';
    }
    if (action.includes('created') || action.includes('login') || action.includes('enabled')) {
      return 'success';
    }
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Security & Compliance Audit Log</h1>
            <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-500">
              Immutable Trail
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete, tamper-evident audit trail of all authentication, project mutations, and workspace administrative events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by action (e.g. auth.login, task.create)..."
                  value={searchAction}
                  onChange={(e) => {
                    setSearchAction(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <select
                value={resourceFilter}
                onChange={(e) => {
                  setResourceFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Resource Types</option>
                <option value="auth">Auth & Sessions</option>
                <option value="user">Users</option>
                <option value="project">Projects</option>
                <option value="task">Tasks</option>
                <option value="organization">Organization</option>
                <option value="department">Departments</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              Total Records: {data?.meta?.total || 0}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading immutable audit records...
            </div>
          ) : !data?.data?.length ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No audit logs matching query criteria.
            </div>
          ) : (
            <div className="divide-y overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Resource</th>
                    <th className="py-3 px-4">IP / Client</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((log: IAuditLog) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                            {log.actorName ? log.actorName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="truncate max-w-[160px]">
                            <div className="font-semibold text-foreground">{log.actorName || 'User'}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{log.actorEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action) as any} className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">{log.resourceTitle || log.resourceType}</span>
                        {log.resourceId && (
                          <span className="text-[10px] text-muted-foreground font-mono block">
                            ID: {log.resourceId.slice(-6)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground text-[11px] whitespace-nowrap">
                        <div>{log.ipAddress || '127.0.0.1'}</div>
                        <div className="text-[10px] text-muted-foreground/70 truncate max-w-[140px]">
                          {log.userAgent || 'Web Client'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(log.before || log.after) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[11px]">Diff</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {data?.meta?.totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} events)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page >= data.meta.totalPages}
                  className="h-8 gap-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Before / After Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-3xl border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">Audit Event State Diff</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedLog.action}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  Actor: {selectedLog.actorName} ({selectedLog.actorEmail}) &bull;{' '}
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-rose-500 block mb-1.5 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                    Previous State (Before):
                  </span>
                  <pre className="p-3 rounded-lg bg-muted/60 border font-mono text-[11px] overflow-x-auto text-muted-foreground">
                    {selectedLog.before
                      ? JSON.stringify(selectedLog.before, null, 2)
                      : '// No previous state (initial creation)'}
                  </pre>
                </div>

                <div>
                  <span className="text-xs font-semibold text-emerald-500 block mb-1.5 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Updated State (After):
                  </span>
                  <pre className="p-3 rounded-lg bg-muted/60 border font-mono text-[11px] overflow-x-auto text-muted-foreground">
                    {selectedLog.after
                      ? JSON.stringify(selectedLog.after, null, 2)
                      : '// No following state (entity deleted)'}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
