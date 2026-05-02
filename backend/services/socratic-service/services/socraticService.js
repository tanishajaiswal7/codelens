import axios from 'axios'
import SocraticSession from '../models/SocraticSession.js'

function extractCodeFromMessages(messages = []) {
  const joined = messages.map((message) => message?.content || '').join('\n')
  const codeBlockMatch = joined.match(/```[\w-]*\n([\s\S]*?)```/)
  return codeBlockMatch?.[1]?.trim() || ''
}

function getLastUserMessage(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      const content = messages[i]?.content || ''
      if (!content.includes('[SESSION STATUS]') && !content.includes('developer just edited')) {
        return content
      }
    }
  }
  return ''
}

function getTurnFromMessages(messages = []) {
  const joined = messages.map((message) => message?.content || '').join('\n')
  const match = joined.match(/Turn\s+(\d+)\s+of\s+(\d+)/i)
  if (!match) return { turn: 0, max: 0 }
  return { turn: Number(match[1]), max: Number(match[2]) }
}

function getPrimaryBugFromPrompt(systemPrompt = '') {
  const match = systemPrompt.match(/Bug\s+1:\s+(.+?)\s+at\s+(.+?)\s+\((critical|high|medium|low)\)/i)
  return {
    title: match?.[1] || 'Potential logic issue',
    lineRef: match?.[2] || 'L1-L5',
    severity: match?.[3] || 'medium',
  }
}

function buildFallbackResponse(systemPrompt, messages, maxTokens) {
  const userText = messages.map((message) => message?.content || '').join('\n')
  const code = extractCodeFromMessages(messages)
  const lastUser = (getLastUserMessage(messages) || '').toLowerCase().trim()
  const { turn } = getTurnFromMessages(messages)
  const bug = getPrimaryBugFromPrompt(systemPrompt)

  if (userText.includes('Generate your FIRST question')) {
    return `Let’s start at ${bug.lineRef}. Which input or branch there could fail silently in production, and why?`
  }

  if (userText.includes('Analyse this code') || systemPrompt.includes('code analysis engine')) {
    const lines = code ? code.split('\n').filter(Boolean).length : 1
    return JSON.stringify({
      bugs: [{
        id: '1',
        title: 'Potential logic issue',
        explanation: 'The fallback analyzer could not reach the AI service, so this is a conservative local placeholder issue to keep the session running.',
        lineRef: lines > 1 ? `L1-${Math.min(3, lines)}` : 'L1',
        severity: 'medium',
        fixHint: 'Review the first flow path, input handling, and early returns for correctness.',
      }],
      overallQuality: 'fair',
      language: 'unknown',
    })
  }

  if (systemPrompt.includes('code optimizer') || maxTokens >= 1200) {
    return code || '// Optimized code unavailable in fallback mode.'
  }

  if (!lastUser) {
    return `Focus on ${bug.lineRef}. What assumption is this code making that might break at runtime?`
  }

  if (lastUser.includes("don't know") || lastUser.includes('dont know') || lastUser.includes('you tell') || lastUser.includes('tell me')) {
    if (turn >= 2) {
      return `Great question. Here’s a strong hint: look at ${bug.lineRef} and track untrusted input from request to response. Which value needs stricter validation or sanitization?`
    }
    return `No worries. Small hint: inspect ${bug.lineRef} and identify one value coming from user/request data. What could go wrong if it is empty, malformed, or unexpected?`
  }

  if (lastUser.includes('validation') || lastUser.includes('sanitize') || lastUser.includes('error') || lastUser.includes('null') || lastUser.includes('undefined')) {
    return `Yes, you’re on the right track. Nice catch. Now, for ${bug.title}, what exact guard or check would you add first at ${bug.lineRef}?`
  }

  if (turn >= 4) {
    return `Good effort so far. Final clue for this step: this issue is about ${bug.severity} reliability around ${bug.lineRef}. Name the risky assumption in one sentence, then propose one concrete fix.`
  }

  return `Good start. Look again at ${bug.lineRef}: what is the most fragile assumption there, and how would you harden it?`
}

// ─────────────────────────────────────────────
// INTERNAL: Call Anthropic API
// ─────────────────────────────────────────────
async function callAI(systemPrompt, messages, maxTokens = 500) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackResponse(systemPrompt, messages, maxTokens)
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data.content[0].text.trim()
  } catch (error) {
    console.warn('[Socratic] Anthropic unavailable, using fallback response:', error.message)
    return buildFallbackResponse(systemPrompt, messages, maxTokens)
  }
}


