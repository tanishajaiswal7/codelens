import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { User } from '../../auth-service/models/User.js';
import { Review } from '../../review-service/models/Review.js';
import { decryptToken } from '../../github-auth-service/services/githubAuthService.js';
import mongoose from 'mongoose';

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
    const hiddenPrNumbers = new Set((workspace.hiddenPrNumbers || []).map((value) => Number(value)));

    const detailedPulls = await Promise.all(
      prs
        .filter((pr) => !hiddenPrNumbers.has(pr.number))
        .map(async (pr) => {
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

    const visiblePrNumbers = detailedPulls.map(({ pr }) => pr.number);
    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);
    const reviewDocs = visiblePrNumbers.length > 0
      ? await Review.find({
          workspaceId: workspaceObjectId,
          prNumber: { $in: visiblePrNumbers },
          source: 'github_pr',
          reviewContext: 'workspace',
          deleted: { $ne: true },
        })
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const latestReviewByPr = new Map();
    for (const review of reviewDocs) {
      if (!latestReviewByPr.has(review.prNumber)) {
        latestReviewByPr.set(review.prNumber, review);
      }
    }

    return {
      repoFullName: workspace.repoFullName,
      repoUrl: workspace.repoUrl,
      pulls: detailedPulls.map(({ pr, changedFiles, additions, deletions }) => ({
        ...(latestReviewByPr.get(pr.number)
          ? {
              isReviewed: true,
              reviewResult: {
                reviewId: latestReviewByPr.get(pr.number)._id,
                verdict: latestReviewByPr.get(pr.number).verdict || null,
                createdAt: latestReviewByPr.get(pr.number).createdAt || null,
                managerDecision: latestReviewByPr.get(pr.number).managerDecision || null,
                managerFeedback: latestReviewByPr.get(pr.number).managerFeedback || null,
              },
            }
          : { isReviewed: false, reviewResult: null }),
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

  async deletePR(workspaceId, prNumber, requestingUserId) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw { status: 404, message: 'Workspace not found' };
    }

    if (workspace.ownerId.toString() !== requestingUserId.toString()) {
      throw { status: 403, message: 'Only the workspace creator can delete PRs' };
    }

    const numericPrNumber = Number(prNumber);
    if (!Number.isFinite(numericPrNumber)) {
      throw { status: 400, message: 'Invalid PR number' };
    }

    const currentHiddenPrNumbers = Array.isArray(workspace.hiddenPrNumbers)
      ? workspace.hiddenPrNumbers
      : [];

    if (!currentHiddenPrNumbers.includes(numericPrNumber)) {
      await Workspace.updateOne(
        { _id: workspace._id },
        { $addToSet: { hiddenPrNumbers: numericPrNumber } }
      );
    }

    const { Review } = await import('../../review-service/models/Review.js');
    await Review.updateMany(
      {
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        prNumber: numericPrNumber,
        deleted: { $ne: true },
      },
      {
        deleted: true,
      }
    );

    return { message: 'PR deleted from workspace dashboard' };
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
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.go', '.rs',
      '.cpp', '.c', '.cs', '.php',
      '.rb', '.swift', '.kt', '.vue',
      '.html', '.css', '.scss', '.sass',
      '.json', '.yaml', '.yml',
      '.md', '.mdx', '.txt',
      '.sh', '.bash', '.zsh',
      '.sql', '.graphql', '.gql',
      '.env.example', '.config.js',
      '.toml', '.ini'
    ];

    const SKIP_EXTENSIONS = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
      '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so',
      '.lock',
      '.map'
    ];

    const SKIP_FILENAMES = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'composer.lock'
    ];

    const codeFiles = filesList
      .filter(f => f.status !== 'removed')
      .filter((f) => {
        const filename = f.filename.split('/').pop();
        const parts = filename.split('.');
        const ext = parts.length > 1 ? ('.' + parts.pop().toLowerCase()) : '';
        if (SKIP_FILENAMES.includes(filename)) return false;
        if (SKIP_EXTENSIONS.includes(ext)) return false;
        // include everything else (covers many text/config files)
        return true;
      })
      .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
      .slice(0, 5);

    if (codeFiles.length === 0) {
      throw {
        status: 400,
        message: 'No reviewable files found in this PR',
        detail: 'This PR may only contain binary files, lock files, or no changed files. Add some code changes and try again.',
        suggestion: 'Make sure your PR includes at least one changed code file.'
      };
    }

    // Fetch content for each file
    const filesWithContent = await Promise.all(
      codeFiles.map(async (file) => {
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

    return {
      files: filesWithContent.filter(Boolean),
      prMeta: {
        prTitle: prDetail.title || null,
        authorLogin: prDetail.user?.login || null,
      },
    };
  }
};