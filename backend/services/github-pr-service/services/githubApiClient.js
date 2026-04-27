import axios from 'axios';

/**
 * GitHub API Client
 * Thin wrapper around axios for all GitHub API calls
 * Handles rate limiting and error responses
 */
export class GitHubApiClient {
  constructor(accessToken) {
    this.token = accessToken;
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  /**
   * Handles API errors and converts them to user-friendly messages
   * @param {Error} error - Axios error
   * @returns {Object} - Error object with code and message
   */
  handleError(error) {
    if (!error.response) {
      return { error: 'Network error', code: 'NETWORK_ERROR' };
    }

    const status = error.response.status;
    const headers = error.response.headers;

    // Handle rate limiting
    if (status === 403 && headers['x-ratelimit-remaining'] === '0') {
      return {
        error: 'GitHub API rate limit reached. Try again in 1 hour.',
        code: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // Handle token issues
    if (status === 401) {
      return {
        error: 'GitHub token expired or revoked',
        code: 'GITHUB_TOKEN_INVALID',
      };
    }

    return {
      error: error.response.data?.message || 'GitHub API error',
      code: 'GITHUB_API_ERROR',
    };
  }

  /**
   * Fetches user's repositories
   * @param {number} page - Page number (default 1)
   * @param {number} perPage - Items per page (default 20)
   * @returns {Promise<Array>} - Array of repos
   */
  async getRepos(page = 1, perPage = 20) {
    try {
      const response = await this.client.get('/user/repos', {
        params: {
          sort: 'updated',
          direction: 'desc',
          page,
          per_page: perPage,
        },
      });

      // Fetch open PR count for each repo
      const reposWithCounts = await Promise.all(
        response.data.map(async (repo) => {
          try {
            const prsResponse = await this.client.get(
              `/repos/${repo.owner.login}/${repo.name}/pulls`,
              { params: { state: 'open', per_page: 1 } }
            );
            return {
              id: repo.id,
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              private: repo.private,
              language: repo.language,
              updatedAt: repo.updated_at,
              openPRCount: prsResponse.headers['link']
                ? parseInt(prsResponse.headers['link'].match(/&page=(\d+)>; rel="last"/)?.[1] || 0)
                : prsResponse.data.length,
            };
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`PR count failed for ${repo.name}:`, err.message);
            }
            return {
              id: repo.id,
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              private: repo.private,
              language: repo.language,
              updatedAt: repo.updated_at,
              openPRCount: 0,
            };
          }
        })
      );

      return reposWithCounts;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetches pull requests for a repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Array>} - Array of PRs
   */
  async getPulls(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/pulls`, {
        params: { state: 'open', sort: 'updated' },
      });

      return response.data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        createdAt: pr.created_at,
        changedFilesCount: pr.changed_files,
        additions: pr.additions,
        deletions: pr.deletions,
        url: pr.html_url,
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Fetches files changed in a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} prNumber - Pull request number
   * @returns {Promise<Array>} - Array of changed files
   */
  async getPullFiles(owner, repo, prNumber) {
    try {
      const response = await this.client.get(
        `/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        { params: { per_page: 100 } }
      );

      return response.data
        .filter((file) => {
          // Filter out files larger than 5000 lines
          const patchLines = (file.patch || '').split('\n').length;
          return patchLines <= 5000;
        })
        .map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch || '',
          isLargeFile: (file.patch || '').split('\n').length > 200,
        }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Gets current API rate limit status
   * @returns {Promise<Object>} - Rate limit info
   */
  async getRateLimit() {
    try {
      const response = await this.client.get('/rate_limit');
      return response.data.resources.core;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}
