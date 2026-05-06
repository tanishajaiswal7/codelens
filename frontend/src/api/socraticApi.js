import axiosInstance from '../utils/axiosInstance'

const socraticApi = {
  startSession: (code, persona, context = null) =>
    axiosInstance.post('/api/socratic/start', {
      code,
      persona,
      ...(context && { context }),
    })
      .then(r => {
        console.log('[socraticApi] startSession response:', r.data);
        return r.data;
      })
      .catch(err => {
        console.error('[socraticApi] startSession error:', err.response?.data || err.message);
        throw err;
      }),

  sendReply: (sessionId, userMessage, currentCode = null) =>
    axiosInstance.post('/api/socratic/reply', {
      sessionId,
      userMessage,
      ...(currentCode && { currentCode }),
    })
      .then(r => r.data)
      .catch(err => {
        console.error('[socraticApi] sendReply error:', err.response?.data || err.message);
        throw err;
      }),

  getSession: (sessionId) =>
    axiosInstance.get(`/api/socratic/session/${sessionId}`)
      .then(r => r.data)
      .catch(err => {
        console.error('[socraticApi] getSession error:', err.response?.data || err.message);
        throw err;
      }),

  extendSession: (sessionId, additionalTurns) =>
    axiosInstance.post('/api/socratic/extend', {
      sessionId,
      additionalTurns,
    })
      .then(r => r.data)
      .catch(err => {
        console.error('[socraticApi] extendSession error:', err.response?.data || err.message);
        throw err;
      }),
}

export default socraticApi
export { socraticApi }
