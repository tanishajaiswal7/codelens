export function pollJob(
  jobId,
  onResult,
  onError,
  intervalMs = 1500,
  maxAttempts = 60
) {
  let attempts = 0
  let cancelled = false

  const interval = setInterval(async () => {
    if (cancelled) return

    attempts++

    if (attempts > maxAttempts) {
      clearInterval(interval)
      onError('Request timed out after 90 seconds. Please try again.')
      return
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        if (res.status === 404) {
          // Job not created yet — keep polling
          return
        }
        throw new Error(`Job poll failed: ${res.status}`)
      }

      const job = await res.json()

      if (job.status === 'done') {
        clearInterval(interval)
        onResult(job.result)
      } else if (job.status === 'failed') {
        clearInterval(interval)
        onError(job.error || 'Job failed')
      }
      // queued/processing: keep polling
    } catch (err) {
      console.error('[jobPoller] Error:', err.message)
      // Don't stop polling on network errors — keep trying
    }
  }, intervalMs)

  // Return cancel function
  return () => {
    cancelled = true
    clearInterval(interval)
  }
}
