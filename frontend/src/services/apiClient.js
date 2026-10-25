
const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
).replace(/\/+$/, '');

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

  static async parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    return null;
  }

  static async request(endpoint, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = this.getToken();
    const isFormData =
      typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (options.body != null && !isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response;

    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      throw new Error(
        'Unable to reach the CivicPulse API. Check that the backend is running and the API URL is correct.'
      );
    }

    const data = await this.parseResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          data?.error?.message || 'Your session is invalid or has expired. Please log in again.'
        );
      }

      throw new Error(
        data?.error?.message || `API request failed (${response.status}).`
      );
    }

    return data;
  }

  static async fetchEvidence(complaintId, type, signal) {
    const headers = {};
    const token = this.getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const endpoint =
      `${API_BASE}/complaints/${encodeURIComponent(complaintId)}` +
      `/evidence/${encodeURIComponent(type)}`;

    let response;

    try {
      response = await fetch(endpoint, { headers, signal });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      throw new Error('Unable to reach the API to retrieve grievance evidence.');
    }

    if (!response.ok) {
      const data = await this.parseResponse(response);
      throw new Error(
        data?.error?.message ||
          `Evidence request failed (${response.status}).`
      );
    }

    return response.blob();
  }

  static async register(payload) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async verifyOtp(payload) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async resendOtp(payload) {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async login(payload) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async activateOfficer(token, password) {
    return this.request('/auth/officer/activate', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  static async currentUser() {
    return this.request('/auth/me');
  }

  static async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async resetPassword(token, password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  static async changePassword(currentPassword, newPassword, confirmPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
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

  static async listOfficerApplications(status = 'ALL', page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (status !== 'ALL') {
      params.set('status', status);
    }

    return this.request(
      `/officer-registrations/admin?${params.toString()}`
    );
  }

  static async reviewOfficerApplication(requestId, status, review_notes = '') {
    return this.request(
      `/officer-registrations/admin/${encodeURIComponent(requestId)}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, review_notes }),
      }
    );
  }

  static async submitOfficerApplication(payload) {
    return this.request('/officer-registrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async complaintDetails(complaintId) {
    return this.request(`/complaints/${complaintId}`);
  }

  static async complaintHistory(complaintId) {
    return this.request(`/complaints/${complaintId}/history`);
  }

  static async createComplaint(formData) {
    return this.request('/complaints', {
      method: 'POST',
      body: formData,
    });
  }

  static async assignComplaint(complaintId, payload) {
    return this.request(`/complaints/${complaintId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async reviewResolution(complaintId, payload) {
    return this.request(`/complaints/${complaintId}/review-resolution`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async verifyResolution(complaintId, payload) {
    return this.request(`/complaints/${complaintId}/verify-resolution`, {
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

  static async startWork(complaintId) {
    return this.request(`/complaints/${complaintId}/start-work`, {
      method: 'POST',
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

    if (typeof Blob !== 'undefined' && afterImage instanceof Blob) {
      formData.append('after_image', afterImage);
    }

    return this.request(`/complaints/${complaintId}/resolve`, {
      method: 'POST',
      body: formData,
    });
  }

  static async submitFeedback(complaintId, rating, feedbackText) {
    return this.request(`/complaints/${complaintId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        rating,
        feedback_text: feedbackText,
      }),
    });
  }

  static async exportExcel() {
    const headers = {};
    const token = this.getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
      response = await fetch(`${API_BASE}/reports/export.xlsx`, { headers });
    } catch {
      throw new Error('Unable to reach the API to export the report.');
    }

    if (!response.ok) {
      const data = await this.parseResponse(response);

      throw new Error(
        data?.error?.message || 'Report export failed.'
      );
    }

    return response.blob();
  }
}
