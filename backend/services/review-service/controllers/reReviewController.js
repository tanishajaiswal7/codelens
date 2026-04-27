import { v4 as uuidv4 } from 'uuid';
import { jobService } from '../../job-service/services/jobService.js';
import { reviewJobsQueue } from '../../job-service/services/reviewJobsQueue.js';

export const reReviewController = {
  async reReview(req, res, next) {
    try {
      const {
        originalCode,
        updatedCode,
        persona,
        originalSuggestions,
        parentReviewId,
      } = req.body;

      if (
        !originalCode
        || !updatedCode
        || !persona
        || !Array.isArray(originalSuggestions)
        || !parentReviewId
      ) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const jobId = uuidv4();
      await jobService.createJob(jobId, req.userId, 're-review');

      reviewJobsQueue.publish({
        type: 're-review',
        jobId,
        userId: req.userId,
        originalCode,
        updatedCode,
        persona,
        originalSuggestions,
        parentReviewId,
      });

      return res.status(202).json({
        jobId,
        status: 'queued',
        pollUrl: `/api/jobs/${jobId}`,
      });
    } catch (error) {
      return next(error);
    }
  },
};
