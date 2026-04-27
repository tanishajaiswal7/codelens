import { fileBrowserService } from '../services/fileBrowserService.js';

/**
 * Get folder/file tree contents
 * GET /api/github/files/:owner/:repo/tree
 */
export const getTree = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { path = '', ref = '' } = req.query;
    const userId = req.userId;

    const items = await fileBrowserService.getTree(userId, owner, repo, path, ref);
    res.json(items);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get tree error:', error.message);
    }
    next(error);
  }
};

/**
 * Get file content (decoded from base64)
 * GET /api/github/files/:owner/:repo/content
 */
export const getFileContent = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const { path, ref = 'main' } = req.query;
    const userId = req.userId;

    if (!path) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }

    const fileData = await fileBrowserService.getFileContent(
      userId,
      owner,
      repo,
      path,
      ref
    );
    res.json(fileData);
  } catch (error) {
    if (error.statusCode === 415) {
      return res.status(415).json({ error: error.message });
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Get file content error:', error.message);
    }
    next(error);
  }
};

/**
 * Get all branches for a repository
 * GET /api/github/files/:owner/:repo/branches
 */
export const getBranches = async (req, res, next) => {
  try {
    const { owner, repo } = req.params;
    const userId = req.userId;

    const branches = await fileBrowserService.getBranches(userId, owner, repo);
    res.json(branches);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get branches error:', error.message);
    }
    next(error);
  }
};

/**
 * Review a single file from the repository
 * POST /api/github/files/review
 */
export const reviewFile = async (req, res, next) => {
  try {
    const { owner, repo, path, ref, content, persona } = req.body;
    const userId = req.userId;

    if (!owner || !repo || !path || !ref || !content || !persona) {
      return res.status(400).json({
        error: 'owner, repo, path, ref, content, and persona are required',
      });
    }

    const review = await fileBrowserService.reviewFile(
      userId,
      owner,
      repo,
      path,
      ref,
      content,
      persona
    );

    res.json(review);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Review file error:', error.message);
    }
    next(error);
  }
};
