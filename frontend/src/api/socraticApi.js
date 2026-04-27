import axiosInstance from '../utils/axiosInstance.js';

export const socraticApi = {
  startSession: (code, persona, context = null) =>
    axiosInstance.post('/api/socratic/start', {
      code,
      persona,
      ...(context && { context }),
    }).then(r => r.data),
  sendReply: (sessionId, userMessage, codeSnapshot = null) =>
    axiosInstance.post('/api/socratic/reply', { sessionId, userMessage, codeSnapshot })
      .then(r => r.data),
  getSession: (sessionId) =>
    axiosInstance.get(`/api/socratic/session/${sessionId}`)
      .then(r => r.data),
};
