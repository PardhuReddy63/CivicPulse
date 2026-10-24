const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export class ApiClient {
  static getToken() {
    return localStorage.getItem('civicpulse_jwt_token');
  }

  static setToken(token) {
    localStorage.setItem('civicpulse_jwt_token', token);
  }

  static clearToken() {
    localStorage.removeItem('civicpulse_jwt_token');
    localStorage.removeItem('civicpulse_current_user_v1');
  }

  static async request(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      throw new Error(data?.error?.message || `API request failed (${response.status}).`);
    }
    return data;
  }

  static async register(payload) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  }

  static async verifyOtp(payload) {
    return this.request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) });
  }

  static async resendOtp(payload) {
    return this.request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(payload) });
  }

  static async login(payload) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  }

  static async currentUser() {
    return this.request('/auth/me');
  }

  static async listComplaints(role) {
    const endpoint =
      role === 'ADMIN'
        ? '/complaints?limit=500'
        : role === 'OFFICER'
          ? '/complaints/assigned?limit=500'
          : '/complaints/mine?limit=500';
    return this.request(endpoint);
  }

  static async listUsers() {
    return this.request('/users?limit=500');
  }

  static async listOfficers() {
    return this.request('/users/officers/active');
  }

  static async listDepartments() {
    return this.request('/users/meta/departments');
  }

  static async listOfficerWorkload() {
    return this.request('/reports/officers');
  }

  static async listAuditLogs() {
    return this.request('/users/audit?limit=100');
  }

  static async complaintDetails(complaintId) {
    return this.request(`/complaints/${complaintId}`);
  }

  static async complaintHistory(complaintId) {
    return this.request(`/complaints/${complaintId}/history`);
  }

  static async createComplaint(formData) {
    return this.request('/complaints', { method: 'POST', body: formData });
  }

  static async assignComplaint(complaintId, payload) {
    return this.request(`/complaints/${complaintId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async updateOfficerPriority(complaintId, priority) {
    return this.request(`/complaints/${complaintId}/officer-priority`, {
      method: 'PUT',
      body: JSON.stringify({ officer_priority: priority }),
    });
  }

  static async updateUserRole(userId, role, department_id) {
    return this.request(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, department_id }),
    });
  }

  static async updateUserActive(userId, active) {
    return this.request(`/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  }

  static async resolveComplaint(complaintId, notes, afterImage) {
    const formData = new FormData();
    formData.append('resolved_notes', notes);
    if (afterImage instanceof File) formData.append('after_image', afterImage);
    return this.request(`/complaints/${complaintId}/resolve`, {
      method: 'POST',
      body: formData,
    });
  }

  static async submitFeedback(complaintId, rating, feedbackText) {
    return this.request(`/complaints/${complaintId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback_text: feedbackText }),
    });
  }

  static async exportExcel() {
    const response = await fetch(`${API_BASE}/reports/export.xlsx`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error?.message || 'Report export failed.');
    }
    return response.blob();
  }
}
