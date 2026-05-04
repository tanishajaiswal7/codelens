import { v4 as uuidv4 } from 'uuid';
import { jobService } from '../../job-service/services/jobService.js';
import { reviewJobsQueue } from '../../job-service/services/reviewJobsQueue.js';

export const reReviewController = {
  async reReview(req, res, next) {
    try {
      // Accept multiple request shapes from frontend: older clients may send
      // { oldCode, newCode, previousSuggestions } while newer clients send
      // { originalCode, updatedCode, originalSuggestions }. Normalize both.
      const originalCode = req.body.originalCode || req.body.oldCode || null;
      const updatedCode = req.body.updatedCode || req.body.newCode || null;
      const persona = req.body.persona || null;
      const originalSuggestions = req.body.originalSuggestions || req.body.previousSuggestions || [];
      const parentReviewId = req.body.parentReviewId || req.body.reviewId || null;

      if (!originalCode || !updatedCode || !persona || !Array.isArray(originalSuggestions)) {
        return res.status(400).json({ error: 'Missing required fields: originalCode, updatedCode, persona, originalSuggestions (array) are required' });
      }

      const jobId = uuidv4();
      await jobService.createJob(jobId, req.userId, 're-review');

      const payload = {
        type: 're-review',
        jobId,
        userId: req.userId,
        originalCode,
        updatedCode,
        persona,
        originalSuggestions,
      };

      if (parentReviewId) payload.parentReviewId = parentReviewId;

      reviewJobsQueue.publish(payload);

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
