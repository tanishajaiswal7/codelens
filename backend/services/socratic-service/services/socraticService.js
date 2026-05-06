import axios from 'axios'
import SocraticSession from '../models/SocraticSession.js'
import { diffService } from '../../review-service/services/diffService.js'
import { promptService as reviewPromptService } from '../../review-service/services/promptService.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

function stripCodeFences(text = '') {
  return text.replace(/```[\w-]*\n?|```/g, '').trim()
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(stripCodeFences(raw))
  } catch {
    return fallback
  }
}

async function callAI(system, messages, maxTokens = 400) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const groqMessages = [
    { role: 'system', content: system },
    ...messages,
  ]

  const response = await axios.post(
    GROQ_URL,
    {
      model: MODEL,
      messages: groqMessages,
      max_tokens: maxTokens,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.choices[0].message.content.trim()
}

async function analyseCode(code) {
  const system = `You are a precise code analysis engine.
Return only valid JSON. No markdown. No explanation.`

  const prompt = `Analyse this code and find all real bugs or significant issues.

Return this exact JSON shape:
{
  "bugs": [
    {
      "id": "bug_1",
      "title": "Short name",
      "what": "What is wrong exactly",
      "why": "Why this matters",
      "where": "L3-5",
      "severity": "critical|high|medium|low",
      "concept": "Underlying concept",
      "giveaway": "A subtle Socratic clue",
      "fix": "What the correct fix looks like"
    }
  ],
  "language": "python|javascript|etc",
  "quality": "poor|fair|good|excellent"
}

Rules:
- Maximum 5 bugs
- Only real bugs, not style issues
- where format must be "L3" or "L3-5"
- severity values must be exactly critical, high, medium, or low

Code:
\`\`\`
${code}
\`\`\``

  try {
    const raw = await callAI(system, [{ role: 'user', content: prompt }], 1000)
    const parsed = safeJsonParse(raw, {})

    return {
      bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
      language: parsed.language || 'code',
      quality: parsed.quality || 'fair',
    }
  } catch (error) {
    console.error('[Socratic] Analysis failed:', error.message)
    return { bugs: [], language: 'code', quality: 'fair' }
  }
}

function getMaxTurns(code, bugs) {
  const lineCount = (code || '').split('\n').length
  const severityBudget = { critical: 5, high: 4, medium: 3, low: 2 }
  const severityTotal = bugs.reduce((sum, bug) => sum + (severityBudget[bug.severity] || 3), 0)

  if (lineCount > 40 || bugs.length >= 4 || severityTotal >= 12) {
    return 20
  }

  return 10
}

function extractCodeChange(oldCode, newCode) {
  if (!oldCode || !newCode || oldCode === newCode) {
    return null
  }

  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')
  const changedLines = []

  for (let index = 0; index < Math.max(oldLines.length, newLines.length); index += 1) {
    if (oldLines[index] !== newLines[index]) {
      changedLines.push(index + 1)
    }
  }

  if (changedLines.length === 0) {
    return null
  }

  return {
    changedLines,
    summary: changedLines.length === 1
      ? `line ${changedLines[0]}`
      : `lines ${changedLines[0]}-${changedLines[changedLines.length - 1]}`,
  }
}

function buildEvaluatorPrompt({ userMessage, currentBug, currentState, conversationHistory, dontKnowCount, codeChangeContext }) {
  return `Evaluate the developer's reply in a Socratic code review session.

CURRENT BUG:
Title: ${currentBug.title}
What: ${currentBug.what}
Why: ${currentBug.why}
Location: ${currentBug.where}
Concept: ${currentBug.concept}

CURRENT SESSION STATE: ${currentState}
TIMES USER SAID DON'T KNOW ON THIS BUG: ${dontKnowCount}

RECENT CONVERSATION:
${conversationHistory.slice(-6).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n')}

${codeChangeContext ? `${codeChangeContext}\n` : ''}
USER'S LATEST MESSAGE: "${userMessage}"

Return this exact JSON and nothing else:
{
  "intent": "answering|asking_doubt|dont_know|asking_to_reveal|off_topic",
  "understanding": 0,
  "nextState": "HINTING|TEACHING|FIXING|QUESTIONING",
  "whatTheyGotRight": "",
  "whatTheyMissed": "",
  "isStuck": false,
  "shouldReveal": false,
  "fixAttemptCorrect": false,
  "fixAttemptPartial": false
}

Rules:
- understanding is 0-100
- 0-20 means completely wrong
- 21-50 means partial understanding
- 51-80 means mostly right but incomplete
- 81-100 means correct identification
- intent must be one of the listed values
- isStuck is true when dontKnowCount >= 3
- shouldReveal is true when isStuck, asking_to_reveal, or dontKnowCount >= 2
- if intent is dont_know and dontKnowCount < 2, nextState should be TEACHING
- if intent is dont_know and dontKnowCount >= 2, nextState should be TEACHING and shouldReveal should be true
- if understanding is 41-79, nextState should be HINTING
- if understanding is 80-100 and the user has identified the bug, nextState should be FIXING
- if the user is already in FIXING and their fix is correct, fixAttemptCorrect should be true
- if the user tried to fix it but is still incomplete, fixAttemptPartial should be true`
}

async function evaluateAnswer({
  userMessage,
  currentBug,
  currentState,
  conversationHistory,
  dontKnowCount,
  codeChangeContext,
}) {
  const system = `You are a precise answer evaluator for a Socratic code review session.
Return only valid JSON. No explanation. No markdown.`

  try {
    const raw = await callAI(system, [{ role: 'user', content: buildEvaluatorPrompt({
      userMessage,
      currentBug,
      currentState,
      conversationHistory,
      dontKnowCount,
      codeChangeContext,
    }) }], 400)

    const parsed = safeJsonParse(raw, null)
    if (!parsed) {
      throw new Error('Invalid evaluator JSON')
    }

    return {
      intent: parsed.intent || 'answering',
      understanding: Number.isFinite(parsed.understanding) ? parsed.understanding : 30,
      nextState: parsed.nextState || 'HINTING',
      whatTheyGotRight: parsed.whatTheyGotRight || '',
      whatTheyMissed: parsed.whatTheyMissed || '',
      isStuck: Boolean(parsed.isStuck),
      shouldReveal: Boolean(parsed.shouldReveal),
      fixAttemptCorrect: Boolean(parsed.fixAttemptCorrect),
      fixAttemptPartial: Boolean(parsed.fixAttemptPartial),
    }
  } catch (error) {
    console.error('[Socratic] Evaluation failed:', error.message)
    return {
      intent: 'answering',
      understanding: 30,
      nextState: 'HINTING',
      whatTheyGotRight: '',
      whatTheyMissed: '',
      isStuck: false,
      shouldReveal: false,
      fixAttemptCorrect: false,
      fixAttemptPartial: false,
    }
  }
}

function buildFirstQuestionPrompt({ bug, code, isFirst }) {
  const intro = isFirst
    ? 'You are starting a Socratic session with a developer.'
    : 'You are continuing a Socratic session with the next bug.'

  return `${intro}

Ask ONE targeted question about this bug:
Title: ${bug.title}
Location: ${bug.where}
Concept: ${bug.concept}
Giveaway clue: ${bug.giveaway}

Code:
\`\`\`
${code}
\`\`\`

Rules:
- Be warm and natural
- Reference ${bug.where} specifically
- Do not reveal the bug title or concept directly
- End with a question mark`
}

async function generateFirstQuestion(bug, persona, code, isFirst) {
  const personaStyle = {
    faang: 'a FAANG Senior Engineer. Warm, direct, and precise.',
    security: 'a Security Auditor. Serious but encouraging.',
    startup: 'a Startup CTO. Pragmatic and production focused.',
  }

  const system = `You are ${personaStyle[persona] || personaStyle.faang}
Ask one Socratic question. Under 3 sentences. Reference line numbers. Never reveal the bug.`

  const raw = await callAI(system, [{ role: 'user', content: buildFirstQuestionPrompt({ bug, code, isFirst }) }], 300)
  return raw.trim()
}

function buildResponderPrompt({
  evaluation,
  currentBug,
  currentState,
  nextState,
  persona,
  code,
  bugIndex,
  totalBugs,
  dontKnowCount,
  nextBug,
  codeChangeContext,
  sessionIsEnding,
}) {
  const personaVoice = {
    faang: 'You are a FAANG Senior Engineer. Warm but precise.',
    security: 'You are a Security Auditor. Serious but encouraging.',
    startup: 'You are a Startup CTO. Direct and pragmatic.',
  }

  const markerRules = nextBug
    ? `If the current bug is now solved and another bug remains, end your response with:\n[[NEXT_QUESTION]]\nAsk one fresh, targeted question about the next issue at ${nextBug.where}.`
    : sessionIsEnding
      ? `If the session is ending, end your response with:\n[[OPTIMIZED_CODE]]\n<the fully fixed code>`
      : ''

  return `${personaVoice[persona] || personaVoice.faang}

You are replying in a Socratic code review session.
Keep responses under 4 sentences. Be warm, natural, and specific.
Never use bullet points.
End with either a question or clear instruction.

CODE BEING REVIEWED:
\`\`\`
${code}
\`\`\`

CURRENT BUG: ${currentBug.title} at ${currentBug.where}
STATE: ${currentState} -> ${nextState}
WHAT USER GOT RIGHT: ${evaluation.whatTheyGotRight || 'nothing yet'}
WHAT USER MISSED: ${evaluation.whatTheyMissed || 'the main point'}
BUG INDEX: ${bugIndex + 1} of ${totalBugs}
DON'T KNOW COUNT: ${dontKnowCount}

${codeChangeContext ? `${codeChangeContext}\n` : ''}
${markerRules ? `${markerRules}\n` : ''}

Response goals:
- If the user is partially correct, give one targeted hint and keep them moving.
- If the user says they do not know, explain the concept simply.
- If the user is stuck, reveal the answer clearly and ask how they would fix it.
- If the user identified the bug correctly, celebrate it and ask how to fix it.
- If the fix is correct, celebrate and transition naturally.
- If this is the final bug, finish the session naturally and include the optimized code marker.`
}

function splitResponderOutput(raw = '') {
  const nextQuestionMarker = '\n[[NEXT_QUESTION]]\n'
  const optimizedCodeMarker = '\n[[OPTIMIZED_CODE]]\n'

  if (raw.includes(nextQuestionMarker)) {
    const [aiMessage, nextBugQuestion] = raw.split(nextQuestionMarker)
    return {
      aiMessage: aiMessage.trim(),
      nextBugQuestion: (nextBugQuestion || '').trim(),
      optimizedCode: null,
    }
  }

  if (raw.includes(optimizedCodeMarker)) {
    const [aiMessage, optimizedCode] = raw.split(optimizedCodeMarker)
    return {
      aiMessage: aiMessage.trim(),
      nextBugQuestion: null,
      optimizedCode: stripCodeFences(optimizedCode || ''),
    }
  }

  return {
    aiMessage: raw.trim(),
    nextBugQuestion: null,
    optimizedCode: null,
  }
}

async function generateResponder({
  evaluation,
  currentBug,
  currentState,
  nextState,
  persona,
  code,
  bugIndex,
  totalBugs,
  dontKnowCount,
  nextBug,
  codeChangeContext,
  sessionIsEnding,
}) {
  const system = `You are giving feedback in a Socratic code review session.
Be warm, natural, and concise.
Never use bullets.
If a next bug exists, append the exact marker [[NEXT_QUESTION]] on its own line and then the next question.
If the session is ending, append the exact marker [[OPTIMIZED_CODE]] on its own line and then the full fixed code.
Do not use both markers in the same response.`

  const messages = [
    { role: 'user', content: buildResponderPrompt({
      evaluation,
      currentBug,
      currentState,
      nextState,
      persona,
      code,
      bugIndex,
      totalBugs,
      dontKnowCount,
      nextBug,
      codeChangeContext,
      sessionIsEnding,
    }) },
  ]

  const raw = await callAI(system, messages, 500)
  return splitResponderOutput(raw)
}

export const socraticService = {
  async startSession(userId, code, persona, context = null) {
    if (!code || code.trim().length < 20) {
      throw new Error('Please paste at least a few lines of code to start.')
    }

    console.log('[Socratic] Analysing code for bugs...')
    const analysis = await analyseCode(code)
    // Ensure a stable severity ordering and strictly cap to 5 bugs
    const bugsRaw = Array.isArray(analysis.bugs) ? analysis.bugs : []
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const bugs = [...bugsRaw].sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 2
      const sb = severityOrder[b.severity] ?? 2
      return sa - sb
    }).slice(0, 5)

    if (bugs.length === 0) {
      bugs.push({
        id: 'bug_1',
        title: 'Code quality',
        what: 'The code could be improved for readability and maintainability',
        why: 'Clear code reduces bugs and makes collaboration easier',
        where: 'L1+',
        severity: 'low',
        concept: 'code quality',
        giveaway: 'Think about how easy this is to read and maintain',
        fix: 'Refactor for clarity',
      })
    }

    const maxTurns = getMaxTurns(code, bugs)
    const firstQuestion = await generateFirstQuestion(bugs[0], persona, code, true)

    const session = await SocraticSession.create({
      userId,
      code,
      currentCode: code,
      persona,
      bugs,
      currentBugIndex: 0,
      discoveredBugs: [],
      messages: [{ role: 'ai', content: firstQuestion }],
      currentState: 'QUESTIONING',
      dontKnowCountForCurrentBug: 0,
      turnCount: 0,
      maxTurns,
      status: 'active',
      language: analysis.language,
      quality: analysis.quality,
      source: context?.source || 'paste',
      repoFullName: context?.repoFullName || null,
      filePath: context?.filePath || null,
      repoRef: context?.repoRef || null,
    })

    return {
      sessionId: session._id.toString(),
      messages: [{ role: 'ai', content: firstQuestion }],
      turnCount: 0,
      maxTurns,
      totalBugs: bugs.length,
      discoveredCount: 0,
      currentState: 'QUESTIONING',
      completed: false,
      language: analysis.language,
    }
  },

  async continueSession(sessionId, userMessage, currentCode = null) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    if (session.status === 'completed') {
      return {
        sessionId,
        aiMessage: 'This session is already complete! Start a new review when you are ready.',
        turnCount: session.turnCount,
        maxTurns: session.maxTurns,
        totalBugs: session.bugs.length,
        discoveredCount: session.discoveredBugs.length,
        completed: true,
        retryRequired: false,
      }
    }

    if (session.status === 'needs_retry') {
      return {
        sessionId,
        aiMessage: 'You reached the turn limit before finding every bug. Try again to restart from turn 0.',
        turnCount: session.turnCount,
        maxTurns: session.maxTurns,
        totalBugs: session.bugs.length,
        discoveredCount: session.discoveredBugs.length,
        currentState: 'NEEDS_RETRY',
        completed: false,
        retryRequired: true,
      }
    }

    const currentBug = session.bugs[session.currentBugIndex]
    if (!currentBug) {
      session.status = 'completed'
      await session.save()

      return {
        sessionId,
        aiMessage: 'Excellent work! You have completed the entire session.',
        turnCount: session.turnCount,
        maxTurns: session.maxTurns,
        totalBugs: session.bugs.length,
        discoveredCount: session.discoveredBugs.length,
        currentState: 'SESSION_DONE',
        completed: true,
        optimizedCode: session.currentCode || session.code,
      }
    }

    let codeChangeContext = ''
    if (currentCode && currentCode !== session.currentCode) {
      const change = extractCodeChange(session.currentCode, currentCode)
      if (change) {
        session.currentCode = currentCode
        codeChangeContext = `[IMPORTANT: The developer just edited their code!]\nChanged ${change.summary}.\nUpdated code:\n\`\`\`\n${currentCode}\n\`\`\``
      }
    }

    session.messages.push({ role: 'user', content: userMessage })
    session.turnCount += 1

    const evaluation = await evaluateAnswer({
      userMessage,
      currentBug,
      currentState: session.currentState,
      conversationHistory: session.messages,
      dontKnowCount: session.dontKnowCountForCurrentBug,
      codeChangeContext,
    })

    if (evaluation.intent === 'dont_know' || evaluation.intent === 'asking_doubt') {
      session.dontKnowCountForCurrentBug += 1
    }

    const shouldReveal = Boolean(
      evaluation.shouldReveal || session.dontKnowCountForCurrentBug >= 3
    )

    const understanding = Number.isFinite(evaluation.understanding) ? evaluation.understanding : 30
    const fixAttemptCorrect = Boolean(evaluation.fixAttemptCorrect)
    const fixAttemptPartial = Boolean(evaluation.fixAttemptPartial)

    let nextState = evaluation.nextState || 'HINTING'
    let bugCompleted = false

    // If the AI or user demonstrates clear understanding, mark the bug as discovered
    try {
      const alreadyDiscovered = session.discoveredBugs && session.discoveredBugs.some((b) => b.id === currentBug.id)
      if (!alreadyDiscovered && (evaluation.shouldReveal || understanding >= 80)) {
        session.discoveredBugs.push(currentBug)
      }
    } catch (e) {
      // defensive: if discoveredBugs malformed, ensure array
      if (!Array.isArray(session.discoveredBugs)) session.discoveredBugs = []
    }

    if (session.currentState === 'FIXING' && fixAttemptCorrect) {
      nextState = 'BUG_COMPLETE'
      bugCompleted = true
    } else if (session.currentState === 'FIXING' && fixAttemptPartial) {
      nextState = 'FIXING'
    } else if (shouldReveal) {
      nextState = 'FIXING'
    } else if (evaluation.intent === 'dont_know' || evaluation.intent === 'asking_doubt') {
      nextState = 'TEACHING'
    } else if (understanding >= 80) {
      nextState = 'FIXING'
    } else if (understanding >= 41) {
      nextState = 'HINTING'
    } else if (nextState !== 'QUESTIONING') {
      nextState = 'HINTING'
    }

    const nextBug = bugCompleted ? session.bugs[session.currentBugIndex + 1] : null
    const sessionIsEnding = bugCompleted && !nextBug

    const response = await generateResponder({
      evaluation,
      currentBug,
      currentState: session.currentState,
      nextState,
      persona: session.persona,
      code: session.currentCode || session.code,
      bugIndex: session.currentBugIndex,
      totalBugs: session.bugs.length,
      dontKnowCount: session.dontKnowCountForCurrentBug,
      nextBug,
      codeChangeContext,
      sessionIsEnding,
    })

    session.currentState = nextState === 'BUG_COMPLETE' ? 'QUESTIONING' : nextState
    session.messages.push({ role: 'ai', content: response.aiMessage })

    let completed = false
    let optimizedCode = null
    let nextBugQuestion = response.nextBugQuestion || null

    if (bugCompleted) {
      // ensure discoveredBugs contains the completed bug exactly once
      if (!session.discoveredBugs.some((b) => b.id === currentBug.id)) {
        session.discoveredBugs.push(currentBug)
      }
      session.currentBugIndex += 1
      session.dontKnowCountForCurrentBug = 0

      if (nextBug) {
        session.currentState = 'QUESTIONING'
        if (!nextBugQuestion) {
          nextBugQuestion = `Let's move to the next issue: what do you notice about ${nextBug.where}?`
        }
        session.messages.push({ role: 'ai', content: nextBugQuestion })
      } else {
        session.status = 'completed'
        completed = true
        
        // Generate optimized code when session completes
        try {
          const generatedOptimized = await this.generateOptimizedCode(
            session.currentCode || session.code,
            session.bugs || [],
            session.persona
          )
          session.optimizedCode = generatedOptimized
          optimizedCode = generatedOptimized || (session.currentCode || session.code)
        } catch (err) {
          console.error('[Socratic] Failed to generate optimized code:', err.message)
          session.optimizedCode = null
          optimizedCode = session.currentCode || session.code
        }
      }
    }

    if (session.turnCount >= session.maxTurns && !completed) {
      const allBugsFound = session.discoveredBugs.length >= session.bugs.length

      if (allBugsFound) {
        session.status = 'completed'
        completed = true
        
        // Generate optimized code when session completes
        try {
          const generatedOptimized = await this.generateOptimizedCode(
            session.currentCode || session.code,
            session.bugs || [],
            session.persona
          )
          session.optimizedCode = generatedOptimized
          optimizedCode = generatedOptimized || (session.currentCode || session.code)
        } catch (err) {
          console.error('[Socratic] Failed to generate optimized code:', err.message)
          session.optimizedCode = null
          optimizedCode = session.currentCode || session.code
        }
      } else {
        session.status = 'needs_retry'
        completed = false
        optimizedCode = null
      }
    }

    await session.save()

    return {
      sessionId,
      aiMessage: response.aiMessage,
      nextBugQuestion,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      totalBugs: session.bugs.length,
      discoveredCount: session.discoveredBugs.length,
      currentState: session.currentState,
      completed,
      retryRequired: session.status === 'needs_retry',
      optimizedCode: optimizedCode || null,
    }
  },

  async getSession(sessionId, userId) {
    const session = await SocraticSession.findOne({
      _id: sessionId,
      userId,
    })

    if (!session) {
      throw new Error('Session not found')
    }

    return {
      sessionId: session._id.toString(),
      messages: session.messages,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      totalBugs: session.bugs.length,
      discoveredCount: session.discoveredBugs.length,
      completed: session.status === 'completed',
      retryRequired: session.status === 'needs_retry',
      currentState: session.currentState,
      currentBugIndex: session.currentBugIndex,
      language: session.language,
      quality: session.quality,
    }
  },

  // New: handle code-aware socratic reply triggered asynchronously by a worker
  async continueSessionWithCode(sessionId, userMessage, codeSnapshot, originalCode = null) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    // If no change detected, fall back to standard continueSession
    const changedContext = diffService.buildChangedContext(originalCode || session.currentCode || '', codeSnapshot || '')
    if (!changedContext || !changedContext.changedLineNumbers || changedContext.changedLineNumbers.length === 0) {
      return this.continueSession(sessionId, userMessage, codeSnapshot)
    }

    // Build a Socratic prompt that focuses on changed lines and the user's reply
    const { systemPrompt, userMessage: builtUserMessage } = reviewPromptService.buildSocraticCodeAwarePrompt(
      session.persona,
      changedContext,
      userMessage,
      session.messages || []
    )

    // Call AI directly for an immediate Socratic follow-up
    const raw = await callAI(systemPrompt, [{ role: 'user', content: builtUserMessage }], 300)
    const aiMessage = stripCodeFences(raw.trim())

    session.messages.push({ role: 'user', content: userMessage })
    session.messages.push({ role: 'ai', content: aiMessage })
    session.turnCount += 1
    session.currentCode = codeSnapshot || session.currentCode

    let completed = false
    if (session.turnCount >= session.maxTurns) {
      if (session.discoveredBugs.length >= session.bugs.length) {
        session.status = 'completed'
        completed = true
      } else {
        session.status = 'needs_retry'
        completed = false
      }
    }

    await session.save()

    return {
      sessionId: session._id.toString(),
      aiMessage,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      completed,
      retryRequired: session.status === 'needs_retry',
      codeAware: true,
    }
  },

  async generateOptimizedCode(originalCode, bugs, persona) {
    const personaInstructions = {
      faang: 'You are a FAANG senior engineer. Optimize for performance, readability, and SOLID principles.',
      startup: 'You are a startup CTO. Fix the bugs and keep the code pragmatic and clean.',
      security: 'You are a security auditor. Fix all vulnerabilities and add proper input validation.'
    }

    const bugsText = bugs && bugs.length > 0
      ? `Known issues to fix:\n${bugs.map((b, i) => `${i+1}. ${b.title || b.what || b}`).join('\n')}`
      : 'Fix any issues found during the Socratic session.'

    const systemPrompt = `${personaInstructions[persona] || personaInstructions.security}

You are given code that was reviewed in a Socratic session.
${bugsText}

Return ONLY the corrected, optimized code.
No explanation. No markdown fences. No comments about what you changed.
Just the clean, fixed code ready to use.`

    const userMessage = `Here is the original code:\n\n${originalCode}\n\nReturn only the fixed and optimized version.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-20250514',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      })

      const data = await response.json()
      const optimized = data.content?.[0]?.text?.trim()

      if (!optimized || optimized === originalCode) {
        return null
      }

      return optimized
    } catch (err) {
      console.error('[Socratic] Optimized code generation failed:', err.message)
      return null
    }
  },
}

