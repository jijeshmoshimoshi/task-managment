'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Video,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  CalendarCheck2,
  Users,
} from 'lucide-react';
import { IMeeting, MeetingStatus } from '@taskmaster/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface MeetingsCalendarViewProps {
  meetings: IMeeting[];
  canCreateMeeting: boolean;
  onSelectDateToSchedule: (dateStr: string) => void;
  onUpdateStatus: (meetingId: string, status: MeetingStatus) => void;
  onDeleteMeeting?: (meetingId: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MeetingsCalendarView({
  meetings,
  canCreateMeeting,
  onSelectDateToSchedule,
  onUpdateStatus,
}: MeetingsCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<IMeeting | null>(null);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid days for the month view
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0]!,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const todayStr = new Date().toISOString().split('T')[0];
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding days to fill 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0]!,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [year, month]);

  // Group meetings by YYYY-MM-DD
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, IMeeting[]>();
    meetings.forEach((m) => {
      const dateKey = new Date(m.startTime).toISOString().split('T')[0]!;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(m);
    });
    return map;
  }, [meetings]);

  const monthLabel = currentDate.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'COMPLETED':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">{monthLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-medium">
            Today
          </Button>
          <div className="flex items-center border rounded-lg bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-r-none border-r"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-l-none"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Days Header */}
      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground uppercase tracking-wider py-1">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 auto-rows-fr">
        {calendarDays.map((dayObj, idx) => {
          const dayMeetings = meetingsByDate.get(dayObj.dateStr) || [];
          const dayNumber = dayObj.date.getDate();

          return (
            <div
              key={`${dayObj.dateStr}-${idx}`}
              className={`min-h-[120px] p-2 rounded-xl border transition-all flex flex-col justify-between group ${
                dayObj.isCurrentMonth
                  ? 'bg-card/70 hover:bg-card hover:border-primary/40'
                  : 'bg-muted/20 opacity-50'
              } ${dayObj.isToday ? 'ring-2 ring-primary border-primary/50 font-bold' : ''}`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                    dayObj.isToday
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {dayNumber}
                </span>

                {canCreateMeeting && dayObj.isCurrentMonth && (
                  <button
                    onClick={() => onSelectDateToSchedule(dayObj.dateStr)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-primary transition-opacity"
                    title={`Schedule meeting on ${dayObj.dateStr}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Meetings List inside cell */}
              <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                {dayMeetings.map((m) => {
                  const startTimeStr = new Date(m.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  const participantCount = m.participants?.length || (m.participant ? 1 : 0);

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMeeting(m)}
                      className={`w-full text-left p-1.5 rounded-md border text-[11px] font-medium leading-tight truncate transition-all shadow-2xs hover:scale-[1.02] ${getStatusColor(
                        m.status,
                      )}`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Video className="h-3 w-3 shrink-0" />
                        <span className="font-semibold shrink-0">{startTimeStr}</span>
                        <span className="truncate">{m.title}</span>
                        {participantCount > 1 && (
                          <Badge variant="outline" className="text-[9px] px-1 h-3.5 border-primary/30 shrink-0">
                            {participantCount}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Meeting Detail Modal when clicking on a Calendar Event Pill */}
      {selectedMeeting && (
        <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border shadow-2xl">
            <DialogHeader className="p-6 bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">{selectedMeeting.title}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {new Date(selectedMeeting.startTime).toLocaleString('en-US', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Description */}
              {selectedMeeting.description && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Agenda / Description</span>
                  <p className="text-xs bg-muted/40 p-3 rounded-lg border text-foreground leading-relaxed">
                    {selectedMeeting.description}
                  </p>
                </div>
              )}

              {/* Participants List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary" /> Scheduled Members
                  </span>
                  <span>
                    {(selectedMeeting.participants?.length || (selectedMeeting.participant ? 1 : 0))} Members
                  </span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {(selectedMeeting.participants && selectedMeeting.participants.length > 0
                    ? selectedMeeting.participants
                    : selectedMeeting.participant
                    ? [selectedMeeting.participant]
                    : []
                  ).map((p) => (
                    <div key={p.id} className="p-2 rounded-lg border bg-muted/30 flex items-center gap-2 text-xs">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-xs">
                        {p.firstName[0]}
                        {p.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {p.firstName} {p.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Organizer Card */}
              <div className="p-2.5 rounded-lg border bg-muted/30 flex items-center gap-2 text-xs">
                <div className="h-7 w-7 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center justify-center shrink-0 border text-xs">
                  {selectedMeeting.organizer?.firstName?.[0] || 'A'}
                  {selectedMeeting.organizer?.lastName?.[0] || ''}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block">Organizer</span>
                  <p className="font-bold text-foreground truncate">
                    {selectedMeeting.organizer
                      ? `${selectedMeeting.organizer.firstName} ${selectedMeeting.organizer.lastName}`
                      : 'Admin'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => window.open(selectedMeeting.googleMeetLink, '_blank')}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Video className="h-4 w-4" />
                  Join Google Meet
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </Button>

                {selectedMeeting.googleCalendarUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(selectedMeeting.googleCalendarUrl, '_blank')}
                    className="w-full gap-2"
                  >
                    <CalendarCheck2 className="h-4 w-4 text-primary" />
                    Open in Google Calendar
                  </Button>
                )}
              </div>

              {/* Status Management */}
              {canCreateMeeting && selectedMeeting.status === 'SCHEDULED' && (
                <div className="pt-3 border-t flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUpdateStatus(selectedMeeting.id, 'COMPLETED');
                      setSelectedMeeting(null);
                    }}
                    className="flex-1 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUpdateStatus(selectedMeeting.id, 'CANCELLED');
                      setSelectedMeeting(null);
                    }}
                    className="flex-1 text-xs gap-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel Meeting
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
