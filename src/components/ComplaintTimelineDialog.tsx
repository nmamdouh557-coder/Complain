import React from 'react';
import { 
  X, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Send, 
  Flag, 
  MessageSquare,
  ClipboardCheck,
  Ban
} from 'lucide-react';
import { cn, formatKuwaitDate } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Complaint } from '@/types';
import { useApp } from '@/contexts/AppContext';

interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  user?: string | null;
  icon: React.ReactNode;
  color: string;
}

interface ComplaintTimelineDialogProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ComplaintTimelineDialog({ 
  complaint, 
  isOpen, 
  onClose 
}: ComplaintTimelineDialogProps) {
  const { t } = useApp();

  if (!complaint) return null;

  // Build timeline events from available data
  const events: TimelineEvent[] = [
    {
      id: 'reg',
      type: 'registered',
      date: complaint.createdAt,
      user: complaint.creatorUsername || 'System',
      icon: <ClipboardCheck className="h-4 w-4" />,
      color: 'bg-blue-500'
    }
  ];

  if (complaint.branchResponseAt && complaint.branchResponseAt !== 'N/A') {
    events.push({
      id: 'branch',
      type: 'branch_responded',
      date: complaint.branchResponseAt,
      user: complaint.branch,
      icon: <MapPin className="h-4 w-4" />,
      color: 'bg-emerald-500'
    });
  }

  if (complaint.escalationTimestamp && complaint.escalationTimestamp !== 'N/A') {
    events.push({
      id: 'escalate',
      type: 'escalated',
      date: complaint.escalationTimestamp,
      user: complaint.adminNotesByUsername || complaint.creatorUsername,
      icon: <Send className="h-4 w-4" />,
      color: 'bg-rose-500'
    });
  }

  if (complaint.flagNoteTimestamp && complaint.flagNoteTimestamp !== 'N/A') {
    events.push({
      id: 'flag',
      type: 'flagged',
      date: complaint.flagNoteTimestamp,
      user: complaint.adminNotesByUsername || complaint.updatedByUsername,
      icon: <Flag className="h-4 w-4" />,
      color: 'bg-amber-500'
    });
  }

  // Group Validated, Followed Up, and Closed into one "Closed" state
  const closeEquivalentEvents = [];
  if (complaint.validationTimestamp && complaint.validationTimestamp !== 'N/A') {
    closeEquivalentEvents.push({ 
      date: complaint.validationTimestamp, 
      user: complaint.closedByUsername || complaint.updatedByUsername || 'System' 
    });
  }
  if (complaint.followUpTimestamp && complaint.followUpTimestamp !== 'N/A') {
    closeEquivalentEvents.push({ 
      date: complaint.followUpTimestamp, 
      user: 'Customer Service' 
    });
  }
  if (complaint.closedAt && complaint.closedAt !== 'N/A') {
    closeEquivalentEvents.push({ 
      date: complaint.closedAt, 
      user: complaint.closedByUsername || 'System' 
    });
  }

  if (closeEquivalentEvents.length > 0) {
    // Pick the latest one
    const latest = closeEquivalentEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    events.push({
      id: 'close',
      type: 'closed',
      date: latest.date,
      user: latest.user,
      icon: <Ban className="h-4 w-4" />,
      color: 'bg-slate-700'
    });
  }

  // Sort events by date
  const sortedEvents = events
    .filter(e => e.date && e.date !== 'N/A')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-none shadow-2xl p-0 overflow-hidden transition-colors">
        <DialogHeader className="p-6 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 transition-colors">
          <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
            <Clock className="h-5 w-5" />
            {t('complaint_timeline')}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4 text-slate-400" />
          </Button>
        </DialogHeader>

        <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="mb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {t('timeline_description')}
            </p>
          </div>

          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
            {sortedEvents.map((event) => (
              <div key={event.id} className="relative flex items-center justify-between group">
                {/* Icon Circle */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-950 shadow shrink-0 transition-all duration-500 z-10",
                  event.color,
                  "text-white"
                )}>
                  {event.icon}
                </div>

                {/* Content */}
                <div className="w-[calc(100%-3rem)] p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md ml-4">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{t(event.type)}</div>
                    <time className={cn(
                      "font-mono text-[10px] font-bold p-1 bg-slate-50 dark:bg-slate-800 rounded transition-colors",
                      "text-slate-500 dark:text-slate-400"
                    )}>
                      {formatKuwaitDate(event.date)}
                    </time>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium flex items-center gap-1">
                    {t('by')}: <span className="text-slate-700 dark:text-slate-300 font-bold">{event.user || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center transition-colors">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {complaint.complaintNumber}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
