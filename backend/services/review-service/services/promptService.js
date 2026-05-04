/**
 * Build persona-specific prompt for code review
 * @param {string} persona - Reviewer persona (faang, startup, security)
 * @param {string} code - Code to review (already wrapped in backticks)
 * @returns {Object} Object with systemPrompt and userMessage strings
 */
// Add line numbers to code so the AI can reference exact lines
function addLineNumbers(code) {
  if (!code) return '';
  return code
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')}: ${line}`)
    .join('\n');
}

// System prompt template enforcing line refs, problematicCode and suggestedFix fields
const systemPromptTemplate = (personaInstruction) => `
${personaInstruction}

You are reviewing the code that the developer has pasted.
The code is provided with LINE NUMBERS at the start of each line
in this format:
  1: import express from 'express'
  2: const router = express.Router()

YOUR RULES — follow all of these exactly:

RULE 1 — LINE NUMBERS ARE MANDATORY:
Every suggestion MUST include the exact line number or range
where the issue occurs. Use the line numbers shown in the code.
Format: "lineRef": "47" or "lineRef": "45-52"
If you cannot identify a specific line → do not include that suggestion.
Vague references like "in the catch block" are NOT acceptable.

RULE 2 — SHOW THE PROBLEMATIC CODE:
Every suggestion MUST include the actual problematic line(s)
exactly as they appear in the code.
Format: "problematicCode": "return db.query(f'SELECT * FROM users WHERE id={user}')"
Keep it to 1-3 lines maximum.

RULE 3 — SHOW THE FIX:
Every suggestion MUST include what the fixed version looks like.
Format: "suggestedFix": "stmt = db.prepare('SELECT * FROM users WHERE id=?')\nreturn stmt.execute(user)"
This must be actual code — not a description of what to do.

RULE 4 — BE SPECIFIC IN DESCRIPTION:
Description must reference the specific variable, function name,
or pattern that is the problem.

RULE 5 — SEVERITY MUST MATCH IMPACT:
critical = security vulnerability or data loss risk
high     = bug that will cause incorrect behaviour in production
medium   = code quality issue that will cause maintenance problems
low      = style or minor improvement
info     = best practice suggestion with no functional impact

RULE 6 — CONFIDENCE SCORE MUST BE JUSTIFIED:
confidence 85-100: You can see the exact problem in the code shown
confidence 60-84:  The pattern suggests a problem but context is limited
confidence 35-59:  Possible issue but depends on how this code is used
confidence 0-34:   Speculative — flag but explain uncertainty

RETURN ONLY VALID JSON. No markdown fences. No explanation text.
No text before or after the JSON object.

JSON structure to return:
{
  "summary": "2-3 sentence overview of the code quality",
  "verdict": "approved | minor_issues | needs_revision",
  "suggestions": [
    {
      "id": "s1",
      "title": "Short title max 6 words",
      "description": "Specific description referencing exact line, variable, or function name",
      "lineRef": "exact line number or range like 45-52",
      "problematicCode": "exact code from the file showing the problem",
      "suggestedFix": "exact replacement code showing how to fix it",
      "severity": "critical | high | medium | low | info",
      "confidence": 0-100,
      "confidenceReason": "one sentence explaining why you are this confident",
      "category": "security | performance | error_handling | code_quality | best_practice | input_validation"
    }
  ]
}
`;

export const buildPersonaPrompt = (persona, code) => {
  const personaInstructions = {
    faang:
      "You are a Senior Software Engineer at a FAANG company (Google/Meta/Amazon level). You focus on: scalability, O(n) complexity analysis, SOLID principles, design patterns, and long-term maintainability. You flag code that will not scale beyond 1000 concurrent users. You reference exact line numbers and show specific refactored code.",
    startup:
      "You are a pragmatic Startup CTO who has shipped 3 products to production. You focus on: real bugs that will affect users today, security issues, and performance problems that will hit in the next 6 months. You ignore over-engineering concerns. You flag what actually needs fixing now. You reference exact line numbers and show minimal targeted fixes.",
    security:
      "You are a Security Engineer specialising in OWASP Top 10 vulnerabilities. You focus on: injection attacks, authentication flaws, sensitive data exposure, broken access control, and insecure direct object references. For each issue you name the OWASP category (e.g. A03:2021 Injection). You reference exact line numbers and show the vulnerable code vs safe code.",
  };

  const instr = personaInstructions[persona] || personaInstructions.faang;
  const systemPrompt = systemPromptTemplate(instr);
  const numberedCode = addLineNumbers(code || '');
  const userMessage = `Review this code:\n\n${numberedCode}`;

  return { systemPrompt, userMessage };
};

