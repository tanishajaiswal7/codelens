import { getChannel } from '../../../rabbitmq/connection.js'
import { QUEUES, QUEUE_OPTIONS } from '../../../rabbitmq/queues.js'
import { publishEvent } from '../../../rabbitmq/publisher.js'
import { jobService } from '../../job-service/services/jobService.js'
import { reviewService } from '../services/reviewService.js'

export async function startReviewConsumer() {
  const channel = getChannel()

  await channel.assertQueue(QUEUES.REVIEW_JOBS, QUEUE_OPTIONS)
  channel.prefetch(1)

  console.log('[Consumer] Review consumer started')

  channel.consume(QUEUES.REVIEW_JOBS, async (msg) => {
    if (!msg) return

    let payload
    try {
      payload = JSON.parse(msg.content.toString())
    } catch (err) {
      console.error('[ReviewConsumer] Bad message format:', err.message)
      channel.nack(msg, false, false)
      return
    }

    console.log(`[ReviewConsumer] Processing: ${payload.jobId} type: ${payload.type}`)
    await jobService.updateJob(payload.jobId, 'processing', null, null)

    try {
      let result

      // ── RE-REVIEW ──
      if (payload.type === 're-review') {
        result = await reviewService.runReReview(
          payload.userId,
          payload.originalCode,
          payload.updatedCode,
          payload.persona,
          payload.originalSuggestions,
          payload.parentReviewId
        )
      }

      // ── ALL PERSONAS ──
      else if (payload.type === 'all-personas') {
        result = await reviewService.runAllPersonas(
          payload.userId,
          payload.code
        )
      }

      // ── NORMAL REVIEW ──
      else {
        result = await reviewService.runReview(
          payload.userId,
          payload.code,
          payload.persona,
          payload.mode || 'standard',
          payload.workspaceId || null,
          payload.repoFullName || null,
          payload.prNumber || null,
          payload.repoPath || null,
          payload.reviewContext || 'personal'
        )
      }

      // Mark job done
      await jobService.updateJob(payload.jobId, 'done', result, null)
      console.log(`[ReviewConsumer] Completed: ${payload.jobId}`)

      // ── PUBLISH DOWNSTREAM EVENTS ──
      // These happen automatically after every review completes

      // 1. Save to history
      await publishEvent(QUEUES.HISTORY_EVENTS, {
        type: 'review_completed',
        userId: payload.userId,
        reviewId: result.reviewId,
        workspaceId: payload.workspaceId || null,
        persona: payload.persona,
        verdict: result.verdict,
        suggestionCount: result.suggestions?.length || 0,
        createdAt: new Date().toISOString()
      })

      // 2. Update dashboard if this is a workspace review
      if (payload.workspaceId) {
        await publishEvent(QUEUES.DASHBOARD_EVENTS, {
          type: 'workspace_review_completed',
          workspaceId: payload.workspaceId,
          userId: payload.userId,
          reviewId: result.reviewId,
          verdict: result.verdict,
          criticalCount: result.suggestions?.filter(
            s => s.severity === 'critical'
          ).length || 0,
          createdAt: new Date().toISOString()
        })
      }

      // 3. Send notification if critical issues found in workspace
      const criticalCount = result.suggestions?.filter(
        s => s.severity === 'critical'
      ).length || 0

      if (payload.workspaceId && criticalCount > 0) {
        await publishEvent(QUEUES.NOTIFICATION_EVENTS, {
          type: 'critical_issues_found',
          workspaceId: payload.workspaceId,
          userId: payload.userId,
          reviewId: result.reviewId,
          criticalCount,
          prNumber: payload.prNumber || null,
          repoFullName: payload.repoFullName || null,
          verdict: result.verdict,
          createdAt: new Date().toISOString()
        })
      }

      // 4. Notify workspace managers whenever a PR review completes
      if (payload.workspaceId && payload.prNumber) {
        await publishEvent(QUEUES.NOTIFICATION_EVENTS, {
          type: 'pr_reviewed',
          workspaceId: payload.workspaceId,
          userId: payload.userId,
          reviewId: result.reviewId,
          prNumber: payload.prNumber,
          repoFullName: payload.repoFullName || null,
          verdict: result.verdict,
          suggestionCount: result.suggestions?.length || 0,
          criticalCount,
          createdAt: new Date().toISOString()
        })
      }

      // 5. If webhook PR review — post GitHub comment
      if (payload.installationId && payload.prNumber) {
        await publishEvent(QUEUES.WEBHOOK_JOBS, {
          type: 'post_github_comment',
          installationId: payload.installationId,
          repoFullName: payload.repoFullName,
          prNumber: payload.prNumber,
          reviewResult: result,
          createdAt: new Date().toISOString()
        })
      }

      channel.ack(msg)

    } catch (err) {
      console.error(`[ReviewConsumer] Failed: ${payload.jobId}`, err.message)
      await jobService.updateJob(payload.jobId, 'failed', null, err.message)

      // Transient error (network, timeout) — requeue once
      const isTransient = (
        err.message.includes('timeout') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('network') ||
        err.message.includes('fetch failed')
      )

      channel.nack(msg, false, isTransient)
    }
  })
}
