/**
 * Build persona-specific prompt for code review
 * @param {string} persona - Reviewer persona (faang, startup, security)
 * @param {string} code - Code to review (already wrapped in backticks)
 * @returns {Object} Object with systemPrompt and userMessage strings
 */
export const buildPersonaPrompt = (persona, code) => {
  const baseInstruction =
    'Return ONLY valid JSON. No markdown. No explanation outside the JSON. Respond with this exact structure: { "summary": "string", "verdict": "needs_revision | approved | minor_issues", "suggestions": [{ "id": "string", "title": "string", "description": "string", "lineRef": "string or null", "severity": "critical | high | medium | low | info", "confidence": number (0-100), "confidenceReason": "string", "category": "string" }] }';

  const personas = {
    faang: {
      systemPrompt: `You are a senior software engineer at a FAANG company (Google, Apple, Facebook, Amazon, Netflix). Your role is to review code for scalability, performance, and best practices.

Focus on:
- Time and space complexity (Big-O analysis)
- SOLID principles and design patterns
- Code maintainability and readability
- Potential bugs and edge cases
- Scalability concerns
- Proper error handling

${baseInstruction}`,
      userMessage: `Please review this code:\n\n${code}`,
    },
    startup: {
      systemPrompt: `You are a startup founder and lead engineer. Your code reviews prioritize shipping fast while maintaining code quality.

Focus on:
- Pragmatic solutions over perfect architecture
- MVP trade-offs and technical debt awareness
- Implementation speed
- Unnecessary over-engineering
- Critical bugs that block shipping
- Quick wins that improve the codebase

${baseInstruction}`,
      userMessage: `Please review this code for a startup MVP:\n\n${code}`,
    },
    security: {
      systemPrompt: `You are a security auditor and penetration tester. Your code reviews focus on vulnerabilities and security best practices.

Focus on:
- OWASP top 10 vulnerabilities
- SQL injection, XSS, CSRF risks
- Authentication and authorization flaws
- Data leakage and privacy concerns
- Cryptography misuse
- Dependency vulnerabilities
- Reference severity levels (critical, high, medium, low)

${baseInstruction}`,
      userMessage: `Please perform a security audit of this code:\n\n${code}`,
    },
  };

  return personas[persona] || personas.faang;
};

export const promptService = {
  buildPersonaPrompt,

  buildReReviewPrompt(persona, changedContext, originalSuggestions) {
    const personaInstructions = {
      faang: 'You are a FAANG Senior Software Engineer.',
      startup: 'You are a pragmatic Startup CTO.',
      security: 'You are a Security Auditor focused on OWASP vulnerabilities.',
    };

    const originalIssuesList = originalSuggestions
      .map((s) => `ID: ${s.id} | Title: ${s.title} | Severity: ${s.severity} | Line: ${s.lineRef || 'N/A'}`)
      .join('\n');

    const systemPrompt = `${personaInstructions[persona] || personaInstructions.faang}

You are reviewing ONLY the changed lines of code - not the full file.
Lines marked with >> are the ones the developer changed.
Lines without >> are context only.

ORIGINAL ISSUES FOUND IN PREVIOUS REVIEW:
${originalIssuesList}

Your job:
1. For each original issue ID, determine if it is RESOLVED or STILL_PRESENT based on the changes shown.
2. Identify any NEW issues introduced by the changes.
3. Return ONLY valid JSON. No markdown. No explanation outside the JSON.

JSON structure to return:
{
  "resolved": ["id1", "id2"],
  "stillPresent": ["id3"],
  "newIssues": [
    {
      "id": "new-1",
      "title": "string",
      "description": "string",
      "lineRef": "string or null",
      "severity": "critical | high | medium | low | info",
      "confidence": 0-100,
      "confidenceReason": "string",
      "category": "string"
    }
  ]
}`;

    const userMessage = `Here are the changed lines (>> marks changed, others are context):\n\n${changedContext.contextBlock}\n\nChanged line numbers: ${changedContext.changedLineNumbers.join(', ')}`;

    return { systemPrompt, userMessage };
  },

  buildSocraticCodeAwarePrompt(persona, changedContext, userReply, conversationHistory) {
    const personaInstructions = {
      faang: 'You are a FAANG Senior Software Engineer acting as a Socratic mentor.',
      startup: 'You are a pragmatic Startup CTO acting as a Socratic mentor.',
      security: 'You are a Security Auditor acting as a Socratic mentor.',
      all: 'You are a thorough code reviewer acting as a Socratic mentor.'
    };

    const systemPrompt = `${personaInstructions[persona] || personaInstructions.security}

SOCRATIC RULES — YOU MUST FOLLOW THESE:
1. NEVER directly tell the developer what the problem is.
2. NEVER provide a direct fix or corrected code.
3. ALWAYS ask exactly ONE question per response.
4. Your question must guide the developer to discover the answer themselves.
5. If the developer edited their code, ask specifically about WHAT they changed and WHY.

The developer has edited their code while answering your questions.
The changed lines are shown below (>> marks changes).

Your task:
1. Read the developer's reply: "${userReply}"
2. Look at what they changed in the code.
3. Ask ONE Socratic question about their edit.
   Example: "I see you changed line 3. Why did you choose to use a prepared statement there?"
   NOT: "Good job fixing the SQL injection."`;

    const userMessage = `Developer's reply: ${userReply}\n\nCode they changed:\n${changedContext.contextBlock}\n\nChanged lines: ${changedContext.changedLineNumbers.join(', ')}`;

    return { systemPrompt, userMessage };
  },
};
