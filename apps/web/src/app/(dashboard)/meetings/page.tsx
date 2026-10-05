'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Video,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Shield,
  CalendarCheck2,
  LayoutList,
  CalendarDays,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { IMeeting, ROLES, MeetingStatus } from '@taskmaster/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateMeetingModal } from '@/components/meetings/create-meeting-modal';
import { MeetingsCalendarView } from '@/components/meetings/meetings-calendar-view';

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MeetingStatus>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canCreateMeeting =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/meetings');
      setMeetings(res.data.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleUpdateStatus = async (meetingId: string, status: MeetingStatus) => {
    try {
      await apiClient.patch(`/meetings/${meetingId}/status`, { status });
      toast.success(`Meeting status updated to ${status}`);
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update meeting status');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await apiClient.delete(`/meetings/${meetingId}`);
      toast.success('Meeting deleted');
      fetchMeetings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete meeting');
    }
  };

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success('Google Meet link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectDateToSchedule = (dateStr: string) => {
    setSelectedDateForModal(dateStr);
    setIsCreateModalOpen(true);
  };

  // Filter meetings based on search query & status filter
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const searchLower = searchQuery.toLowerCase();

      const participantMatches =
        m.participants?.some(
          (p) =>
            p.firstName.toLowerCase().includes(searchLower) ||
            p.lastName.toLowerCase().includes(searchLower) ||
            p.email.toLowerCase().includes(searchLower),
        ) ||
        m.participant?.firstName.toLowerCase().includes(searchLower) ||
        m.participant?.lastName.toLowerCase().includes(searchLower) ||
        m.participant?.email.toLowerCase().includes(searchLower);

      const matchesSearch =
        !searchQuery ||
        m.title.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower) ||
        participantMatches;

      return matchesStatus && matchesSearch;
    });
  }, [meetings, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: meetings.length,
      scheduled: meetings.filter((m) => m.status === 'SCHEDULED').length,
      completed: meetings.filter((m) => m.status === 'COMPLETED').length,
      cancelled: meetings.filter((m) => m.status === 'CANCELLED').length,
    };
  }, [meetings]);

  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 gap-1 font-medium">
            <Clock className="h-3 w-3" /> Scheduled
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1 font-medium">
            <XCircle className="h-3 w-3" /> Cancelled
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Meeting Setup</h1>
            <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
              Google Calendar
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Arrange and join scheduled Google Meet sessions with team members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher Tabs */}
          <div className="flex items-center p-1 bg-muted/50 rounded-lg border text-xs">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'CALENDAR'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> Calendar View
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === 'LIST'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> List View
            </button>
          </div>

          {/* Schedule Meeting button - ONLY FOR ADMIN AND SUPER ADMIN */}
          {canCreateMeeting ? (
            <Button
              onClick={() => {
                setSelectedDateForModal(undefined);
                setIsCreateModalOpen(true);
              }}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> Schedule Meeting
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-amber-500" />
              <span>Meeting creation is managed by Admins</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Meetings</span>
            <Video className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Scheduled</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
            {stats.scheduled}
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
            {stats.completed}
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cancelled</span>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2 text-muted-foreground">{stats.cancelled}</p>
        </div>
      </div>

      {/* Toolbar: Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings by title or member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({meetings.length})
          </button>
          <button
            onClick={() => setStatusFilter('SCHEDULED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              statusFilter === 'SCHEDULED'
                ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Scheduled ({stats.scheduled})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              statusFilter === 'COMPLETED'
                ? 'bg-background text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              statusFilter === 'CANCELLED'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cancelled ({stats.cancelled})
          </button>
        </div>
      </div>

      {/* Main Content Area: CALENDAR VIEW or LIST VIEW */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl border bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'CALENDAR' ? (
        <MeetingsCalendarView
          meetings={filteredMeetings}
          canCreateMeeting={canCreateMeeting}
          onSelectDateToSchedule={handleSelectDateToSchedule}
          onUpdateStatus={handleUpdateStatus}
          onDeleteMeeting={handleDeleteMeeting}
        />
      ) : filteredMeetings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed bg-card/30">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Video className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-base">No meetings found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No meetings match your filter criteria.'
              : 'No meetings have been arranged yet.'}
          </p>
          {canCreateMeeting && !searchQuery && statusFilter === 'ALL' && (
            <Button
              onClick={() => {
                setSelectedDateForModal(undefined);
                setIsCreateModalOpen(true);
              }}
              size="sm"
              className="mt-4 gap-2"
            >
              <Plus className="h-4 w-4" /> Schedule First Meeting
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => {
            const startDate = new Date(meeting.startTime);
            const endDate = new Date(meeting.endTime);
            const formattedDate = startDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = `${startDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })} - ${endDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}`;

            const isOrganizer = user?.id === meeting.organizerId;
            const participantsList = meeting.participants && meeting.participants.length > 0
              ? meeting.participants
              : meeting.participant
              ? [meeting.participant]
              : [];

            return (
              <div
                key={meeting.id}
                className="p-5 rounded-2xl border bg-card/70 backdrop-blur-md shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold tracking-tight">{meeting.title}</h3>
                      {getStatusBadge(meeting.status)}
                    </div>
                    {meeting.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Dropdown / Status Handlers for Admin or Organizer */}
                  {(canCreateMeeting || isOrganizer) && (
                    <div className="flex items-center gap-2 self-start md:self-auto">
                      {meeting.status === 'SCHEDULED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(meeting.id, 'COMPLETED')}
                            className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(meeting.id, 'CANCELLED')}
                            className="h-8 text-xs gap-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </Button>
                        </>
                      )}
                      {canCreateMeeting && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete Meeting"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Details Grid: Date & Time, Members, Organizer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Date & Time */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <CalendarIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{formattedDate}</p>
                      <p className="text-[11px] text-muted-foreground">{formattedTime}</p>
                    </div>
                  </div>

                  {/* Members Participants list */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border">
                    <div className="p-2 rounded-lg bg-primary/15 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Scheduled Members</p>
                        <span className="text-[10px] font-mono text-primary font-bold">
                          {participantsList.length}
                        </span>
                      </div>
                      <p className="font-semibold truncate text-foreground">
                        {participantsList.map((p) => `${p.firstName} ${p.lastName}`).join(', ') || 'Members'}
                      </p>
                    </div>
                  </div>

                  {/* Organizer Admin */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border">
                    <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0 border">
                      {meeting.organizer?.firstName?.[0] || 'A'}
                      {meeting.organizer?.lastName?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Organizer</p>
                      <p className="font-semibold truncate text-foreground">
                        {meeting.organizer
                          ? `${meeting.organizer.firstName} ${meeting.organizer.lastName}`
                          : 'Admin'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {meeting.organizer?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Google Meet & Calendar Links Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border max-w-md truncate">
                    <Video className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{meeting.googleMeetLink}</span>
                    <button
                      onClick={() => handleCopyLink(meeting.googleMeetLink, meeting.id)}
                      className="ml-auto text-muted-foreground hover:text-foreground p-1"
                      title="Copy Link"
                    >
                      {copiedId === meeting.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {meeting.googleCalendarUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(meeting.googleCalendarUrl, '_blank')}
                        className="h-8 text-xs gap-1.5"
                      >
                        <CalendarCheck2 className="h-3.5 w-3.5 text-primary" />
                        Add to Calendar
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => window.open(meeting.googleMeetLink, '_blank')}
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Google Meet
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onMeetingCreated={fetchMeetings}
        existingMeetings={meetings}
        defaultDate={selectedDateForModal}
      />
    </div>
  );
}
