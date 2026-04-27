import axiosInstance from '../utils/axiosInstance.js';

/**
 * GitHub API - Frontend client
 * All calls go through backend to GitHub API
 * Backend handles token encryption/decryption
 */

/**
 * Gets user's repositories
 * @param {number} page - Page number (default 1)
 * @returns {Promise<Array>} - Repositories
 */
export const getRepos = async (page = 1) => {
  const response = await axiosInstance.get('/api/github/pr/repos', {
    params: { page },
  });
  return response.data;
};

/**
 * Gets pull requests for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Pull requests
 */
export const getPulls = async (owner, repo) => {
  const response = await axiosInstance.get(
    `/api/github/pr/repos/${owner}/${repo}/pulls`
  );
  return response.data;
};

/**
 * Gets files changed in a pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<Array>} - Changed files
 */
export const getPullFiles = async (owner, repo, prNumber) => {
  const response = await axiosInstance.get(
    `/api/github/pr/repos/${owner}/${repo}/pulls/${prNumber}/files`
  );
  return response.data;
};

/**
 * Generates AI review for selected PR files
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @param {string} prTitle - PR title
 * @param {string} prUrl - PR URL
 * @param {Array<string>} selectedFiles - Files to review
 * @param {string} persona - Review persona
 * @returns {Promise<Object>} - Review result
 */
export const reviewPR = async (
  owner,
  repo,
  prNumber,
  prTitle,
  prUrl,
  selectedFiles,
  persona
) => {
  const response = await axiosInstance.post('/api/github/pr/review', {
    owner,
    repo,
    prNumber,
    prTitle,
    prUrl,
    selectedFiles,
    persona,
  });
  return response.data;
};

/**
 * Connects Personal Access Token
 * @param {string} pat - Personal Access Token
 * @returns {Promise<Object>} - { success, githubUsername, githubAvatar }
 */
export const connectPAT = async (pat) => {
  const response = await axiosInstance.post('/api/github/auth/connect-pat', {
    pat,
  });
  return response.data;
};

/**
 * Disconnects GitHub account
 * @returns {Promise<Object>} - { success }
 */
export const disconnect = async () => {
  const response = await axiosInstance.delete('/api/github/auth/disconnect');
  return response.data;
};

/**
 * Gets GitHub connection status
 * @returns {Promise<Object>} - { connected, username, avatar, method }
 */
export const getGitHubStatus = async () => {
  const response = await axiosInstance.get('/api/github/auth/status');
  return response.data;
};
