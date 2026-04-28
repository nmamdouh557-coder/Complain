import { UserProfile, Complaint, Configuration, ManagerRequest, Suggestion } from '@/types';

const API_BASE = '/api';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (retries > 0 && error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn(`Fetch failed for ${url}, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

const getCurrentUserId = () => {
  const userStr = localStorage.getItem('cms_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id || user.username;
    } catch (e) {
      return null;
    }
  }
  return null;
};

let forbiddenCallback: (() => void) | null = null;

export const api = {
  onForbidden(callback: () => void) {
    forbiddenCallback = callback;
  },

  async login(username: string, pass: string): Promise<UserProfile> {
    const res = await fetchWithRetry(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass }),
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 403 && forbiddenCallback) {
        forbiddenCallback();
      }
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Invalid credentials');
      } catch {
        throw new Error(`Login failed with status ${res.status}: ${text.substring(0, 50)}`);
      }
    }
    try {
      const data = JSON.parse(text);
      return data.user;
    } catch {
      throw new Error(`Invalid server response during login: ${text.substring(0, 50)}`);
    }
  },

  async getUsers(): Promise<UserProfile[]> {
    const userId = getCurrentUserId();
    const res = await fetchWithRetry(`${API_BASE}/users?userId=${userId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      if (res.status === 403) {
        console.warn('Access forbidden when fetching users. Session might be invalid.');
        if (forbiddenCallback) forbiddenCallback();
      }
      const text = await res.text();
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to fetch users');
      } catch {
        throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      }
    }
    return res.json();
  },

  async createUser(userData: any): Promise<UserProfile> {
    const res = await fetchWithRetry(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, actorId: getCurrentUserId() }),
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to create user');
      } catch {
        throw new Error(`User creation failed with status ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response during user creation');
    }
  },

  async deleteUser(id: string): Promise<void> {
    const userId = getCurrentUserId();
    const res = await fetchWithRetry(`${API_BASE}/users/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete user');
  },

  async updateUser(id: string, userData: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, actorId: getCurrentUserId() }),
    });
    if (!res.ok) throw new Error('Failed to update user');
  },

  async getComplaints(status?: string, userId?: string): Promise<Complaint[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (userId) params.append('userId', userId);
    const url = `${API_BASE}/complaints?${params.toString()}`;
    try {
      const res = await fetchWithRetry(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error: ${res.status} for ${url}. Body:`, text.substring(0, 500));
        try {
          const error = JSON.parse(text);
          throw new Error(error.message || `Server error: ${res.status}`);
        } catch {
          throw new Error(`Failed to fetch complaints: ${res.status} ${res.statusText}`);
        }
      }
      
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse JSON for URL:", url, "Content starts with:", text.substring(0, 100));
        throw new Error(`Invalid JSON response from ${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    } catch (error) {
      console.error("Fetch error for getComplaints:", error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error("Network error: Could not reach the server. Please check if the backend is running.");
      }
      throw error;
    }
  },

  async searchComplaints(query: { orderId?: string; phone?: string; userId?: string }): Promise<Complaint[]> {
    const params = new URLSearchParams();
    if (query.orderId) params.append('orderId', query.orderId);
    if (query.phone) params.append('phone', query.phone);
    if (query.userId) params.append('userId', query.userId);
    const res = await fetchWithRetry(`${API_BASE}/complaints/search?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Search failed');
      } catch {
        throw new Error(`Search failed with status ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  async getComplaintById(id: string): Promise<Complaint> {
    const res = await fetchWithRetry(`${API_BASE}/complaints/${id}`, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Complaint not found');
      } catch {
        throw new Error(`Failed to fetch complaint with status ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response for complaint details');
    }
  },

  async createComplaint(complaint: any): Promise<{ id: number; complaintNumber: string }> {
    const res = await fetchWithRetry(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complaint),
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to create complaint');
      } catch {
        throw new Error(`Complaint creation failed with status ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response during complaint creation');
    }
  },

  async bulkCreateComplaints(data: { complaints: any[]; createdByUid: string; creatorUsername: string }): Promise<{ success: number; failed: number; errors: string[] }> {
    const res = await fetchWithRetry(`${API_BASE}/complaints/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Bulk creation failed');
      } catch {
        throw new Error(`Bulk creation failed with status ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response during bulk creation');
    }
  },

  async deleteComplaint(id: number | string): Promise<void> {
    const userId = getCurrentUserId();
    const res = await fetchWithRetry(`${API_BASE}/complaints/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete complaint');
  },

  async deleteAllComplaints(): Promise<void> {
    const userId = getCurrentUserId();
    const res = await fetchWithRetry(`${API_BASE}/complaints?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete all complaints');
  },

  async updateComplaint(id: number | string, updates: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update complaint');
  },

  async getConfigs(): Promise<Configuration[]> {
    const url = `${API_BASE}/config`;
    const res = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`API Error: ${res.status} for ${url}. Body:`, text.substring(0, 500));
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to fetch configurations');
      } catch {
        throw new Error(`Failed to fetch configurations: ${res.status} ${res.statusText}`);
      }
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("Failed to parse JSON for URL:", url, "Content starts with:", text.substring(0, 100));
      throw new Error(`Invalid JSON response from ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  async setConfig(key: string, value: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, userId: getCurrentUserId() }),
    });
    if (!res.ok) throw new Error('Failed to update configuration');
  },

  async getManagerRequests(userId?: string): Promise<ManagerRequest[]> {
    const url = userId ? `${API_BASE}/manager-requests?userId=${userId}` : `${API_BASE}/manager-requests`;
    const res = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to fetch manager requests');
      } catch {
        throw new Error(`Failed to fetch manager requests: ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  async createManagerRequest(request: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/manager-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to create request');
  },

  async updateManagerRequest(id: number, data: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/manager-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update request');
  },

  async getSuggestions(): Promise<Suggestion[]> {
    const res = await fetchWithRetry(`${API_BASE}/suggestions`, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to fetch suggestions');
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  async createSuggestion(suggestion: Partial<Suggestion>): Promise<{ id: string; success: boolean }> {
    const res = await fetchWithRetry(`${API_BASE}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to create suggestion');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response for suggestion creation');
    }
  },

  async updateSuggestion(id: string, updates: Partial<Suggestion>): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update suggestion');
  },

  async deleteSuggestion(id: string): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/suggestions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete suggestion');
  },

  // Catering APIs
  async getCateringRequests(): Promise<any[]> {
    const res = await fetchWithRetry(`${API_BASE}/catering/requests`, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to fetch catering requests');
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  async createCateringRequest(request: any): Promise<any> {
    const res = await fetchWithRetry(`${API_BASE}/catering/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to create catering request');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response for catering request creation');
    }
  },

  async updateCateringRequest(id: number | string, updates: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/catering/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update catering request');
  },

  async getCateringAvailability(): Promise<any[]> {
    const res = await fetchWithRetry(`${API_BASE}/catering/availability`, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to fetch catering availability');
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  async createCateringAvailability(availability: any): Promise<any> {
    const res = await fetchWithRetry(`${API_BASE}/catering/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(availability),
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to create catering availability');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response for catering availability creation');
    }
  },

  async getCateringLogs(requestId: number | string): Promise<any[]> {
    const res = await fetchWithRetry(`${API_BASE}/catering/logs/${requestId}`);
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to fetch catering logs');
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  // Notifications
  async getNotifications(userId: string): Promise<any[]> {
    const url = `${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`;
    try {
      const res = await fetchWithRetry(url, {
        headers: { 'Accept': 'application/json' }
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`API Error: ${res.status} for ${url}. Body:`, text.substring(0, 500));
        try {
          const error = JSON.parse(text);
          throw new Error(error.message || `Server error: ${res.status}`);
        } catch {
          throw new Error(`Failed to fetch notifications: ${res.status}`);
        }
      }
      try {
        return JSON.parse(text);
      } catch {
        return [];
      }
    } catch (error) {
      console.error("Fetch error for getNotifications:", error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error("Network error: Could not reach the server. Please check if the backend is running.");
      }
      throw error;
    }
  },

  async markNotificationRead(id: number, isRead: boolean = true): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead }),
    });
    if (!res.ok) throw new Error('Failed to update notification');
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to mark all as read');
  },

  async sendNotification(data: any): Promise<void> {
    const res = await fetchWithRetry(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to send notification');
  },

  // Pre-Order APIs
  async getPreOrders(brand?: string, branch?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (brand) params.append('brand', brand);
    if (branch) params.append('branch', branch);
    const res = await fetchWithRetry(`${API_BASE}/pre-orders?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to fetch pre-orders');
    try {
      return JSON.parse(text);
    } catch {
      return [];
    }
  },

  async createPreOrder(order: any): Promise<{ id: number; success: boolean }> {
    const res = await fetchWithRetry(`${API_BASE}/pre-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Failed to create pre-order');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid server response for pre-order creation');
    }
  },

  async uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const res = await fetchWithRetry(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const text = await res.text();
      let errorMessage = 'Failed to upload files';
      try {
        const error = JSON.parse(text);
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = `Upload failed with status ${res.status}: ${text.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }
    
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return data.urls;
    } catch (err) {
      console.error("Failed to parse upload response:", text.substring(0, 100));
      throw new Error(`Invalid JSON response from upload API: ${err instanceof Error ? err.message : String(err)}`);
    }
  },

  async updateProfile(id: string, data: { username?: string; password?: string }): Promise<UserProfile> {
    const res = await fetchWithRetry(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    
    const text = await res.text();
    if (!res.ok) {
      try {
        const error = JSON.parse(text);
        throw new Error(error.message || 'Failed to update profile');
      } catch {
        throw new Error(`Profile update failed with status ${res.status}`);
      }
    }
    
    try {
      const result = JSON.parse(text);
      return result.user;
    } catch {
      throw new Error('Invalid server response during profile update');
    }
  }
};