// ─────────────────────────────────────────────
// INTERNAL: Silent code analysis
// ─────────────────────────────────────────────
async function analyseCode(code) {
  const prompt = `You are a code analysis engine.
Analyse this code and find ALL bugs, security issues,
and significant improvement areas.

Return ONLY valid JSON. No markdown. No explanation.
This exact format:
{
  "bugs": [
    {
      "id": "1",
      "title": "Concise bug name",
      "explanation": "What this bug is and why it matters",
      "lineRef": "L3-5",
      "severity": "critical",
      "fixHint": "What the fix looks like (not the exact code)"
    }
  ],
  "overallQuality": "poor|fair|good|excellent",
  "language": "python"
}

Severity must be exactly: critical, high, medium, or low.
Maximum 6 bugs. Focus on real bugs not style preferences.
lineRef format: "L3" for single line, "L3-7" for range.

Code to analyse:
\`\`\`
${code}
\`\`\``

  try {
    const raw = await callAI(
      'You are a code analysis engine. Return only valid JSON.',
      [{ role: 'user', content: prompt }],
      800
    )
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
      overallQuality: parsed.overallQuality || 'fair',
      language: parsed.language || 'unknown',
    }
  } catch (err) {
    console.error('[Socratic] Code analysis failed:', err.message)
    return { bugs: [], overallQuality: 'fair', language: 'unknown' }
  }
}

// ─────────────────────────────────────────────
// INTERNAL: Calculate adaptive max turns
// ─────────────────────────────────────────────
function calculateMaxTurns(bugs) {
  if (!bugs || bugs.length === 0) return 10
  const budget = { critical: 4, high: 3, medium: 2, low: 1 }
  const total = bugs.reduce((sum, bug) => {
    return sum + (budget[bug.severity] || 2)
  }, 0)
  return Math.min(Math.max(total, 6), 24)
}

// ─────────────────────────────────────────────
// INTERNAL: Build AI system prompt
// ─────────────────────────────────────────────
function buildSystemPrompt(persona, bugs, code) {
  const personaVoice = {
    faang: `You are a FAANG Senior Software Engineer mentoring
a developer. You ask about scalability, design patterns,
Big-O complexity, and SOLID principles. You speak like a
thoughtful technical interviewer — precise, challenging,
but encouraging.`,
    security: `You are a Security Auditor mentoring a developer.
You ask from an attacker's mindset. You say things like
"What could a malicious user do if..." and reference OWASP
categories naturally. You are serious about security but
never condescending.`,
    startup: `You are a Startup CTO mentoring a developer.
You care about what breaks in production, tech debt, and
real-world consequences. You ask "What happens when this
gets 10,000 requests a day?" You are pragmatic and fast.`,
  }

  return `${personaVoice[persona] || personaVoice.faang}

YOU ARE RUNNING A SOCRATIC CODE REVIEW SESSION.

THE CODE BEING REVIEWED:
\`\`\`
${code}
\`\`\`

ALL BUGS YOU KNOW ABOUT (never reveal this list directly):
${bugs.map((b, i) =>
  `Bug ${i + 1}: ${b.title} at ${b.lineRef} (${b.severity})`
).join('\n')}

YOUR STRICT RULES:
1. Guide ONE bug at a time in order of severity.
2. NEVER directly say what the bug is. Ask questions.
3. Keep responses under 5 sentences. Be warm and conversational.
4. Always reference specific line numbers from the code.
5. End every response with either a question or clear action.

WHEN USER ANSWERS:
- Correct answer: Genuinely celebrate, confirm the finding,
  ask them HOW they would fix it, then move to next bug.
  Say things like "Yes! Exactly right!" or "Perfect catch!"
- Partial answer: Warmly encourage, give a targeted hint.
  Say "You're on the right track! Think about..."
- Wrong answer: Be patient, give a stronger clue.
  Say "Not quite, but good thinking. Here's a clue:"
- User asks a doubt: Answer clearly in 2-3 sentences,
  then return to the exact same question.

WHEN USER EDITS CODE (you will be told about changes):
- React naturally like a mentor watching someone code.
- Say things like "Oh, I can see you made a change on line X!"
- Evaluate if the change addresses the current bug.
- If fixed: celebrate and move to next bug.
- If partially fixed: acknowledge progress, guide further.
- If unrelated change: briefly acknowledge, continue session.

WHEN ALL BUGS ARE DISCOVERED AND FIXED:
Respond with this exact format (nothing else):
COMPLETE|||[comma,separated,bug,titles]
Example: COMPLETE|||SQL injection,Missing input validation

IMPORTANT: Be a real mentor, not a robot. Use natural
English. Show genuine excitement when user gets it right.
Never use bullet points in your responses.`
}

