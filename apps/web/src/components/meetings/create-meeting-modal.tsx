'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Video, Calendar, Clock, AlertTriangle, RefreshCw, Link as LinkIcon, Check, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { IMeeting } from '@taskmaster/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated: () => void;
  existingMeetings: IMeeting[];
  defaultDate?: string;
}

function generateRandomGoogleMeetUrl() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${p1}-${p2}-${p3}`;
}

export function CreateMeetingModal({
  isOpen,
  onClose,
  onMeetingCreated,
  existingMeetings,
  defaultDate,
}: CreateMeetingModalProps) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [googleMeetLink, setGoogleMeetLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = defaultDate || new Date().toISOString().split('T')[0] || '';
      setDate(today);
      setGoogleMeetLink(generateRandomGoogleMeetUrl());
      setSelectedUserIds([]);
      setMemberSearch('');

      setLoadingUsers(true);
      apiClient
        .get('/users')
        .then((res) => {
          const fetched = res.data.data?.users || res.data.data || [];
          setUsers(fetched);
        })
        .catch((err) => {
          toast.error(err.message || 'Failed to load organization members');
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [isOpen, defaultDate]);

  // Set of user IDs who currently have an active scheduled meeting
  const busyUserIds = useMemo(() => {
    const set = new Set<string>();
    existingMeetings
      .filter((m) => m.status === 'SCHEDULED')
      .forEach((m) => {
        if (m.participantIds && m.participantIds.length > 0) {
          m.participantIds.forEach((id) => set.add(id));
        }
        if (m.participantId) {
          set.add(m.participantId);
        }
      });
    return set;
  }, [existingMeetings]);

  const filteredUsers = useMemo(() => {
    if (!memberSearch.trim()) return users;
    const lower = memberSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(lower) ||
        u.lastName.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower),
    );
  }, [users, memberSearch]);

  const handleToggleUser = (userId: string) => {
    if (busyUserIds.has(userId)) {
      toast.error('This member already has an active scheduled meeting!');
      return;
    }

    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSelectAllAvailable = () => {
    const availableIds = users.filter((u) => !busyUserIds.has(u.id)).map((u) => u.id);
    setSelectedUserIds(availableIds);
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleRegenerateMeetUrl = () => {
    setGoogleMeetLink(generateRandomGoogleMeetUrl());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one member for the meeting');
      return;
    }

    if (!date || !time) {
      toast.error('Please select date and time for the meeting');
      return;
    }

    try {
      setIsSubmitting(true);
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(durationMinutes, 10) * 60000);

      await apiClient.post('/meetings', {
        title: title.trim(),
        description: description.trim() || undefined,
        participantIds: selectedUserIds,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        googleMeetLink: googleMeetLink.trim() || generateRandomGoogleMeetUrl(),
      });

      toast.success(
        `Meeting scheduled with ${selectedUserIds.length} member(s)! Google Meet notifications sent.`,
      );
      onMeetingCreated();
      onClose();

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedUserIds([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-background border shadow-xl">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Arrange Meeting Setup</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Schedule a Google Meet session with one or multiple team members.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Multi-Select Members Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>Select Members <span className="text-destructive">*</span></span>
                <Badge variant="secondary" className="text-[10px] font-mono ml-1">
                  {selectedUserIds.length} Selected
                </Badge>
              </label>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllAvailable}
                  className="text-primary hover:underline font-medium"
                >
                  Select Available
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Filter Members Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter members by name or email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Member List Grid */}
            <div className="border rounded-xl p-2 bg-muted/20 max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
              {loadingUsers ? (
                <p className="text-xs text-center text-muted-foreground py-4">Loading members...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4">No members found</p>
              ) : (
                filteredUsers.map((u) => {
                  const isBusy = busyUserIds.has(u.id);
                  const isSelected = selectedUserIds.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      onClick={() => !isBusy && handleToggleUser(u.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isBusy
                          ? 'opacity-60 bg-muted/40 cursor-not-allowed border-amber-500/30'
                          : isSelected
                          ? 'bg-primary/10 border-primary/40 font-semibold text-primary'
                          : 'bg-background hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-input bg-background'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>

                      {isBusy && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 shrink-0"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" /> Scheduled
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Meeting Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Meeting Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Q3 Architecture & Design Review Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Agenda & Notes <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Enter meeting agenda or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Date, Time & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Start Time
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="90">1.5 Hours</option>
              </select>
            </div>
          </div>

          {/* Google Meet Link Setup */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-primary" /> Google Meet URL
              </span>
              <button
                type="button"
                onClick={handleRegenerateMeetUrl}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="h-3 w-3" /> Auto-generate link
              </button>
            </label>
            <div className="relative flex items-center">
              <Input
                value={googleMeetLink}
                onChange={(e) => setGoogleMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="pr-10 font-mono text-xs"
                required
              />
              <div className="absolute right-3 text-emerald-500">
                <Video className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A Google Calendar event & Google Meet link will be created and sent directly to all selected members.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedUserIds.length === 0}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Schedule Google Meet ({selectedUserIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
