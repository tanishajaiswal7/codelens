import { buildPersonaPrompt } from './promptService.js';
import { promptService } from './promptService.js';
import { parseAIResponse } from './confidenceParser.js';
import { Review } from '../models/Review.js';
import { diffService } from './diffService.js';

const MODEL = 'llama-3.3-70b-versatile';
const ANTHROPIC_MODEL = 'claude-opus-4-6';
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
   * @returns {Promise<Object>} Review with summary, verdict, and suggestions
   */
  async runReview(userId, code, persona, mode,
    workspaceId = null,
    repoFullName = null,
    prNumber = null,
    repoPath = null,
    reviewContext = 'personal'
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

  async runReReview(userId, originalCode, updatedCode, persona, originalSuggestions, parentReviewId) {
    const changedContext = diffService.buildChangedContext(originalCode, updatedCode);

    if (!changedContext || changedContext.totalChangedLines === 0) {
      return {
        resolvedSuggestionIds: [],
        newSuggestions: [],
        unchangedSuggestions: originalSuggestions,
        message: 'No changes detected',
        totalBefore: originalSuggestions.length,
        totalAfter: originalSuggestions.length,
      };
    }

    const { systemPrompt, userMessage } = promptService.buildReReviewPrompt(
      persona,
      changedContext,
      originalSuggestions
    );

    const rawText = await this.callReReviewAI(systemPrompt, userMessage);

    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (err) {
      parsed = { resolved: [], stillPresent: [], newIssues: [] };
    }

    if (!Array.isArray(parsed.resolved)) {
      parsed.resolved = [];
    }

    if (!Array.isArray(parsed.stillPresent)) {
      parsed.stillPresent = [];
    }

    if (!Array.isArray(parsed.newIssues)) {
      parsed.newIssues = [];
    }

    const newSuggestionsWithLabels = (parsed.newIssues || []).map((s) => ({
      ...s,
      confidenceLabel:
        s.confidence >= 85
          ? 'High'
          : s.confidence >= 60
            ? 'Moderate'
            : s.confidence >= 35
              ? 'Low'
              : 'Speculative',
      confidenceBand:
        s.confidence >= 85
          ? 'green'
          : s.confidence >= 60
            ? 'amber'
            : s.confidence >= 35
              ? 'orange'
              : 'red',
    }));

    const stillPresentIds = parsed.stillPresent || [];
    const resolvedIds = parsed.resolved || [];

    const reReview = await Review.create({
      userId,
      code: updatedCode,
      persona,
      mode: 'standard',
      source: 'paste',
      parentReviewId: parentReviewId || null,
      suggestions: [
        ...originalSuggestions
          .filter((s) => stillPresentIds.includes(s.id))
          .map((s) => ({ ...s, status: 'still_present' })),
        ...newSuggestionsWithLabels.map((s) => ({ ...s, status: 'new' })),
      ],
      resolvedSuggestionIds: resolvedIds,
      createdAt: new Date(),
    });

    return {
      reviewId: reReview._id,
      resolvedSuggestionIds: resolvedIds,
      newSuggestions: newSuggestionsWithLabels,
      unchangedSuggestions: originalSuggestions.filter((s) => stillPresentIds.includes(s.id)),
      totalBefore: originalSuggestions.length,
      totalAfter: stillPresentIds.length + newSuggestionsWithLabels.length,
    };
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
