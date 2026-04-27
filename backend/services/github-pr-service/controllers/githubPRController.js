import * as githubPRService from '../services/githubPRService.js';

/**
 * Gets list of user's repositories
 * Protected route - requires JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getRepos = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1 } = req.query;

    const repos = await githubPRService.getReposForUser(userId, parseInt(page));
    res.json(repos);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get repos error:', error.message);
    }

    if (error.code === 'GITHUB_NOT_CONNECTED') {
      return res.status(403).json({
        error: 'GitHub not connected',
        code: 'GITHUB_NOT_CONNECTED',
      });
    }

    if (error.code === 'GITHUB_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'GitHub token expired or revoked',
        code: 'GITHUB_TOKEN_INVALID',
      });
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        error: error.error,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
};

/**
 * Gets pull requests for a repository
 * Protected route - requires JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getPulls = async (req, res) => {
  try {
    const userId = req.userId;
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      return res.status(400).json({ error: 'Owner and repo are required' });
    }

    const pulls = await githubPRService.getPullsForRepo(userId, owner, repo);
    res.json(pulls);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get pulls error:', error.message);
    }

    if (error.code === 'GITHUB_NOT_CONNECTED') {
      return res.status(403).json({
        error: 'GitHub not connected',
        code: 'GITHUB_NOT_CONNECTED',
      });
    }

    if (error.code === 'GITHUB_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'GitHub token expired or revoked',
        code: 'GITHUB_TOKEN_INVALID',
      });
    }

    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
};

/**
 * Gets files changed in a pull request
 * Protected route - requires JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getPullFiles = async (req, res) => {
  try {
    const userId = req.userId;
    const { owner, repo, prNumber } = req.params;

    if (!owner || !repo || !prNumber) {
      return res
        .status(400)
        .json({ error: 'Owner, repo, and PR number are required' });
    }

    const files = await githubPRService.getFilesForPR(
      userId,
      owner,
      repo,
      parseInt(prNumber)
    );
    res.json(files);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get files error:', error.message);
    }

    if (error.code === 'GITHUB_NOT_CONNECTED') {
      return res.status(403).json({
        error: 'GitHub not connected',
        code: 'GITHUB_NOT_CONNECTED',
      });
    }

    if (error.code === 'GITHUB_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'GitHub token expired or revoked',
        code: 'GITHUB_TOKEN_INVALID',
      });
    }

    res.status(500).json({ error: 'Failed to fetch pull request files' });
  }
};

/**
 * Generates AI review for selected PR files
 * Protected route - requires JWT
 * Rate limited (applies to existing rate limiter)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const reviewPR = async (req, res) => {
  try {
    const userId = req.userId;
    const { owner, repo, prNumber, prTitle, prUrl, selectedFiles, persona } =
      req.body;

    if (!owner || !repo || !prNumber || !selectedFiles || !persona) {
      return res.status(400).json({
        error: 'owner, repo, prNumber, selectedFiles, and persona are required',
      });
    }

    if (!Array.isArray(selectedFiles) || selectedFiles.length === 0) {
      return res.status(400).json({ error: 'At least one file must be selected' });
    }

    const result = await githubPRService.generatePRReview(
      userId,
      owner,
      repo,
      prNumber,
      prTitle,
      prUrl,
      selectedFiles,
      persona
    );

    res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Review PR error:', error.message);
    }

    if (error.code === 'GITHUB_NOT_CONNECTED') {
      return res.status(403).json({
        error: 'GitHub not connected',
        code: 'GITHUB_NOT_CONNECTED',
      });
    }

    if (error.code === 'GITHUB_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'GitHub token expired or revoked',
        code: 'GITHUB_TOKEN_INVALID',
      });
    }

    res.status(500).json({ error: 'Failed to generate PR review' });
  }
};

/**
 * Gets PR review history
 * Protected route - requires JWT
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const reviews = await githubPRService.getReviewHistory(userId);
    res.json(reviews);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get history error:', error.message);
    }
    res.status(500).json({ error: 'Failed to fetch review history' });
  }
};