// ─────────────────────────────────────────────
// INTERNAL: Detect code change between turns
// ─────────────────────────────────────────────
function detectCodeChange(oldCode, newCode) {
  if (!oldCode || !newCode || oldCode === newCode) return null

  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')

  const changedLineNumbers = []
  const maxLen = Math.max(oldLines.length, newLines.length)

  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      changedLineNumbers.push(i + 1)
    }
  }

  if (changedLineNumbers.length === 0) return null

  return {
    hasChange: true,
    changedLines: changedLineNumbers,
    summary: changedLineNumbers.length === 1
      ? `line ${changedLineNumbers[0]}`
      : `lines ${changedLineNumbers[0]}–${changedLineNumbers[changedLineNumbers.length - 1]}`,
    newCode,
  }
}

// ─────────────────────────────────────────────
// EXPORTED SERVICE
// ─────────────────────────────────────────────
export const socraticService = {

  // ── Start a new session ──────────────────────────────────
  async startSession(userId, code, persona, context = null) {

    if (!code || code.trim().length < 20) {
      throw new Error('Please paste at least a few lines of code to begin.')
    }

    // Step 1: Silent analysis
    console.log('[Socratic] Analysing code...')
    const { bugs, overallQuality, language } = await analyseCode(code)
    console.log(`[Socratic] Found ${bugs.length} issues. Quality: ${overallQuality}`)

    if (bugs.length === 0) {
      // Code looks good — start a quality-focused session
      bugs.push({
        id: '1',
        title: 'Code quality and optimisation',
        explanation: 'General code quality review',
        lineRef: 'L1+',
        severity: 'low',
        fixHint: 'Look for readability and performance improvements',
      })
    }

    // Step 2: Calculate adaptive turns
    const maxTurns = calculateMaxTurns(bugs)

    // Step 3: Build system prompt with full context
    const systemPrompt = buildSystemPrompt(persona, bugs, code)

    // Step 4: Generate first question
    const firstQuestion = await callAI(systemPrompt, [
      {
        role: 'user',
        content: `The session is starting. The developer has just submitted their code.
Generate your FIRST question about the most critical bug (${bugs[0]?.title}).
Be specific — reference the actual code and line numbers.
Do not reveal the bug. Just ask a targeted guiding question.
Be warm and welcoming at the start of the session.`,
      },
    ])

    // Step 5: Save to MongoDB
    const session = await SocraticSession.create({
      userId,
      code,
      currentCode: code,
      persona,
      bugs,
      currentBugIndex: 0,
      discoveredBugs: [],
      messages: [{ role: 'ai', content: firstQuestion }],
      turnCount: 0,
      maxTurns,
      status: 'active',
      overallQuality,
      language,
      source: context?.source || 'paste',
      repoFullName: context?.repoFullName || null,
      filePath:     context?.filePath || null,
      repoRef:      context?.repoRef || null,
    })

    return {
      sessionId:      session._id.toString(),
      messages:       [{ role: 'ai', content: firstQuestion }],
      turnCount:      0,
      maxTurns,
      totalBugs:      bugs.length,
      discoveredCount: 0,
      currentBugIndex: 0,
      completed:      false,
      language,
    }
  },

  // ── Continue session with user reply ────────────────────
  async continueSession(sessionId, userMessage, currentCode = null) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) throw new Error('Session not found')

    if (session.status === 'completed') {
      return {
        sessionId,
        aiMessage: 'This session is complete. Start a new review!',
        turnCount: session.turnCount,
        maxTurns: session.maxTurns,
        totalBugs: session.bugs.length,
        discoveredCount: session.discoveredBugs.length,
        completed: true,
      }
    }

    // ── Detect code change ──
    let codeChangeContext = ''
    let codeChanged = false

    if (currentCode && currentCode !== session.currentCode) {
      const change = detectCodeChange(session.currentCode, currentCode)
      if (change) {
        codeChanged = true
        session.currentCode = currentCode
        codeChangeContext = `
[IMPORTANT: The developer just edited their code!]
Changed ${change.summary} in the code.

Previous code at those lines:
${change.changedLines.map(n => {
  const oldLine = session.code.split('\n')[n - 1]
  const newLine = currentCode.split('\n')[n - 1]
  return `L${n} was: ${oldLine || '(empty)'}\nL${n} now: ${newLine || '(empty)'}`
}).join('\n')}

Updated full code:
\`\`\`
${currentCode}
\`\`\`

React to this change naturally before continuing the session.
Check if it addresses the current bug (${session.bugs[session.currentBugIndex]?.title}).`
      }
    }

    // ── Add user message ──
    session.messages.push({ role: 'user', content: userMessage })
    session.turnCount += 1

    // ── Build conversation for AI ──
    const systemPrompt = buildSystemPrompt(
      session.persona,
      session.bugs,
      session.currentCode || session.code
    )

    // Build message history (last 10 messages for context)
    const recentMessages = session.messages
      .slice(-10)
      .map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }))

    // Add code change context if detected
    if (codeChangeContext) {
      recentMessages.push({
        role: 'user',
        content: codeChangeContext,
      })
    }

    // Add progress context
    const progressContext = `[SESSION STATUS]
Turn ${session.turnCount} of ${session.maxTurns}.
Current bug: ${session.bugs[session.currentBugIndex]?.title} (${session.bugs[session.currentBugIndex]?.severity}).
Bugs discovered so far: ${session.discoveredBugs.length} of ${session.bugs.length}.
${session.turnCount >= session.maxTurns - 2
  ? 'IMPORTANT: Only 2 turns remaining. Consider wrapping up.'
  : ''
}`

    recentMessages.unshift({
      role: 'user',
      content: progressContext,
    })

    // ── Call AI ──
    const aiResponse = await callAI(systemPrompt, recentMessages)

    // ── Check completion ──
    const isComplete =
      aiResponse.startsWith('COMPLETE|||') ||
      session.turnCount >= session.maxTurns

    let cleanResponse = aiResponse
    let discoveredBugTitles = []

    if (aiResponse.startsWith('COMPLETE|||')) {
      const parts = aiResponse.split('|||')
      discoveredBugTitles = parts[1]?.split(',').map(s => s.trim()) || []
      cleanResponse = `Outstanding work! You've discovered and understood all
${session.bugs.length} issue${session.bugs.length > 1 ? 's' : ''} in this code
through your own reasoning. That's exactly how great engineers think.
Here's your complete review with the optimized version:`
    } else if (session.turnCount >= session.maxTurns && !isComplete) {
      cleanResponse = aiResponse + `\n\nWe've reached the end of our session.
You made great progress! Let me show you the full review now.`
    }

    // ── Track discovered bugs ──
    if (isComplete || session.turnCount >= session.maxTurns) {
      session.discoveredBugs = session.bugs
      session.status = 'completed'
    }

    // ── Update session ──
    session.messages.push({ role: 'ai', content: cleanResponse })
    if (codeChanged) {
      session.currentCode = currentCode
    }
    await session.save()

    // ── Build optimized code if complete ──
    let optimizedCode = null
    if (isComplete || session.turnCount >= session.maxTurns) {
      optimizedCode = await this.generateOptimizedCode(
        session.currentCode || session.code,
        session.persona,
        session.bugs
      )
    }

    return {
      sessionId,
      aiMessage: cleanResponse,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      totalBugs: session.bugs.length,
      discoveredCount: session.discoveredBugs.length,
      completed: isComplete || session.turnCount >= session.maxTurns,
      codeChanged,
      optimizedCode,
    }
  },

  // ── Generate optimized code at session end ────────────────
  async generateOptimizedCode(code, persona, bugs) {
    const prompt = `You are a ${persona} engineer.
Fix ALL the following issues in this code and return
the complete optimized version.

Issues to fix:
${bugs.map(b => `- ${b.title}: ${b.fixHint}`).join('\n')}

Original code:
\`\`\`
${code}
\`\`\`

Return ONLY the fixed code. No explanation. No markdown fences.
Just the clean, optimized code that a senior engineer would write.`

    try {
      const optimized = await callAI(
        'You are a code optimizer. Return only the fixed code.',
        [{ role: 'user', content: prompt }],
        1500
      )
      return optimized.replace(/```[\w]*\n?|```/g, '').trim()
    } catch {
      return null
    }
  },

  // ── Get session ──────────────────────────────────────────
  async getSession(sessionId, userId) {
    const session = await SocraticSession.findOne({
      _id: sessionId,
      userId,
    })
    if (!session) throw new Error('Session not found')
    return {
      sessionId: session._id.toString(),
      messages: session.messages,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      totalBugs: session.bugs.length,
      discoveredCount: session.discoveredBugs.length,
      completed: session.status === 'completed',
      language: session.language,
    }
  },
}
