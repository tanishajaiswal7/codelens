import axiosInstance from '../utils/axiosInstance.js';

/**
 * File Browser API - Frontend client
 * Handles repository file browsing and file reviews
 */

/**
 * Get folder/file tree contents
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Path within repo (default: '')
 * @param {string} ref - Branch name (default: '')
 * @returns {Promise<Array>} - Array of items { name, path, type, size }
 */
export const getTree = async (owner, repo, path = '', ref = '') => {
  const response = await axiosInstance.get(`/api/github/files/${owner}/${repo}/tree`, {
    params: { path, ref },
  });
  return response.data;
};

/**
 * Get file content (decoded)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path within repo
 * @param {string} ref - Branch name
 * @returns {Promise<Object>} - { filename, path, content, language, lineCount, truncated, warning }
 */
export const getFileContent = async (owner, repo, path, ref) => {
  const response = await axiosInstance.get(`/api/github/files/${owner}/${repo}/content`, {
    params: { path, ref },
  });
  return response.data;
};

/**
 * Get all branches for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} - Array of branches { name, isDefault }
 */
export const getBranches = async (owner, repo) => {
  const response = await axiosInstance.get(`/api/github/files/${owner}/${repo}/branches`);
  return response.data;
};

/**
 * Review a single file from the repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path within repo
 * @param {string} ref - Branch name
 * @param {string} content - File content
 * @param {string} persona - Reviewer persona (faang, startup, security)
 * @returns {Promise<Object>} - Review result { reviewId, summary, verdict, suggestions }
 */
export const reviewFile = async (owner, repo, path, ref, content, persona) => {
  const response = await axiosInstance.post('/api/github/files/review', {
    owner,
    repo,
    path,
    ref,
    content,
    persona,
  });
  return response.data;
};
