export const QUEUES = {
  // Review jobs — AI review processing
  REVIEW_JOBS: 'review.jobs',

  // Socratic jobs — guided question sessions
  SOCRATIC_JOBS: 'socratic.jobs',

  // After review completes — save to history
  HISTORY_EVENTS: 'history.events',

  // After review completes — update workspace dashboard
  DASHBOARD_EVENTS: 'dashboard.events',

  // After review completes — notify manager of critical issues
  NOTIFICATION_EVENTS: 'notification.events',

  // Webhook triggered PR reviews
  WEBHOOK_JOBS: 'webhook.jobs',
}

// Queue configuration — same settings for all queues
export const QUEUE_OPTIONS = {
  durable: true  // survives RabbitMQ restart
}

// Message persistence — all messages survive RabbitMQ restart
export const MESSAGE_OPTIONS = {
  persistent: true
}