import { ApiClient } from './apiClient';

const CURRENT_USER_KEY = 'civicpulse_current_user_v1';

class CivicPulseStore {
  constructor() {
    this.currentUser = null;
    this.complaints = [];
    this.users = [];
    this.departments = [];
    this.workloads = [];
    this.auditLogs = [];
    this.details = new Map();
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async restoreSession() {
    if (!ApiClient.getToken()) return null;
    try {
      const response = await ApiClient.currentUser();
      this.setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      ApiClient.clearToken();
      this.currentUser = null;
      this.notify();
      throw error;
    }
  }

  setCurrentUser(user) {
    this.currentUser = user || null;
    if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CURRENT_USER_KEY);
    this.notify();
  }

  async login(identifier, password) {
    const response = await ApiClient.login({ identifier, password });
    ApiClient.setToken(response.data.token);
    this.setCurrentUser(response.data.user);
    try {
      await this.loadUserData(response.data.user);
    } catch (error) {
      this.logout();
      throw error;
    }
    return response.data.user;
  }

  async registerCitizen(name, email, password) {
    const response = await ApiClient.register({ name, email, password, role: 'CITIZEN' });
    return response.data;
  }

  async verifyOtp(email, otp) {
    const response = await ApiClient.verifyOtp({ email, otp });
    return response.data;
  }

  async resendOtp(email) {
    const response = await ApiClient.resendOtp({ email });
    return response.data;
  }

  async requestPasswordReset(email) {
    const response = await ApiClient.forgotPassword(email);
    return response.data;
  }

  async resetPassword(token, password) {
    const response = await ApiClient.resetPassword(token, password);
    return response.data;
  }

  async activateOfficer(token, password) {
    const response = await ApiClient.activateOfficer(token, password);
    return response.data;
  }

  async changePassword(currentPassword, newPassword, confirmPassword) {
    const response = await ApiClient.changePassword(currentPassword, newPassword, confirmPassword);
    return response.data;
  }

  logout() {
    ApiClient.clearToken();
    this.currentUser = null;
    this.complaints = [];
    this.users = [];
    this.departments = [];
    this.workloads = [];
    this.auditLogs = [];
    this.details.clear();
    this.notify();
  }

  async loadUserData(user = this.currentUser) {
    if (!user) return;
    const [complaintsResult, departmentsResult] = await Promise.all([
      ApiClient.listComplaints(user.role),
      ApiClient.listDepartments(),
    ]);
    this.complaints = complaintsResult.data || [];
    this.departments = departmentsResult.data || [];

    if (user.role === 'ADMIN') {
      const [usersResult, workloadsResult, auditResult] = await Promise.all([
        ApiClient.listUsers(),
        ApiClient.listOfficerWorkload(),
        ApiClient.listAuditLogs(),
      ]);
      this.users = usersResult.data || [];
      this.workloads = workloadsResult.data || [];
      this.auditLogs = auditResult.data || [];
    } else {
      this.users = [];
      this.workloads = [];
      this.auditLogs = [];
    }
    this.notify();
  }

  async refreshComplaints() {
    if (!this.currentUser) return;
    const result = await ApiClient.listComplaints(this.currentUser.role);
    this.complaints = result.data || [];
    this.notify();
  }

  getUsers() {
    return this.users;
  }

  getDepartments() {
    return this.departments;
  }

  getComplaints() {
    return this.complaints;
  }

  getStatusHistory(complaintId) {
    return this.details.get(String(complaintId))?.history || [];
  }

  getFeedback(complaintId) {
    return this.details.get(String(complaintId))?.feedback || [];
  }

  getAuditLogs() {
    return this.auditLogs;
  }

  async loadComplaintDetails(complaintId) {
    const [detailResult, historyResult] = await Promise.all([
      ApiClient.complaintDetails(complaintId),
      ApiClient.complaintHistory(complaintId),
    ]);
    const detail = detailResult.data;
    this.details.set(String(complaintId), {
      history: historyResult.data || [],
      feedback: detail.feedback_history || [],
    });
    return detail;
  }

  async createComplaint(data) {
    const formData = new FormData();
    for (const field of ['title', 'description', 'category', 'sub_category', 'location']) {
      if (data[field] !== undefined && data[field] !== null) formData.append(field, data[field]);
    }
    formData.append('latitude', String(data.latitude));
    formData.append('longitude', String(data.longitude));
    if (data.imageFile) formData.append('image', data.imageFile);
    const response = await ApiClient.createComplaint(formData);
    await this.refreshComplaints();
    return response.data;
  }

  async assignComplaint(complaintId, officerId, priority, deadline) {
    const response = await ApiClient.assignComplaint(complaintId, {
      officer_id: officerId,
      priority,
      deadline,
    });
    await this.loadUserData();
    return response.data;
  }

  async updateOfficerPriority(complaintId, priority) {
    const response = await ApiClient.updateOfficerPriority(complaintId, priority);
    await this.refreshComplaints();
    return response.data;
  }

  async resolveComplaint(complaintId, notes, afterImage) {
    const response = await ApiClient.resolveComplaint(complaintId, notes, afterImage);
    await this.refreshComplaints();
    return response.data;
  }

  async submitFeedback(complaintId, rating, feedbackText) {
    const response = await ApiClient.submitFeedback(complaintId, rating, feedbackText);
    await this.refreshComplaints();
    return response.data;
  }

  async setUserRole(userId, role, departmentId) {
    const response = await ApiClient.updateUserRole(userId, role, departmentId);
    await this.loadUserData();
    return response.data;
  }

  async toggleUserActive(userId) {
    const user = this.users.find((entry) => String(entry.user_id) === String(userId));
    if (!user) throw new Error('User not found.');
    const response = await ApiClient.updateUserActive(userId, !Boolean(user.active));
    await this.loadUserData();
    return response.data;
  }

  getTotals() {
    return this.complaints.reduce(
      (totals, complaint) => {
        totals[complaint.status] = (totals[complaint.status] || 0) + 1;
        totals.TOTAL += 1;
        return totals;
      },
      { PENDING: 0, ASSIGNED: 0, RESOLVED: 0, TOTAL: 0 }
    );
  }

  getOfficerWorkload() {
    return this.workloads;
  }

  async exportToExcel() {
    const blob = await ApiClient.exportExcel();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civicpulse_report_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export const store = new CivicPulseStore();
