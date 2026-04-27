const jobStore = new Map();

export const jobService = {
  async createJob(jobId, userId, type) {
    jobStore.set(jobId, {
      jobId,
      userId: String(userId),
      type,
      status: 'queued',
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return jobStore.get(jobId);
  },

  async updateJob(jobId, status, result = null, error = null) {
    const job = jobStore.get(jobId);
    if (!job) {
      return null;
    }

    job.status = status;
    job.result = result;
    job.error = error;
    job.updatedAt = new Date().toISOString();
    jobStore.set(jobId, job);
    return job;
  },

  async getJob(jobId, userId) {
    const job = jobStore.get(jobId);
    if (!job) {
      return null;
    }

    if (String(job.userId) !== String(userId)) {
      return null;
    }

    return job;
  },
};
