import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { User } from '../../auth-service/models/User.js';
import { decryptToken } from '../../github-auth-service/services/githubAuthService.js';

export const workspacePRService = {

  async getOpenPRs(workspaceId, requestingUserId) {
    // Step 1: Verify user is a workspace member
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      isActive: true
    });
    if (!membership) throw { status: 403, message: 'Not a member' };

    // Step 2: Get workspace repo
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace?.repoFullName) {
      throw { status: 400, message: 'No GitHub repo linked to this workspace. Add one in workspace settings.' };
    }

    // Step 3: Get user GitHub token
    const user = await User.findById(requestingUserId)
      .select('githubToken githubUsername')
      .lean();

    if (!user?.githubToken) {
      throw { status: 400, message: 'Please connect your GitHub account in Settings first.' };
    }

    const token = decryptToken(user.githubToken);

    // Step 4: Fetch open PRs from GitHub
    const response = await fetch(
      `https://api.github.com/repos/${workspace.repoFullName}/pulls?state=open&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      throw { status: 404, message: `Repo ${workspace.repoFullName} not found or you do not have access to it.` };
    }
    if (!response.ok) {
      const err = await response.json();
      throw { status: 400, message: err.message || 'Failed to fetch PRs from GitHub' };
    }

    const prs = await response.json();

    const detailedPulls = await Promise.all(
      prs.map(async (pr) => {
        try {
          const detailRes = await fetch(
            `https://api.github.com/repos/${workspace.repoFullName}/pulls/${pr.number}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
              }
            }
          );

          if (!detailRes.ok) {
            return {
              pr,
              changedFiles: 0,
              additions: 0,
              deletions: 0,
            };
          }

          const detail = await detailRes.json();
          return {
            pr,
            changedFiles: detail.changed_files || 0,
            additions: detail.additions || 0,
            deletions: detail.deletions || 0,
          };
        } catch {
          return {
            pr,
            changedFiles: 0,
            additions: 0,
            deletions: 0,
          };
        }
      })
    );

    return {
      repoFullName: workspace.repoFullName,
      repoUrl: workspace.repoUrl,
      pulls: detailedPulls.map(({ pr, changedFiles, additions, deletions }) => ({
        prNumber: pr.number,
        title: pr.title,
        body: pr.body?.slice(0, 200) || null,
        authorLogin: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        branch: pr.head.ref,
        baseBranch: pr.base.ref,
        changedFiles,
        additions,
        deletions,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url
      }))
    };
  },

  async getPRFilesWithContent(workspaceId, prNumber, requestingUserId) {
    // Verify membership and get workspace + token
    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: requestingUserId,
      isActive: true
    });
    if (!membership) throw { status: 403, message: 'Not a member' };

    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace?.repoFullName) throw { status: 400, message: 'No repo linked' };

    const user = await User.findById(requestingUserId)
      .select('githubToken')
      .lean();
    if (!user?.githubToken) throw { status: 400, message: 'Connect GitHub first' };

    const token = decryptToken(user.githubToken);

    // Fetch PR files list
    const filesRes = await fetch(
      `https://api.github.com/repos/${workspace.repoFullName}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    if (!filesRes.ok) throw { status: 400, message: 'Failed to fetch PR files' };
    const filesList = await filesRes.json();

    const prDetailRes = await fetch(
      `https://api.github.com/repos/${workspace.repoFullName}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    if (!prDetailRes.ok) {
      throw { status: 400, message: 'Failed to fetch PR details' };
    }

    const prDetail = await prDetailRes.json();

    // Take top 5 most changed files (skip removed files)
    const reviewableExtensions = [
      '.js','.jsx','.ts','.tsx','.py','.java','.go','.rs',
      '.cpp','.c','.cs','.php','.rb','.swift','.kt','.vue',
      '.html','.css','.sql','.sh'
    ];

    const topFiles = filesList
      .filter(f => f.status !== 'removed')
      .filter(f => reviewableExtensions.some(ext => f.filename.endsWith(ext)))
      .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
      .slice(0, 5);

    if (topFiles.length === 0) {
      throw { status: 400, message: 'No reviewable code files found in this PR' };
    }

    // Fetch content for each file
    const filesWithContent = await Promise.all(
      topFiles.map(async (file) => {
        try {
          const contentRes = await fetch(
            `https://api.github.com/repos/${workspace.repoFullName}/contents/${file.filename}?ref=${prDetail.head?.sha || prDetail.head?.ref || 'main'}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json'
            }
          });
          if (!contentRes.ok) return null;
          const contentData = await contentRes.json();

          // If GitHub flagged the content as truncated, fetch the full blob
          // using the Git Blobs API which supports larger files.
          let decoded = '';
          if (contentData.truncated && contentData.sha) {
            try {
              const blobRes = await fetch(
                `https://api.github.com/repos/${workspace.repoFullName}/git/blobs/${contentData.sha}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                  }
                }
              );
              if (blobRes.ok) {
                const blobData = await blobRes.json();
                const base64 = (blobData.content || '').replace(/\n/g, '');
                decoded = Buffer.from(base64, 'base64').toString('utf-8');
              }
            } catch (e) {
              // fall through to try decode from contentData if available
            }
          }

          if (!decoded && contentData.content) {
            const base64 = (contentData.content || '').replace(/\n/g, '');
            decoded = Buffer.from(base64, 'base64').toString('utf-8');
          }

          return {
            path: file.filename,
            // Return the full decoded content so the frontend editor receives
            // the complete file. Avoid slicing here which caused truncated
            // displays (e.g., header lineCount != shown content).
            content: decoded,
            additions: file.additions,
            deletions: file.deletions
          };
        } catch {
          return null;
        }
      })
    );

    return filesWithContent.filter(Boolean);
  }
};