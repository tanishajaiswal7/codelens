import { GitHubApiClient } from '../../github-pr-service/services/githubApiClient.js';
import * as githubAuthService from '../../github-auth-service/services/githubAuthService.js';
import { reviewService } from '../../review-service/services/reviewService.js';

// Supported file extensions for review
const SUPPORTED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.cpp',
  '.c',
  '.cs',
  '.php',
  '.rb',
  '.swift',
  '.kt',
  '.vue',
  '.html',
  '.css',
  '.sql',
  '.sh',
  '.yaml',
  '.yml',
  '.json',
  '.md',
];

// Folders to exclude from tree browsing
const EXCLUDED_FOLDERS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.DS_Store',
];

// File patterns to exclude
const EXCLUDED_PATTERNS = [
  /\.lock$/,
  /\.log$/,
  /^\.env/,
];

/**
 * File Browser Service
 * Handles GitHub repository file browsing and file-level reviews
 */

/**
 * Check if file is excluded
 */
const isExcluded = (name, type) => {
  if (type === 'dir' && EXCLUDED_FOLDERS.includes(name)) {
    return true;
  }

  if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(name))) {
    return true;
  }

  return false;
};

/**
 * Check if file extension is supported for review
 */
const isSupportedExtension = (filename) => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(ext);
};

/**
 * Get the programming language from file extension
 */
const getLanguageFromExtension = (filename) => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.vue': 'html',
    '.html': 'html',
    '.css': 'css',
    '.sql': 'sql',
    '.sh': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.json': 'json',
    '.md': 'markdown',
  };
  return languageMap[ext] || 'plaintext';
};

export const fileBrowserService = {
  /**
   * Get folder/file tree contents for a path
   * @param {string} userId - User ID
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - Path within repo (default: "")
   * @param {string} ref - Branch name (default: "" for default branch)
   * @returns {Promise<Array>} Array of items { name, path, type, size }
   */
  async getTree(userId, owner, repo, path = '', ref = '') {
    console.log('[FileBrowser] getTree called:', { userId, owner, repo, path, ref });
    
    try {
      const token = await githubAuthService.getDecryptedToken(userId);
      console.log('[FileBrowser] token resolved:', token ? 'YES' : 'NULL');

      const client = new GitHubApiClient(token);

      // Fetch contents at path
      const response = await client.client.get(`/repos/${owner}/${repo}/contents/${path}`, {
        params: ref ? { ref } : {},
      });

      // Filter and sort items
      const items = response.data
        .filter((item) => !isExcluded(item.name, item.type))
        .map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type, // 'file' or 'dir'
          size: item.size,
          supported: item.type === 'dir' ? true : isSupportedExtension(item.name),
        }))
        .sort((a, b) => {
          // Directories first
          if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
          }
          // Then alphabetically
          return a.name.localeCompare(b.name);
        });

      console.log('[FileBrowser] items returned:', items.length);
      return items;
    } catch (error) {
      console.error('[FileBrowser] Error in getTree:', error.message);
      
      // Handle GitHub not connected error
      if (error.message === 'GitHub not connected') {
        const err = new Error('GitHub account not connected. Go to Settings to connect.');
        err.code = 'GITHUB_NOT_CONNECTED';
        err.statusCode = 403;
        throw err;
      }
      
      throw error;
    }
  },

  /**
   * Get file content (decoded from base64)
   * @param {string} userId - User ID
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path within repo
   * @param {string} ref - Branch name
   * @returns {Promise<Object>} { filename, path, content, language, lineCount, truncated, warning }
   */
  async getFileContent(userId, owner, repo, path, ref) {
    try {
      // Check if extension is supported
      if (!isSupportedExtension(path)) {
        const error = new Error(
          `File type not supported. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`
        );
        error.statusCode = 415;
        throw error;
      }

      const token = await githubAuthService.getDecryptedToken(userId);
      const client = new GitHubApiClient(token);

      // Fetch file from GitHub
      const response = await client.client.get(
        `/repos/${owner}/${repo}/contents/${path}`,
        { params: ref ? { ref } : {} }
      );

      // Check if it's actually a file
      if (response.data.type !== 'file') {
        const error = new Error('Use /tree endpoint for directories');
        error.statusCode = 400;
        throw error;
      }

      // Decode content from base64
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      const lines = content.split('\n');
      const lineCount = lines.length;

      const filename = path.substring(path.lastIndexOf('/') + 1);
      const language = getLanguageFromExtension(filename);

      // Check if file is too large (>300 lines)
      if (lineCount > 300) {
        const truncatedContent = lines.slice(0, 300).join('\n');
        return {
          filename,
          path,
          content: truncatedContent,
          language,
          lineCount,
          truncated: true,
          warning: 'Large file — review limited to first 300 lines',
        };
      }

      return {
        filename,
        path,
        content,
        language,
        lineCount,
        truncated: false,
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Get file content error:', error.message);
      }
      throw error;
    }
  },

  /**
   * Get all branches for a repository
   * @param {string} userId - User ID
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} Array of branches { name, isDefault }
   */
  async getBranches(userId, owner, repo) {
    console.log('[FileBrowser] getBranches called:', { userId, owner, repo });
    
    try {
      const token = await githubAuthService.getDecryptedToken(userId);
      console.log('[FileBrowser] token resolved for branches:', token ? 'YES' : 'NULL');

      const client = new GitHubApiClient(token);

      // Fetch repository info to get default branch
      const repoInfo = await client.client.get(`/repos/${owner}/${repo}`);
      const defaultBranch = repoInfo.data.default_branch;

      // Fetch all branches
      const response = await client.client.get(`/repos/${owner}/${repo}/branches`, {
        params: { per_page: 100 },
      });

      const branches = response.data.map((branch) => ({
        name: branch.name,
        isDefault: branch.name === defaultBranch,
      }));

      console.log('[FileBrowser] branches returned:', branches.length);
      return branches;
    } catch (error) {
      console.error('[FileBrowser] Error in getBranches:', error.message);
      
      // Handle GitHub not connected error
      if (error.message === 'GitHub not connected') {
        const err = new Error('GitHub account not connected. Go to Settings to connect.');
        err.code = 'GITHUB_NOT_CONNECTED';
        err.statusCode = 403;
        throw err;
      }
      
      throw error;
    }
  },

  /**
   * Review a single file from the repository
   * @param {string} userId - User ID
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path within repo
   * @param {string} ref - Branch name
   * @param {string} content - File content (pre-fetched from frontend)
   * @param {string} persona - Reviewer persona (faang, startup, security)
   * @returns {Promise<Object>} Review with reviewId, summary, verdict, suggestions
   */
  async reviewFile(userId, owner, repo, path, ref, content, persona) {
    try {
      const repoFullName = `${owner}/${repo}`;

      // Call reviewService with raw content and context
      const context = {
        source: 'github_file',
        repoFullName,
        path,
        ref,
      };

      const review = await reviewService.runReviewFromContent(userId, content, persona, context);

      return review;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Review file error:', error.message);
      }
      throw error;
    }
  },
};