export const promptService = {
  buildPersonaPrompt,

  buildReReviewPrompt(persona, changedContext, originalSuggestions) {
    const personaInstructions = {
      faang:
        "You are a Senior Software Engineer at a FAANG company (Google/Meta/Amazon level). You focus on: scalability, O(n) complexity analysis, SOLID principles, design patterns, and long-term maintainability. You reference exact line numbers and show specific refactored code.",
      startup:
        "You are a pragmatic Startup CTO who has shipped 3 products to production. You focus on: real bugs that will affect users today, security issues, and performance problems that will hit in the next 6 months. You reference exact line numbers and show minimal targeted fixes.",
      security:
        "You are a Security Engineer specialising in OWASP Top 10 vulnerabilities. You focus on: injection attacks, authentication flaws, sensitive data exposure, broken access control, and insecure direct object references. For each issue you name the OWASP category (e.g. A03:2021 Injection). You reference exact line numbers and show the vulnerable code vs safe code.",
    };

    const originalIssuesList = originalSuggestions
      .map((s) => `ID: ${s.id} | Title: ${s.title} | Severity: ${s.severity} | Line: ${s.lineRef || 'N/A'}`)
      .join('\n');

    const instr = personaInstructions[persona] || personaInstructions.faang;
    const systemPrompt = systemPromptTemplate(instr) + `\nYou are reviewing ONLY the changed lines of code - not the full file.\nLines marked with >> are the ones the developer changed. Lines without >> are context only.\nORIGINAL ISSUES FOUND IN PREVIOUS REVIEW:\n${originalIssuesList}\nYour job:\n1. For each original issue ID, determine if it is RESOLVED or STILL_PRESENT based on the changes shown.\n2. Identify any NEW issues introduced by the changes.\n3. Return ONLY valid JSON. No markdown. No explanation outside the JSON.`;

    // Ensure the changed context is numbered so the AI can reference exact lines
    const numberedContext = addLineNumbers(changedContext.contextBlock || '');

    const userMessage = `Here are the changed lines (>> marks changed, others are context):\n\n${numberedContext}\n\nChanged line numbers: ${changedContext.changedLineNumbers.join(', ')}`;

    return { systemPrompt, userMessage };
  },

  buildSocraticCodeAwarePrompt(persona, changedContext, userReply, conversationHistory) {
    const personaInstructions = {
      faang:
        "You are a Senior Software Engineer at a FAANG company (Google/Meta/Amazon level). You focus on: scalability, O(n) complexity analysis, SOLID principles, design patterns, and long-term maintainability.",
      startup:
        "You are a pragmatic Startup CTO who has shipped 3 products to production. You focus on: real bugs that will affect users today, security issues, and performance problems that will hit in the next 6 months.",
      security:
        "You are a Security Engineer specialising in OWASP Top 10 vulnerabilities. You focus on: injection attacks, authentication flaws, sensitive data exposure, broken access control, and insecure direct object references.",
      all: 'You are a thorough code reviewer acting as a Socratic mentor.'
    };

    const instr = personaInstructions[persona] || personaInstructions.security;
    // Use the same strict system prompt template, then add Socratic-specific rules
    const systemPrompt = systemPromptTemplate(instr) + `\nSOCRATIC RULES — YOU MUST FOLLOW THESE:\n1. NEVER directly tell the developer what the problem is.\n2. NEVER provide a direct fix or corrected code.\n3. ALWAYS ask exactly ONE question per response.\n4. Your question must guide the developer to discover the answer themselves.\n5. If the developer edited their code, ask specifically about WHAT they changed and WHY.\nThe changed lines are shown below (>> marks changes).`;

    const numberedContext = addLineNumbers(changedContext.contextBlock || '');

    const userMessage = `Developer's reply: ${userReply}\n\nCode they changed:\n${numberedContext}\n\nChanged lines: ${changedContext.changedLineNumbers.join(', ')}`;

    return { systemPrompt, userMessage };
  },
};
