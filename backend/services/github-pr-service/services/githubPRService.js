import { GitHubApiClient } from './githubApiClient.js';
import * as githubAuthService from '../../github-auth-service/services/githubAuthService.js';
import * as reviewService from '../../review-service/services/reviewService.js';
import * as promptService from '../../review-service/services/promptService.js';
import { parseAIResponse } from '../../review-service/services/confidenceParser.js';
import { PRReview } from '../models/PRReview.js';

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
  persona
) => {
  try {
    const token = await resolveToken(userId);
    const client = new GitHubApiClient(token);

    // Fetch all files for the PR
    const allFiles = await client.getPullFiles(owner, repo, prNumber);

    // Filter to selected files only
    const filesToReview = allFiles.filter((f) =>
      selectedFiles.includes(f.filename)
    );

    // Generate AI review for each file
    const fileReviews = [];

    for (const file of filesToReview) {
      try {
        // Build diff-aware prompt
        const diffPrompt = `You are reviewing a GitHub Pull Request diff. The patch shows lines starting with + (added) and - (removed). Focus your review on the changed lines. Reference specific line numbers where possible.\n\nFile: ${file.filename}\nStatus: ${file.status}\n\n\`\`\`diff\n${file.patch}\n\`\`\``;

        // Get AI suggestions
        const systemPrompt = promptService.buildSystemPrompt(persona);
        const aiResponse = await reviewService.callAI(
          `${systemPrompt}\n\n${diffPrompt}`,
          diffPrompt
        );

        // Parse suggestions
        const suggestions = parseAIResponse(aiResponse);

        fileReviews.push({
          filename: file.filename,
          suggestions: suggestions,
        });
      } catch (fileError) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error reviewing file ${file.filename}:`, fileError.message);
        }
        // Continue with next file on error
        fileReviews.push({
          filename: file.filename,
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
