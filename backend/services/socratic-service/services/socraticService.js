import { buildSocraticSystemPrompt } from './socraticPromptService.js';
import { SocraticSession } from '../models/SocraticSession.js';
import { diffService } from '../../review-service/services/diffService.js';

const MODEL = 'llama-3.3-70b-versatile';
const MAX_TURNS = 10;
const CONFUSION_PATTERNS = [
  /\bi did not understand\b/i,
  /\bi don['’]t understand\b/i,
  /\bconfused\b/i,
  /\bnot clear\b/i,
  /\bcan you explain\b/i,
  /\bwhat do you mean\b/i,
];

const isConfusedMessage = (text) => CONFUSION_PATTERNS.some((pattern) => pattern.test(text));

const buildRecentConversation = (messages, maxMessages = 8) => {
  const recent = messages.slice(-maxMessages);
  return recent
    .map((msg) => `${msg.role === 'ai' ? 'Tutor' : 'Student'}: ${msg.content}`)
    .join('\n\n');
};

/**
 * Socratic method service
 * Implements Socratic dialogue for guided code learning
 */
export const socraticService = {
  /**
   * Start a new Socratic dialogue session
   * @param {string} userId - User ID starting the session
   * @param {string} code - Code to discuss (wrapped in backticks)
   * @param {string} persona - Reviewer persona (faang, startup, security)
   * @param {Object} context - Optional context object { source, repoFullName, filePath, ref }
   * @returns {Promise<Object>} Session with initial question
   */
  async startSession(userId, code, persona, context = null) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Starting Socratic session for user:', userId, 'persona:', persona, 'context:', context?.source);
      }

      const systemPrompt = buildSocraticSystemPrompt(persona, context);
      const initialMessage = `Here is the code to discuss:\n\n${code}\n\nWhat is your assessment?`;

      // Call AI to get initial question
      const aiResponse = await this.callGroqAPI(systemPrompt, initialMessage);
      const question = this.parseSingleQuestion(aiResponse);

      // Create session with initial exchange
      const sessionData = {
        userId,
        code,
        originalCode: code,
        latestCodeSnapshot: code,
        persona,
        messages: [
          {
            role: 'ai',
            content: question,
          },
        ],
        status: 'active',
      };

      // Add context fields if provided
      if (context?.source === 'github_file') {
        sessionData.source = 'github_file';
        sessionData.repoFullName = context.repoFullName;
        sessionData.filePath = context.filePath;
        sessionData.repoRef = context.ref;
      }

      const session = await SocraticSession.create(sessionData);

      if (process.env.NODE_ENV === 'development') {
        console.log('Session created:', session._id);
      }

      return {
        sessionId: session._id,
        question: question,
        turnNumber: 1,
        maxTurns: MAX_TURNS,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Socratic start error:', error);
      }
      throw error;
    }
  },

  /**
   * Continue an existing Socratic dialogue session
   * @param {string} sessionId - Session ID to continue
   * @param {string} userMessage - User's response to previous question
   * @returns {Promise<Object>} Next question and session status
   */
  async continueSession(sessionId, userMessage, codeSnapshot = null) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Continuing session:', sessionId);
      }

      const session = await SocraticSession.findById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status === 'completed') {
        return {
          sessionId: session._id,
          turnNumber: session.messages.length / 2,
          maxTurns: MAX_TURNS,
          isCompleted: true,
          finalMessage: "You've reached the insight! Switch to Standard Mode for a direct review.",
        };
      }

      // Add user message
      session.messages.push({
        role: 'user',
        content: userMessage,
      });

      // Build compact recent history for faster/cleaner follow-ups.
      const systemPrompt = buildSocraticSystemPrompt(session.persona);
      const conversationHistory = buildRecentConversation(session.messages, 8);
      let codeChangeInstruction = '';
      let confusionInstruction = '';

      if (
        codeSnapshot
        && session.originalCode
        && codeSnapshot !== session.originalCode
      ) {
        const changedContext = diffService.buildChangedContext(
          session.originalCode,
          codeSnapshot,
          3
        );

        if (changedContext.totalChangedLines > 0) {
          codeChangeInstruction = `\n\nNOTE: The developer also changed their code while formulating this answer.\nChanged lines:\n${changedContext.contextBlock}\nAsk ONE question specifically about this code change.\nDo not give a direct answer. Keep Socratic style.`;
        }
      }

      if (isConfusedMessage(userMessage)) {
        confusionInstruction = '\n\nThe student is confused. Ask a simpler clarifying question using plain language and one specific code decision.';
      }

      const followUpPrompt = `${conversationHistory}${codeChangeInstruction}${confusionInstruction}\n\nTutor (ask the next focused question to deepen understanding in 1 short question):`;

      // Get follow-up question
      const aiResponse = await this.callGroqAPI(systemPrompt, followUpPrompt);
      const question = this.parseSingleQuestion(aiResponse);

      // Add AI response
      session.messages.push({
        role: 'ai',
        content: question,
      });

      // Check if session should be completed
      const turnNumber = session.messages.length / 2;
      if (turnNumber >= MAX_TURNS) {
        session.status = 'completed';
      }

      if (typeof codeSnapshot === 'string') {
        session.latestCodeSnapshot = codeSnapshot;
      }

      await session.save();

      return {
        sessionId: session._id,
        question: question,
        turnNumber,
        maxTurns: MAX_TURNS,
        isCompleted: session.status === 'completed',
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Socratic continue error:', error);
      }
      throw error;
    }
  },

  /**
   * Retrieve an existing Socratic session
   * @param {string} sessionId - Session ID to retrieve
   * @param {string} userId - User ID for authorization check
   * @returns {Promise<Object>} Full session with messages and status
   */
  async getSession(sessionId, userId) {
    try {
      const session = await SocraticSession.findOne({ _id: sessionId, userId });
      if (!session) {
        throw new Error('Session not found');
      }

      const turnNumber = session.messages.length / 2;
      return {
        sessionId: session._id,
        messages: session.messages,
        turnNumber,
        maxTurns: MAX_TURNS,
        status: session.status,
        isCompleted: session.status === 'completed',
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Socratic get session error:', error);
      }
      throw error;
    }
  },

  /**
   * Call Groq API for Socratic dialogue
   * @param {string} systemPrompt - System prompt with Socratic instructions
   * @param {string} userMessage - User message or conversation history
   * @returns {Promise<string>} AI response
   */
  async callGroqAPI(systemPrompt, userMessage) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not set in environment');
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
        temperature: 0.35,
        max_tokens: 260,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.error('Groq API error:', error);
      }
      throw new Error(`Groq API error: ${error.error?.message || JSON.stringify(error)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return content;
  },

  /**
   * Parse AI response to extract a single question
   * @param {string} rawText - Raw AI response text
   * @returns {string} Extracted question or fallback message
   */
  parseSingleQuestion(rawText) {
    try {
      const normalizeQuestion = (text) => {
        if (!text) {
          return 'What is the most important risk in this code change?';
        }

        const collapsed = text.replace(/\s+/g, ' ').trim();
        const firstLine = collapsed.split('\n')[0].trim();

        // Keep only the first sentence/question and trim verbosity.
        const sentenceMatch = firstLine.match(/.*?[?!.](\s|$)/);
        let candidate = sentenceMatch ? sentenceMatch[0].trim() : firstLine;

        if (!candidate.endsWith('?')) {
          candidate = `${candidate.replace(/[.!]+$/, '')}?`;
        }

        const words = candidate.split(/\s+/);
        if (words.length > 28) {
          candidate = `${words.slice(0, 28).join(' ').replace(/[.!?]+$/, '')}?`;
        }

        return candidate;
      };

      // Try to parse as JSON first
      let cleanText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      try {
        const parsed = JSON.parse(cleanText);
        return normalizeQuestion(parsed.question || parsed.questions?.[0] || rawText);
      } catch (e) {
        // JSON parsing failed, return raw text
      }

      return normalizeQuestion(rawText);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing question:', error);
      }
      return 'What would you like to explore next?';
    }
  },

  /**
   * Parse AI response to extract multiple questions
   * @param {string} rawText - Raw AI response text
   * @returns {Array<string>} Array of questions
   */
  parseQuestionsResponse(rawText) {
    try {
      // Try to parse as JSON first
      let cleanText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed.questions)) {
          return parsed.questions;
        }
      } catch (e) {
        // JSON parsing failed, extract questions manually
      }

      // Fallback: extract numbered questions
      const questionMatches = rawText.match(/\d+\.\s*([^\n]+)/g);
      if (questionMatches) {
        return questionMatches.map((q) => q.replace(/^\d+\.\s*/, ''));
      }

      // If all else fails, return the raw text as a single question
      return [rawText];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing questions:', error);
      }
      return ['What would you like to explore next?'];
    }
  },
};

