import axios from 'axios'
import SocraticSession from '../models/SocraticSession.js'

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

function getMaxTurns(bugs) {
  const budget = { critical: 5, high: 4, medium: 3, low: 2 }
  const total = bugs.reduce((sum, bug) => sum + (budget[bug.severity] || 3), 0)
  return Math.min(Math.max(total, 6), 25)
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
    const bugs = [...analysis.bugs]

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

    const maxTurns = getMaxTurns(bugs)
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
      session.discoveredBugs.push(currentBug)
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
        optimizedCode = response.optimizedCode || session.currentCode || session.code
      }
    }

    if (session.turnCount >= session.maxTurns && !completed) {
      session.status = 'completed'
      completed = true
      optimizedCode = response.optimizedCode || session.currentCode || session.code
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
      currentState: session.currentState,
      currentBugIndex: session.currentBugIndex,
      language: session.language,
      quality: session.quality,
    }
  },
}
