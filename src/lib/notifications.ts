import { api } from './api';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
  createdByUsername?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async sendNotification(data: {
    recipientRole: string;
    message: string;
    title?: string;
    createdBy: string;
    createdByUsername?: string;
    complaintId?: string;
    relatedId?: string;
    brand?: string;
    branch?: string;
    type?: string;
  }) {
    try {
      // Mapping to backend expectation
      await api.sendNotification({
        ...data,
        relatedId: data.relatedId || data.complaintId,
        createdByUsername: data.createdByUsername
      });
    } catch (error) {
      console.error('Failed to send notification via backend:', error);
    }
  },

  // Real-time via polling for now since we moved away from Firestore
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: Notification[]) => void,
    filters?: { brand?: string; branch?: string }
  ) {
    if (!userId) return () => {};

    const fetchNotifications = async () => {
      try {
        const notifications = await api.getNotifications(userId);
        callback(notifications);
      } catch (error) {
        console.error('Failed to poll notifications:', error);
      }
    };

    // Initial fetch
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  },

  async markAsRead(notificationId: string) {
    try {
      await api.markNotificationRead(Number(notificationId), true);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      await api.markAllNotificationsRead(userId);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }
};
