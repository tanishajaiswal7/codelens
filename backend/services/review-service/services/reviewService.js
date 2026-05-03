import axios from 'axios';
import { buildPersonaPrompt } from './promptService.js';
import { promptService } from './promptService.js';
import { parseAIResponse } from './confidenceParser.js';
import { Review } from '../models/Review.js';
import { diffService } from './diffService.js';

const MODEL = 'llama-3.3-70b-versatile';
const ANTHROPIC_MODEL = 'claude-opus-4-20250514';
const REVIEW_TEMPERATURE = Number.isFinite(Number(process.env.REVIEW_TEMPERATURE))
  ? Number(process.env.REVIEW_TEMPERATURE)
  : 0.1;

const createFallbackReview = (reason, code, persona) => ({
  summary: `Review service fallback: ${reason}`,
  verdict: 'needs_revision',
  suggestions: [
    {
      id: `fallback-${Date.now()}`,
      title: 'AI review unavailable',
      description: `The AI reviewer could not complete the request. Reason: ${reason}. Check the backend Groq configuration and try again.`,
      lineRef: null,
      severity: 'high',
      confidence: 100,
      confidenceReason: 'System fallback response',
      category: 'system',
    },
  ],
  meta: {
    fallback: true,
    persona,
    codeLength: code?.length || 0,
  },
});

/**
 * Review service
 * Orchestrates code review workflow: prompt building, AI API calls, response parsing, and storage
 */
