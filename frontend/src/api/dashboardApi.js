import axiosInstance from '../utils/axiosInstance.js';

const API_BASE = '/api/dashboard';

export const dashboardApi = {
  async getStats(workspaceId) {
    const response = await axiosInstance.get(`${API_BASE}/${workspaceId}`);
    return response.data;
  },

  async getAllPRs(workspaceId) {
    const response = await axiosInstance.get(`${API_BASE}/${workspaceId}/prs`);
    return response.data.prs;
  },

  async generateReport(workspaceId, sprintName, selectedReviewId = 'all') {
    const response = await axiosInstance.post(`${API_BASE}/${workspaceId}/report`, {
      sprintName,
      selectedReviewId,
    });
    return response.data.report;
  },

  async cleanupDuplicates(workspaceId) {
    const response = await axiosInstance.post(`${API_BASE}/${workspaceId}/cleanup-duplicates`);
    return response.data;
  },

  async getReports(workspaceId) {
    const response = await axiosInstance.get(`${API_BASE}/${workspaceId}/reports`);
    return response.data.reports;
  },

  async getReport(workspaceId, reportId) {
    const response = await axiosInstance.get(`${API_BASE}/${workspaceId}/reports/${reportId}`);
    return response.data.report;
  },

  async deleteReport(workspaceId, reportId) {
    const response = await axiosInstance.delete(`${API_BASE}/${workspaceId}/reports/${reportId}`);
    return response.data;
  },

  async makeDecision(workspaceId, reviewId, decision, feedback) {
    const response = await axiosInstance.post(
      `${API_BASE}/${workspaceId}/reviews/${reviewId}/decision`,
      { decision, feedback }
    );
    return response.data;
  },
};