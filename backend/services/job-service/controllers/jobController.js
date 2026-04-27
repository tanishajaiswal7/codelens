import { jobService } from '../services/jobService.js';

export const jobController = {
  async getJob(req, res, next) {
    try {
      const { jobId } = req.params;
      const job = await jobService.getJob(jobId, req.userId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.json({
        jobId: job.jobId,
        status: job.status,
        result: job.result,
        error: job.error,
      });
    } catch (error) {
      return next(error);
    }
  },
};