export const reviewService = {
  /**
   * Run a complete code review workflow
   * @param {string} userId - User ID requesting the review
   * @param {string} code - Code to review (wrapped in backticks)
   * @param {string} persona - Reviewer persona (faang, startup, security)
   * @param {boolean} isOnboarding - If true, skip saving to history
   * @returns {Promise<Object>} Review with summary, verdict, and suggestions
   */
  async runReview(userId, code, persona, mode,
    workspaceId = null,
    repoFullName = null,
    prNumber = null,
    repoPath = null,
    reviewContext = 'personal',
    isOnboarding = false
  ) {
    try {
      // Build persona-specific prompt
      const { systemPrompt, userMessage } = buildPersonaPrompt(persona, code);

      if (process.env.NODE_ENV === 'development') {
        console.log('System Prompt:', systemPrompt);
      }

      let review;

      try {
        // Call Groq API
        const aiResponse = await this.callGroqAPI(systemPrompt, userMessage);

        // Parse and validate response
        review = parseAIResponse(aiResponse);
      } catch (aiError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Groq review failed, using fallback review:', aiError.message);
        }
        review = createFallbackReview(aiError.message || 'AI review unavailable', code, persona);
      }

      // Skip saving to history if this is an onboarding review
      if (isOnboarding) {
        return {
          reviewId: null,
          summary: review.summary,
          verdict: review.verdict,
          suggestions: review.suggestions,
        };
      }

      // Save to MongoDB
      const savedReview = await Review.create({
        userId,
        code,
        persona,
        mode: mode || 'standard',
        source: workspaceId ? 'github_pr' : 'paste',
        summary: review.summary,
        verdict: review.verdict,
        suggestions: review.suggestions,
        workspaceId,
        repoFullName,
        prNumber,
        repoPath,
        reviewContext: workspaceId ? 'workspace' : 'personal',
      });

      return {
        reviewId: savedReview._id,
        summary: review.summary,
        verdict: review.verdict,
        suggestions: review.suggestions,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Review service error:', error);
      }
      throw error;
    }
  },

  /**
   * Run a code review with raw content and optional context
   * Used for GitHub file reviews and other sources
   * @param {string} userId - User ID requesting the review
   * @param {string} content - Raw code content (not wrapped)
   * @param {string} persona - Reviewer persona (faang, startup, security)
   * @param {Object} context - Optional context object { source, repoFullName, path, ref }
   * @returns {Promise<Object>} Review with summary, verdict, and suggestions
   */
  async runReviewFromContent(userId, content, persona, context = {}) {
    try {
      // Wrap content in backticks for prompt
      const wrappedCode = `\`\`\`\n${content}\n\`\`\``;
      
      // Build persona-specific prompt
      let { systemPrompt, userMessage } = buildPersonaPrompt(persona, wrappedCode);

      // Add context to system prompt if provided
      if (context.source === 'github_file') {
        const contextInfo = `You are reviewing a single source file from a GitHub repository.\nFile: ${context.path} in repo ${context.repoFullName} (branch: ${context.ref}).\nReview the entire file for quality, correctness, security, and adherence to best practices. Reference specific line numbers.`;
        systemPrompt = `${systemPrompt}\n\n${contextInfo}`;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('System Prompt (with context):', systemPrompt);
      }

      let review;

      try {
        // Call Groq API
        const aiResponse = await this.callGroqAPI(systemPrompt, userMessage);

        // Parse and validate response
        review = parseAIResponse(aiResponse);
      } catch (aiError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Groq review failed, using fallback review:', aiError.message);
        }
        review = createFallbackReview(aiError.message || 'AI review unavailable', content, persona);
      }

      // Prepare review data
      const reviewData = {
        userId,
        code: content,
        persona,
        mode: 'standard',
        summary: review.summary,
        verdict: review.verdict,
        suggestions: review.suggestions,
      };

      // Add context fields if provided
      if (context.source === 'github_file') {
        reviewData.source = 'github_file';
        reviewData.repoFullName = context.repoFullName;
        reviewData.repoPath = context.path;
        reviewData.repoRef = context.ref;
      }

      // Save to MongoDB
      const savedReview = await Review.create(reviewData);

      return {
        reviewId: savedReview._id,
        summary: review.summary,
        verdict: review.verdict,
        suggestions: review.suggestions,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Review service error:', error);
      }
      throw error;
    }
  },

  /**
   * Call Groq API for AI code review
   * @param {string} systemPrompt - System prompt with persona instructions
   * @param {string} userMessage - User message with code to review
   * @returns {Promise<string>} AI response containing review analysis
   * @throws {Error} If API call fails
   */
  async callGroqAPI(systemPrompt, userMessage) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (process.env.NODE_ENV === 'development') {
      console.log('Calling Groq API with model:', MODEL);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: REVIEW_TEMPERATURE,
        max_tokens: 2000,
      }),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Groq API response status:', response.status);
    }

    if (!response.ok) {
      const error = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.error('Groq API error response:', error);
      }
      throw new Error(`Groq API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const data = await response.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('Groq API success, got response');
    }
    const content = data.choices[0].message.content;
    return content;
  },

  /**
   * Get all reviews for a user (personal reviews only, not workspace reviews)
   * @param {string} userId - User ID to fetch reviews for
   * @returns {Promise<Array>} Array of personal reviews sorted by creation date (newest first)
   */
  async getReviewsByUserId(userId) {
    return await Review.find({ userId, workspaceId: null }).sort({ createdAt: -1 });
  },

  /**
   * Get a single review by ID with ownership check
   * @param {string} reviewId - Review ID to fetch
   * @param {string} userId - User ID for authorization check
   * @returns {Promise<Object|null>} Review document or null if not found/unauthorized
   */
  async getReviewById(reviewId, userId) {
    return await Review.findOne({ _id: reviewId, userId });
  },

  async runReReview(userId, oldCode, newCode, previousSuggestions = [], persona) {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    const changedLineNumbers = []; 
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let index = 0; index < maxLen; index += 1) {
      if (oldLines[index] !== newLines[index]) {
        for (let offset = Math.max(0, index - 5); offset <= Math.min(maxLen - 1, index + 5); offset += 1) {
          if (!changedLineNumbers.includes(offset)) {
            changedLineNumbers.push(offset);
          }
        }
      }
    }

    if (changedLineNumbers.length === 0) {
      return {
        noChanges: true,
        message: 'No changes detected since last review.',
        suggestions: previousSuggestions.map((suggestion) => ({
          ...suggestion,
          status: 'unchanged',
        })),
        summary: 'No changes detected since last review.',
        resolved: 0,
        newCount: 0,
        persistent: 0,
        changedLines: 0,
      };
    }

    const changedSection = changedLineNumbers
      .map((lineIndex) => `L${lineIndex + 1}: ${newLines[lineIndex] || ''}`)
      .join('\n');

    const { systemPrompt } = promptService.buildPersonaPrompt(persona, '');

    const reReviewPrompt = `You are doing a TARGETED re-review.
The developer has made changes to their code.
Only review the CHANGED lines provided below.

CHANGED LINES (with context):
${changedSection}

FULL NEW CODE (for context only):
${newCode}

PREVIOUS ISSUES FOUND:
${JSON.stringify(previousSuggestions.map((suggestion) => ({
  id: suggestion.id,
  title: suggestion.title,
  lineRef: suggestion.lineRef,
  severity: suggestion.severity,
})))}

For your response, check:
1. Are any previous issues now FIXED in the changed lines?
2. Are there any NEW issues in the changed lines?

Return ONLY this JSON:
{
  "resolvedIssueIds": ["id1", "id2"],
  "newIssues": [
    {
      "id": "new_1",
      "title": "...",
      "description": "...",
      "lineRef": "...",
      "severity": "critical|high|medium|low",
      "confidence": 85,
      "confidenceReason": "...",
      "status": "new"
    }
  ],
  "summary": "2 issues resolved, 1 new issue found"
}`;

    const aiResponse = await this.callAIForReReview(systemPrompt, reReviewPrompt);

    let parsed;
    try {
      const clean = aiResponse.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { resolvedIssueIds: [], newIssues: [], summary: '' };
    }

    const resolvedIssueIds = Array.isArray(parsed.resolvedIssueIds)
      ? parsed.resolvedIssueIds
      : [];
    const newIssues = Array.isArray(parsed.newIssues) ? parsed.newIssues : [];

    const mergedSuggestions = previousSuggestions.map((suggestion) => {
      if (resolvedIssueIds.includes(suggestion.id)) {
        return { ...suggestion, status: 'resolved' };
      }

      const suggestionLineNumbers = this.parseLineRef(suggestion.lineRef);
      const wasChanged = suggestionLineNumbers.some((lineNumber) => changedLineNumbers.includes(lineNumber - 1));

      if (wasChanged) {
        return { ...suggestion, status: 'persistent' };
      }

      return { ...suggestion, status: 'unchanged' };
    });

    const allSuggestions = [
      ...newIssues,
      ...mergedSuggestions,
    ];

    const resolved = mergedSuggestions.filter((suggestion) => suggestion.status === 'resolved').length;
    const persistent = mergedSuggestions.filter((suggestion) => suggestion.status === 'persistent').length;
    const newCount = newIssues.length;

    return {
      suggestions: allSuggestions,
      summary: parsed.summary || `${resolved} resolved · ${newCount} new · ${persistent} persistent`,
      resolved,
      newCount,
      persistent,
      changedLines: changedLineNumbers.length,
    };
  },

  parseLineRef(lineRef) {
    if (!lineRef) return [];
    const match = lineRef.match(/\d+/g);
    return match ? match.map(Number) : [];
  },

  async callAIForReReview(systemPrompt, userMessage) {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    )
    return response.data.content[0].text
  },

  async callReReviewAI(systemPrompt, userMessage) {
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            temperature: REVIEW_TEMPERATURE,
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        if (anthropicResponse.ok) {
          const aiData = await anthropicResponse.json();
          return aiData?.content?.[0]?.text || '{"resolved":[],"stillPresent":[],"newIssues":[]}';
        }

        const errText = await anthropicResponse.text();
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Anthropic re-review fallback to Groq: ${errText}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Anthropic re-review request failed, fallback to Groq:', error.message);
        }
      }
    }

    // Fallback to configured Groq provider so re-review works in the same environment as runReview.
    return this.callGroqAPI(systemPrompt, userMessage);
  },
};
