import axiosInstance from '../utils/axiosInstance.js';

export const workspaceApi = {
  createWorkspace: (name, repoUrl) =>
    axiosInstance.post('/api/workspace', { name, repoUrl }).then((r) => r.data),

  getMyWorkspaces: () =>
    axiosInstance.get('/api/workspace').then((r) => r.data),

  getDetails: (workspaceId) =>
    axiosInstance.get(`/api/workspace/${workspaceId}`).then((r) => r.data),

  getWorkspace: (id) =>
    axiosInstance.get(`/api/workspace/${id}`).then((r) => r.data),

  inviteMember: (workspaceId, email) =>
    axiosInstance.post(`/api/workspace/${workspaceId}/invite`, { email }).then((r) => r.data),

  generateInviteLink: (workspaceId) =>
    axiosInstance.post(`/api/workspace/${workspaceId}/invite-link`).then((r) => r.data),

  getInviteLink: (workspaceId) =>
    axiosInstance.get(`/api/workspace/${workspaceId}/invite-link`).then((r) => r.data),

  deleteInviteLink: (workspaceId) =>
    axiosInstance.delete(`/api/workspace/${workspaceId}/invite-link`).then((r) => r.data),

  getPendingInvites: (workspaceId) =>
    axiosInstance.get(`/api/workspace/${workspaceId}/pending-invites`).then((r) => r.data),

  deletePendingInvite: (workspaceId, inviteId) =>
    axiosInstance.delete(`/api/workspace/${workspaceId}/pending-invites/${inviteId}`).then((r) => r.data),

  acceptInvite: (token) =>
    axiosInstance.get(`/api/workspace/join/${token}`).then((r) => r.data),

  leaveWorkspace: (id) =>
    axiosInstance.delete(`/api/workspace/${id}/leave`).then((r) => r.data),

  getMembers: (id) =>
    axiosInstance.get(`/api/workspace/${id}/members`).then((r) => r.data),

  getOpenPRs: (workspaceId) =>
    axiosInstance.get(`/api/workspace/${workspaceId}/pulls`).then((r) => r.data),

  reviewPR: (workspaceId, prNumber, persona) =>
    axiosInstance.post(
      `/api/workspace/${workspaceId}/pulls/${prNumber}/review`,
      { persona }
    ).then((r) => r.data),

  updateRepo: (workspaceId, repoUrl) =>
    axiosInstance.patch(
      `/api/workspace/${workspaceId}/repo`,
      { repoUrl }
    ).then((r) => r.data),
};
