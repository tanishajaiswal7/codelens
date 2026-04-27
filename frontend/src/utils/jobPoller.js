export function pollJob(jobId, onResult, onError) {
  const intervalId = setInterval(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/jobs/${jobId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to poll job status')
      }

      const data = await response.json()

      if (data.status === 'done') {
        clearInterval(intervalId)
        onResult(data.result)
      } else if (data.status === 'failed') {
        clearInterval(intervalId)
        onError(data.error || 'Job failed')
      }
    } catch (pollError) {
      clearInterval(intervalId)
      onError(pollError.message || 'Failed to poll job status')
    }
  }, 1200)

  return () => clearInterval(intervalId)
}
