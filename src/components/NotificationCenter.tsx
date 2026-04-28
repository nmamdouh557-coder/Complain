import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { notificationService, Notification } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function NotificationCenter() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevNotificationsCount = useRef(0);
  const mountTime = useRef(new Date());

  useEffect(() => {
    if (!profile) return;

    // Determine target role and filters
    let targetRole = profile.role;
    let filters: { brand?: string, branch?: string } | undefined = undefined;

    if (['admin', 'supervisor', 'manager', 'complaints_team'].includes(profile.role)) {
      targetRole = 'complaints_team';
    } else if (profile.role === 'restaurant_user') {
      targetRole = 'restaurant_user';
      filters = {
        brand: profile.brand,
        branch: profile.branch
      };
    }
    
    const unsubscribe = notificationService.subscribeToNotifications(profile.id, (newNotifications) => {
      // Check for new notifications to play sound and show toast
      if (newNotifications.length > prevNotificationsCount.current) {
        const latest = newNotifications[0];
        if (latest && !latest.isRead) {
          // Verify it's actually new (created after mount)
          const createdAtDate = latest.createdAt ? new Date(latest.createdAt) : new Date();
          const isFresh = createdAtDate.getTime() > (mountTime.current.getTime() - 5000); // 5s buffer

          if (isFresh) {
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.log('Audio play failed', e));
            }
            
            // Determine toast message based on notification type
            let title = "New Notification";
            let description = latest.message;

            if (latest.type === 'COMPLAINT') {
              title = "New Complaint Received";
            } else if (latest.type === 'CATERING') {
              title = "New Catering Request";
            } else if (latest.type === 'PRE_ORDER') {
              title = "New Pre-Order Portal Request";
            }

            toast.info(title, {
              description: description,
              duration: 10000, // Longer duration for visibility
              icon: <Bell className="h-5 w-5 text-primary animate-bounce" />,
              style: {
                borderRadius: '1.5rem',
                border: '1px solid rgba(var(--primary), 0.1)',
                padding: '1.25rem'
              }
            });
          }
        }
      }
      setNotifications(newNotifications);
      prevNotificationsCount.current = newNotifications.length;
    }, filters);

    return () => unsubscribe();
  }, [profile]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <audio ref={audioRef} src={NOTIFICATION_SOUND_URL} />
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="h-6 w-6 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 transition-colors">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-950 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transition-colors"
            >
              <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
                <h3 className="font-bold text-slate-800 dark:text-white transition-colors">Notifications</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors">{unreadCount} unread</span>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 transition-colors">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "p-4 border-b border-slate-50 dark:border-slate-800 transition-colors",
                        notification.isRead ? "bg-white dark:bg-slate-950" : "bg-blue-50/30 dark:bg-blue-900/10"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className={cn(
                          "mt-1 h-2 w-2 rounded-full flex-shrink-0 transition-colors",
                          notification.isRead ? "bg-slate-200 dark:bg-slate-700" : "bg-blue-500"
                        )} />
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm transition-colors",
                            notification.isRead ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-slate-100 font-medium"
                          )}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 transition-colors">
                            By: {notification.createdByUsername}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                             <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors">
                              {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'just now'}
                            </span>
                            {!notification.isRead && (
                              <button 
                                onClick={() => notificationService.markAsRead(notification.id)}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
                              >
                                <Check className="h-3 w-3" />
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
