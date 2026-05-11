import { GitHubApiClient } from './githubApiClient.js';
import * as githubAuthService from '../../github-auth-service/services/githubAuthService.js';
import * as reviewService from '../../review-service/services/reviewService.js';
import * as promptService from '../../review-service/services/promptService.js';
import { parseAIResponse } from '../../review-service/services/confidenceParser.js';
import { PRReview } from '../models/PRReview.js';

const SKIP_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so',
  '.lock', '.map'
];

const SKIP_FILENAMES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock'
];

const isReviewableFile = (filename) => {
  const baseName = filename.split('/').pop();
  if (SKIP_FILENAMES.includes(baseName)) return false;

  const parts = baseName.split('.');
  const extension = parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
  return !SKIP_EXTENSIONS.includes(extension);
};

const fetchPRFileContents = async (repoFullName, prNumber, token, selectedFiles = []) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CodeLens-AI',
  };

  const filesRes = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/files`,
    { headers }
  );

  if (!filesRes.ok) {
    const err = await filesRes.json().catch(() => ({}));
    throw new Error(`GitHub files fetch failed: ${err.message || 'Unknown error'}`);
  }

  const files = await filesRes.json();

  // Filter for reviewable files
  let codeFiles = files
    .filter((file) => file.status !== 'removed')
    .filter((file) => isReviewableFile(file.filename));

  // If specific files are selected, filter to only those files
  const hasSelectedFiles = Array.isArray(selectedFiles) && selectedFiles.length > 0;
  if (hasSelectedFiles) {
    codeFiles = codeFiles.filter((file) => selectedFiles.includes(file.filename));
  } else {
    // Only apply sorting and slicing limit when no specific files are selected
    codeFiles = codeFiles
      .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
      .slice(0, 5);
  }

  if (codeFiles.length === 0) {
    return null;
  }

  const prDetailRes = await fetch(
    `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`,
    { headers }
  );

  if (!prDetailRes.ok) {
    const err = await prDetailRes.json().catch(() => ({}));
    throw new Error(`GitHub PR fetch failed: ${err.message || 'Unknown error'}`);
  }

  const prDetail = await prDetailRes.json();
  const ref = prDetail.head?.sha || prDetail.head?.ref || prDetail.base?.ref || 'main';

  const filesWithContent = await Promise.all(
    codeFiles.map(async (file) => {
      try {
        if (typeof file.content === 'string' && file.content.trim()) {
          return {
            path: file.filename,
            content: file.content.slice(0, 8000),
            additions: file.additions,
            deletions: file.deletions,
          };
        }

        const contentsUrl = file.contents_url
          || `https://api.github.com/repos/${repoFullName}/contents/${encodeURI(file.filename)}`;

        const contentRes = await fetch(
          `${contentsUrl}${contentsUrl.includes('?') ? '&' : '?'}ref=${encodeURIComponent(ref)}`,
          { headers }
        );

        if (!contentRes.ok) {
          console.warn(`[PR Review] Could not fetch ${file.filename}`);
          return null;
        }

        const contentData = await contentRes.json();

        if (Array.isArray(contentData) || !contentData.content) {
          return null;
        }

        const decoded = Buffer.from(
          (contentData.content || '').replace(/\n/g, ''),
          'base64'
        ).toString('utf-8');

        if (!decoded || decoded.trim().length === 0) {
          return null;
        }

        return {
          path: file.filename,
          content: decoded.slice(0, 8000),
          additions: file.additions,
          deletions: file.deletions,
        };
      } catch (error) {
        console.error(`[PR Review] Failed to fetch ${file.filename}:`, error.message);
        return null;
      }
    })
  );

  const validFiles = filesWithContent.filter(Boolean);

  if (validFiles.length === 0) {
    return null;
  }

  const combinedCode = validFiles
    .map((file) => `// ===== FILE: ${file.path} =====\n${file.content}`)
    .join('\n\n');

  return {
    combinedCode,
    fileCount: validFiles.length,
    files: validFiles.map((file) => file.path),
    filesWithContent: validFiles,
    codeLength: combinedCode.length,
  };
};

/**
 * GitHub PR Service
 * Orchestrates PR fetching and AI review generation
 */

/**
 * Resolves and decrypts GitHub token for a user
 * @param {string} userId - User ID
 * @returns {Promise<string>} - Decrypted token
 * @throws {Error} If user not connected
 */
export const resolveToken = async (userId) => {
  try {
    return await githubAuthService.getDecryptedToken(userId);
  } catch (error) {
    const err = new Error('GitHub not connected');
    err.code = 'GITHUB_NOT_CONNECTED';
    throw err;
  }
};

