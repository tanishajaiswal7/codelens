import { SocraticSession } from '../models/SocraticSession.js'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

function normalizeAIHistory(history = []) {
  return history
    .filter(message => message && typeof message.content === 'string' && message.content.trim())
    .map(message => ({
      role: message.role === 'ai' ? 'assistant' : message.role,
      content: message.content
    }))
}

function buildBug({ id, title, description, lineNumber, keywords, socraticQuestion }) {
  return {
    id,
    title,
    description,
    lineNumber,
    lineRef: lineNumber ? `line ${lineNumber}` : null,
    severity: 'critical',
    keywords,
    socraticQuestion,
  }
}

function detectHeuristicBugs(code) {
  const lines = code.split(/\r?\n/)
  const bugs = []

  const offByOneLoopIndex = lines.findIndex(line =>
    /for\s*\(\s*(?:let|var|const)\s+\w+\s*=\s*0\s*;\s*\w+\s*<=\s*[^;]+\.length\s*;/.test(line)
  )

  if (offByOneLoopIndex !== -1) {
    const lineNumber = offByOneLoopIndex + 1
    bugs.push(buildBug({
      id: 'bug_1',
      title: 'Off-by-one loop boundary',
      description: 'The loop uses <= against array length, so it reads one element past the end and pulls in undefined on the final iteration.',
      lineNumber,
      keywords: ['<=', 'length', 'undefined'],
      socraticQuestion: `What value does the index reach on the last iteration, and is that index valid for the array on line ${lineNumber}?`,
    }))
  }

  const unsafeAverageLineIndex = lines.findIndex(line =>
    /return\s+[^;]*\/\s*\w+\.length\s*;?/.test(line)
  )

  if (unsafeAverageLineIndex !== -1) {
    const hasEmptyGuard = /if\s*\(\s*!?\w+\.length\s*\)|if\s*\(\s*\w+\.length\s*===\s*0\s*\)/.test(code)

    if (!hasEmptyGuard) {
      const lineNumber = unsafeAverageLineIndex + 1
      bugs.push(buildBug({
        id: bugs.length === 0 ? 'bug_1' : 'bug_2',
        title: 'Division by zero on empty input',
        description: 'The code divides by the array length without guarding against an empty array, which can produce NaN or an invalid average.',
        lineNumber,
        keywords: ['division', 'empty array', 'NaN'],
        socraticQuestion: `What happens to the denominator on line ${lineNumber} when the input array has no elements?`,
      }))
    }
  }

  if (bugs.length === 0) {
    const nullAccessLineIndex = lines.findIndex(line =>
      /\b\w+\.\w+\b/.test(line) && /return|=|\./.test(line)
    )

    if (nullAccessLineIndex !== -1) {
      const lineNumber = nullAccessLineIndex + 1
      bugs.push(buildBug({
        id: 'bug_1',
        title: 'Possible unsafe property access',
        description: 'This line may access a property without checking that the value exists first, which can crash if the input is null or undefined.',
        lineNumber,
        keywords: ['null', 'undefined', 'crash'],
        socraticQuestion: `What value must exist before line ${lineNumber} can safely run?`,
      }))
    }
  }

  return bugs.slice(0, 5)
}

// ── HELPER: Call AI API ──────────────────────────────────────
async function callAI(systemPrompt, userMessage, history = [], maxTokens = 1500) {
  const messages = [
    ...normalizeAIHistory(history),
    { role: 'user', content: userMessage }
  ]

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.content?.[0]?.text?.trim() || ''
      }

      const err = await response.json().catch(() => null)
      throw new Error(`AI API error: ${err?.error?.message || response.statusText || 'Unknown error'}`)
    } catch (anthropicError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Socratic] Anthropic request failed, trying Groq fallback:', anthropicError.message)
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw new Error(`AI API error: ${err?.error?.message || response.statusText || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
  }

  throw new Error('No AI provider configured')
}

// ── HELPER: Parse JSON safely ────────────────────────────────
function parseJSON(text) {
  try {
    const clean = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    return JSON.parse(clean)
  } catch (err) {
    console.error('[Socratic] JSON parse failed')
    return null
  }
}

const PERSONA_STYLE = {
  faang: 'You are a FAANG senior engineer. Focus on algorithmic correctness, edge cases, null safety, and performance.',
  startup: 'You are a pragmatic startup CTO. Focus on bugs that cause crashes, security holes, and logic failures that affect users.',
  security: 'You are a security auditor. Focus on authentication flaws, injection vulnerabilities, unsafe operations, and data exposure.'
}

// ── PHASE 1: ANALYZE CODE FOR BUGS ──────────────────────────
async function analyzeCodeForBugs(code, persona) {
  const system = `${PERSONA_STYLE[persona]}

Analyze the code and find ONLY bugs that would cause:
- Runtime crashes or exceptions
- Incorrect output or wrong calculations  
- Security vulnerabilities that can be exploited
- Data loss or corruption

Return ONLY valid JSON. No text before or after. No markdown.

{
  "bugs": [
    {
      "id": "bug_1",
      "title": "Short title",
      "description": "What goes wrong and why",
      "lineNumber": 4,
      "lineRef": "line 4",
      "severity": "critical",
      "keywords": ["bounds", "undefined", "NaN"],
      "socraticQuestion": "Targeted question guiding discovery without naming the bug"
    }
  ]
}

STRICT RULES:
- Only include bugs that ACTUALLY exist in the code as written
- Do NOT include theoretical or hypothetical issues
- Do NOT include style, naming, or best practice suggestions
- Do NOT pad to reach a higher count — if there are 2 real bugs, return 2
- Maximum 5 bugs, but return FEWER if fewer actually exist
- A bug must cause OBSERVABLE wrong behavior, not just be suboptimal
- lineNumber must be the exact line where the problem occurs
- keywords: words a user would say when correctly identifying this bug
- socraticQuestion: must reference the specific line number, must NOT name the bug`

  let raw = ''

  try {
    raw = await callAI(system, `Analyze this code:\n\n${code}`)
  } catch (error) {
    console.warn('[Socratic] AI bug analysis unavailable, using heuristic fallback:', error.message)
    return detectHeuristicBugs(code)
  }

  const parsed = parseJSON(raw)

  if (!parsed || !Array.isArray(parsed.bugs) || parsed.bugs.length === 0) {
    const heuristicBugs = detectHeuristicBugs(code)

    if (heuristicBugs.length > 0) {
      console.warn('[Socratic] Falling back to heuristic bug detection')
      return heuristicBugs
    }

    console.error('[Socratic] No bugs detected')
    return []
  }

  return parsed.bugs.slice(0, 5)
}

// ── PHASE 2: VALIDATE USER RESPONSE ─────────────────────────
async function validateUserResponse(userMessage, currentBug, recentHistory, code, persona) {
  const historyText = recentHistory
    .slice(-4)
    .map(m => `${m.role === 'ai' ? 'AI' : 'USER'}: ${m.content}`)
    .join('\n')

  const system = `${PERSONA_STYLE[persona]}

Evaluate if the student correctly identified this bug:
Title: ${currentBug.title}
Description: ${currentBug.description}
Line: ${currentBug.lineRef || 'line ' + currentBug.lineNumber}
Keywords: ${currentBug.keywords.join(', ')}

THE CODE:
${code}

RECENT CONVERSATION:
${historyText}

Return ONLY valid JSON:
{
  "isCorrect": true or false,
  "confidence": 0-100,
  "explanation": "Why",
  "responseToStudent": "Your next message"
}

isCorrect = true when:
- Student mentioned correct line AND described what goes wrong
- Student used keywords showing understanding
- Student does NOT need exact terms — conceptual understanding counts
- Example: "line 3 crashes if null" = correct for null pointer bug

isCorrect = false when:
- Describing completely different issue
- Answer too vague
- Mentioned line but no explanation

responseToStudent:
- If correct: Celebrate. Confirm they found it. Explain WHY it is a problem.
- If incorrect: Ask MORE SPECIFIC question about SAME bug. Reference lines. Do NOT repeat exactly.
- NEVER be generic`

  let raw = ''

  try {
    raw = await callAI(system, `Student said: "${userMessage}"`, recentHistory)
  } catch (error) {
    console.warn('[Socratic] AI response validation unavailable, using fallback:', error.message)
    return {
      isCorrect: false,
      confidence: 0,
      responseToStudent: `Look at line ${currentBug.lineNumber}. What changes there, and what happens if the input is empty or missing?`
    }
  }

  const parsed = parseJSON(raw)

  if (!parsed) {
    return {
      isCorrect: false,
      confidence: 0,
      responseToStudent: `Look at line ${currentBug.lineNumber}. What is the value at that point? What happens next?`
    }
  }

  return parsed
}

// ── PHASE 4: GENERATE OPTIMIZED CODE ────────────────────────
async function generateOptimizedCode(originalCode, allBugs, persona) {
  const bugList = allBugs
    .map((b, i) => `Bug ${i+1}: ${b.title}\nLine: ${b.lineNumber}\nIssue: ${b.description}`)
    .join('\n\n')

  const system = `${PERSONA_STYLE[persona]}

Fix ALL bugs listed and return ONLY the fixed code.
No explanation. No markdown. No comments. Just clean code.

Bugs to fix:
${bugList}`

  let fixed = ''

  try {
    fixed = await callAI(system, originalCode, [], 2000)
  } catch (error) {
    console.warn('[Socratic] Optimized code generation unavailable:', error.message)
    return null
  }

  if (fixed === originalCode || fixed.trim() === originalCode.trim()) {
    return null
  }

  return fixed
}

export const socraticService = {

  async startSession(userId, code, persona, context = null) {
    console.log(`[Socratic] Starting. userId=${userId} persona=${persona}`)

    let detectedBugs = await analyzeCodeForBugs(code, persona)

    if (detectedBugs.length === 0) {
      const nobugsMessage = 'I analyzed this code carefully and did not find any critical bugs. The code looks clean! Try adding some intentionally buggy code to practice the Socratic review process.'

      const session = await SocraticSession.create({
        userId,
        originalCode: code,
        currentCode: code,
        persona,
        context,
        detectedBugs: [],
        totalBugs: 0,
        currentBugIndex: 0,
        bugsFound: 0,
        turnCount: 0,
        maxTurns: 10,
        messages: [{ role: 'ai', content: nobugsMessage, turn: 0 }],
        status: 'completed'
      })

      return {
        sessionId: session._id.toString(),
        messages: [{ role: 'ai', content: nobugsMessage }],
        turnCount: 0,
        maxTurns: 10,
        bugsFound: 0,
        totalBugs: 0,
        completed: true
      }
    }

    const totalBugs = detectedBugs.length
    const firstBug = detectedBugs[0]
    const openingMessage = firstBug.socraticQuestion

    const session = await SocraticSession.create({
      userId,
      originalCode: code,
      currentCode: code,
      persona,
      context,
      detectedBugs,
      totalBugs,
      currentBugIndex: 0,
      bugsFound: 0,
      turnCount: 0,
      maxTurns: 10,
      messages: [{
        role: 'ai',
        content: openingMessage,
        turn: 0,
        relatedBugId: firstBug.id
      }],
      status: 'active'
    })

    console.log(`[Socratic] Session created: ${session._id}. Bugs: ${totalBugs}`)

    return {
      sessionId: session._id.toString(),
      messages: [{ role: 'ai', content: openingMessage }],
      turnCount: 0,
      maxTurns: 10,
      bugsFound: 0,
      totalBugs,
      completed: false
    }
  },

  async continueSession(sessionId, userMessage, codeSnapshot = null) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) throw new Error('Session not found')

    if (session.status === 'completed') {
      return {
        sessionId,
        aiMessage: 'This session is already complete.',
        turnCount: session.turnCount,
        maxTurns: session.maxTurns,
        bugsFound: session.bugsFound,
        totalBugs: session.totalBugs,
        completed: true,
        optimizedCode: session.optimizedCode
      }
    }

    let codeChangedNote = ''
    if (codeSnapshot && codeSnapshot.trim() !== session.currentCode.trim()) {
      session.currentCode = codeSnapshot
      codeChangedNote = `\n\n[Developer edited code. Current version:\n${codeSnapshot}\n]`
    }

    const newTurnCount = session.turnCount + 1
    const currentBugIndex = session.currentBugIndex
    const currentBug = session.detectedBugs[currentBugIndex]

    session.messages.push({
      role: 'user',
      content: userMessage,
      turn: newTurnCount,
      relatedBugId: currentBug?.id || null
    })

    let aiReply = ''
    let bugSolvedThisTurn = false
    let newBugsFound = session.bugsFound

    if (currentBug && !currentBug.isSolved) {
      const validation = await validateUserResponse(
        userMessage + codeChangedNote,
        currentBug,
        session.messages,
        session.currentCode,
        session.persona
      )

      console.log(`[Socratic] Validation: correct=${validation.isCorrect} confidence=${validation.confidence}`)

      if (validation.isCorrect && validation.confidence >= 55) {
        bugSolvedThisTurn = true
        newBugsFound = session.bugsFound + 1

        session.detectedBugs[currentBugIndex].isSolved = true
        session.detectedBugs[currentBugIndex].solvedAtTurn = newTurnCount

        const nextBugIndex = currentBugIndex + 1
        const allDone = newBugsFound >= session.totalBugs
        const hasNextBug = nextBugIndex < session.detectedBugs.length

        if (allDone || !hasNextBug) {
          aiReply = `${validation.responseToStudent}\n\n🎉 Outstanding! You have discovered all ${session.totalBugs} bug${session.totalBugs > 1 ? 's' : ''} in this code! That is the mark of a great developer.`
          session.status = 'completed'
        } else {
          session.currentBugIndex = nextBugIndex
          const nextBug = session.detectedBugs[nextBugIndex]
          aiReply = `${validation.responseToStudent}\n\nExcellent — that is bug ${newBugsFound} of ${session.totalBugs} found! Now let us look at another issue.\n\n${nextBug.socraticQuestion}`
        }
      } else {
        aiReply = validation.responseToStudent
      }
    } else {
      aiReply = 'Great analysis! Is there anything else you would like to explore in this code?'
    }

    if (newTurnCount >= session.maxTurns && session.status !== 'completed') {
      session.status = 'completed'
      if (newBugsFound < session.totalBugs) {
        aiReply = `${aiReply}\n\nYou have used all ${session.maxTurns} turns. You found ${newBugsFound} out of ${session.totalBugs} issues. You can reset the session to try again or view the full review.`
      }
    }

    if (session.status === 'completed' && !session.optimizedCode) {
      try {
        session.optimizedCode = await generateOptimizedCode(
          session.originalCode,
          session.detectedBugs,
          session.persona
        )
      } catch (err) {
        console.error('[Socratic] Optimized code generation failed:', err.message)
        session.optimizedCode = null
      }
    }

    session.messages.push({
      role: 'ai',
      content: aiReply,
      turn: newTurnCount,
      relatedBugId: currentBug?.id || null
    })

    session.turnCount = newTurnCount
    session.bugsFound = newBugsFound
    session.updatedAt = new Date()
    await session.save()

    console.log(`[Socratic] Turn ${newTurnCount}/${session.maxTurns}. bugsFound=${newBugsFound}/${session.totalBugs}`)

    return {
      sessionId: session._id.toString(),
      aiMessage: aiReply,
      turnCount: Math.min(newTurnCount, session.maxTurns),
      maxTurns: session.maxTurns,
      bugsFound: newBugsFound,
      totalBugs: session.totalBugs,
      completed: session.status === 'completed',
      bugSolvedThisTurn,
      optimizedCode: session.status === 'completed' ? session.optimizedCode : null
    }
  },

  async extendSession(sessionId, userId, additionalTurns = 5) {
    const session = await SocraticSession.findOne({ _id: sessionId, userId })
    if (!session) throw new Error('Session not found')
    if (session.hasBeenExtended) throw new Error('Session already extended once')

    session.maxTurns += additionalTurns
    session.status = 'active'
    session.hasBeenExtended = true
    session.updatedAt = new Date()
    await session.save()

    return {
      success: true,
      newMaxTurns: session.maxTurns,
      message: `You have ${additionalTurns} more turns!`
    }
  },

  async getSession(sessionId, userId) {
    const session = await SocraticSession.findOne({ _id: sessionId, userId })
    if (!session) throw new Error('Session not found')

    return {
      sessionId: session._id.toString(),
      messages: session.messages,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      bugsFound: session.bugsFound,
      totalBugs: session.totalBugs,
      completed: session.status === 'completed',
      optimizedCode: session.optimizedCode,
      hasBeenExtended: session.hasBeenExtended,
      status: session.status
    }
  }
}