/**
 * Fetches repositories for a user
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @returns {Promise<Array>} - Repositories
 */
export const getReposForUser = async (userId, page = 1) => {
  try {
    const token = await resolveToken(userId);
    const client = new GitHubApiClient(token);
    return await client.getRepos(page);
  } catch (error) {
    if (error.code === 'GITHUB_NOT_CONNECTED') {
      throw error;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Get repos error:', error.message);
    }
    throw error;
  }
};

/**
 * Fetches pull requests for a repository
 * @param {string} userId - User ID
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Pull requests
 */
export const getPullsForRepo = async (userId, owner, repo) => {
  try {
    const token = await resolveToken(userId);
    const client = new GitHubApiClient(token);
    return await client.getPulls(owner, repo);
  } catch (error) {
    if (error.code === 'GITHUB_NOT_CONNECTED') {
      throw error;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Get pulls error:', error.message);
    }
    throw error;
  }
};

/**
 * Fetches files changed in a PR
 * @param {string} userId - User ID
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Array>} - Changed files
 */
export const getFilesForPR = async (userId, owner, repo, prNumber) => {
  try {
    const token = await resolveToken(userId);
    const client = new GitHubApiClient(token);
    return await client.getPullFiles(owner, repo, prNumber);
  } catch (error) {
    if (error.code === 'GITHUB_NOT_CONNECTED') {
      throw error;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Get files error:', error.message);
    }
    throw error;
  }
};

/**
 * Generates an AI review for selected PR files
 * @param {string} userId - User ID
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {string} prTitle - PR title
 * @param {string} prUrl - PR URL
 * @param {Array<string>} selectedFiles - Files to review
 * @param {string} persona - Review persona
 * @returns {Promise<Object>} - Review result
 */
export const generatePRReview = async (
  userId,
  owner,
  repo,
  prNumber,
  prTitle,
  prUrl,
  selectedFiles,
  persona,
  preloadedFiles = null
) => {
  try {
    const token = await resolveToken(userId);

    const codeResult = await fetchPRFileContents(
      `${owner}/${repo}`,
      prNumber,
      token,
      Array.isArray(selectedFiles) ? selectedFiles : []
    );

    if (!codeResult || !codeResult.combinedCode) {
      throw {
        status: 400,
        message: 'No reviewable code found in this PR',
        detail: 'The PR may only contain binary files, lock files, or removed files.',
        files: [],
      };
    }

    console.log(`[PR Review] Reviewing ${codeResult.fileCount} files, total chars: ${codeResult.combinedCode.length}`);

    const filesToReview = codeResult.filesWithContent;

    // Generate AI review for each file
    const fileReviews = [];

    for (const file of filesToReview) {
      try {
        // Build PR review content from the decoded source file.
        const prFileContent = `GitHub PR File Review\nFile: ${file.path}\n\n${file.content}`;

        // Get persona-specific system prompt and properly formatted user message
        const { systemPrompt, userMessage } = promptService.buildPersonaPrompt(persona, prFileContent);
        const aiResponse = await reviewService.callGroqAPI(systemPrompt, userMessage);

        // Parse suggestions
        const suggestions = parseAIResponse(aiResponse);

        fileReviews.push({
          filename: file.path,
          suggestions: suggestions,
        });
      } catch (fileError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error reviewing file ${file.path}:`, fileError.message);
        }
        // Continue with next file on error
        fileReviews.push({
          filename: file.path,
          suggestions: [],
          error: 'Failed to generate suggestions for this file',
        });
      }
    }

    // Save PR review to MongoDB
    const prReview = new PRReview({
      userId,
      repoFullName: `${owner}/${repo}`,
      prNumber,
      prTitle,
      prUrl,
      selectedFiles,
      persona,
      suggestions: fileReviews,
    });

    await prReview.save();

    return {
      prReviewId: prReview._id,
      files: fileReviews,
      summary: `Reviewed ${fileReviews.length} files in PR #${prNumber}`,
      filesReviewed: codeResult.files,
      codeLength: codeResult.codeLength,
    };
  } catch (error) {
    if (error.code === 'GITHUB_NOT_CONNECTED') {
      throw error;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Generate PR review error:', error.message);
    }
    throw error;
  }
};

/**
 * Fetches PR review history for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - PR reviews
 */
export const getReviewHistory = async (userId) => {
  try {
    const reviews = await PRReview.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    return reviews;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get review history error:', error.message);
    }
    throw new Error('Failed to fetch review history');
  }
};
