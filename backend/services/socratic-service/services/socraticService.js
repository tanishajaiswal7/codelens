import { SocraticSession } from '../models/SocraticSession.js'

const PERSONA_INSTRUCTIONS = {
  faang: `You are a FAANG senior software engineer conducting a Socratic 
    code review. Focus on algorithmic correctness, edge cases, complexity, 
    and SOLID principles. Ask precise technical questions.`,
  startup: `You are a pragmatic startup CTO doing a Socratic review. 
    Focus on bugs that would cause runtime failures, security issues that 
    could be exploited, and logic errors that affect core functionality.`,
  security: `You are a security auditor doing a Socratic review. 
    Focus on injection vulnerabilities, authentication flaws, 
    input validation, and unsafe operations.`
}

export const socraticService = {

  // ── STEP 1: ANALYSIS ─────────────────────────────────────────
  // Analyze code and extract structured bug list
  async analyzeCodeForBugs(code, persona) {
    const systemPrompt = `${PERSONA_INSTRUCTIONS[persona]}

Analyze the provided code and identify ALL real bugs, errors, and 
vulnerabilities. Focus on ACTUAL problems, not style suggestions.

Return ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "bugs": [
    {
      "id": "bug_1",
      "title": "Short bug title",
      "description": "Detailed description of the bug and why it is a problem",
      "lineNumber": 11,
      "lineRef": "line 11" or "lines 18-19",
      "severity": "critical|high|medium|low",
      "keywords": ["keyword1", "keyword2", "concept"],
      "socraticQuestion": "A Socratic question that guides user to discover this bug WITHOUT revealing it"
    }
  ]
}

Rules:
- Maximum 5 bugs
- Only include REAL bugs — actual logic errors, runtime exceptions, security holes, null pointer risks
- Do NOT include style issues or minor naming conventions
- lineNumber must be the exact line where the bug occurs
- keywords are words the user might use when correctly identifying the bug
- socraticQuestion must NOT name the bug directly — it must guide discovery
- Order bugs from most critical to least critical`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Analyze this code:\n\n${code}` }]
      })
    })

    const data = await response.json()
    const rawText = data.content?.[0]?.text?.trim()

    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return parsed.bugs || []
    } catch (err) {
      console.error('[Socratic] Failed to parse bug analysis:', err.message)
      return []
    }
  },

  // ── STEP 2: VALIDATE USER RESPONSE ───────────────────────────
  // Check if user correctly identified the current bug
  async validateUserResponse(userMessage, currentBug, conversationHistory, persona) {
    const systemPrompt = `${PERSONA_INSTRUCTIONS[persona]}

You are validating whether a student correctly identified a specific bug.

Current bug being discussed:
Title: ${currentBug.title}
Description: ${currentBug.description}
Line: ${currentBug.lineRef || currentBug.lineNumber}
Keywords: ${currentBug.keywords.join(', ')}

Evaluate the student's response and return ONLY valid JSON:
{
  "isCorrect": true or false,
  "isPartiallyCorrect": true or false,
  "confidence": 0-100,
  "reasoning": "Why this is correct or incorrect",
  "nextMessage": "Your next Socratic response to the student",
  "conceptsUserIdentified": ["concept1", "concept2"]
}

Rules for isCorrect = true:
- Student mentioned the correct line number OR described the actual problem OR used correct keywords
- Student does NOT need to use exact technical terms — understanding the concept is enough
- "the variable is 0 before division" correctly identifies division by zero even without naming it

Rules for isCorrect = false:
- Student is talking about a completely different issue
- Student's answer is too vague to confirm understanding

Rules for nextMessage:
- If correct: acknowledge their discovery enthusiastically, confirm they found it, explain WHY it is a bug
- If partially correct: encourage them, give a hint toward the specific aspect they missed
- If incorrect: ask a more targeted question about the SPECIFIC bug without revealing it
- NEVER repeat the same question
- NEVER be generic — always reference specific line numbers or code elements`

    const historyMessages = conversationHistory.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          ...historyMessages,
          { 
            role: 'user', 
            content: `Student's response: "${userMessage}"\n\nValidate this response and provide your next message.`
          }
        ]
      })
    })

    const data = await response.json()
    const rawText = data.content?.[0]?.text?.trim()

    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch (err) {
      console.error('[Socratic] Validation parse failed:', err.message)
      return {
        isCorrect: false,
        isPartiallyCorrect: false,
        confidence: 0,
        reasoning: 'Could not validate',
        nextMessage: 'I see what you are thinking. Can you tell me more specifically which line you believe has the issue and what would happen when that code runs?',
        conceptsUserIdentified: []
      }
    }
  },

  // ── STEP 3: GET NEXT BUG QUESTION ────────────────────────────
  // Generate question for the next unresolved bug
  async getNextBugQuestion(nextBug, persona, conversationHistory) {
    const systemPrompt = `${PERSONA_INSTRUCTIONS[persona]}

You need to guide a developer to discover a specific bug through Socratic questioning.
Do NOT reveal what the bug is.
Ask ONE targeted question about the code near line ${nextBug.lineNumber}.

Bug to guide toward (DO NOT REVEAL):
${nextBug.description}

Your question must:
- Reference specific line numbers
- Ask the student to trace code execution mentally
- Be specific to THIS bug, not generic`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Ask a Socratic question to guide toward discovering this bug. Use the code context to make it specific.` }
        ]
      })
    })

    const data = await response.json()
    return data.content?.[0]?.text?.trim() || nextBug.socraticQuestion
  },

  // ── GENERATE OPTIMIZED CODE ───────────────────────────────────
  async generateOptimizedCode(originalCode, solvedBugs, persona) {
    const bugList = solvedBugs
      .map((b, i) => `${i+1}. ${b.title} (line ${b.lineNumber}): ${b.description}`)
      .join('\n')

    const systemPrompt = `${PERSONA_INSTRUCTIONS[persona]}

Fix all the bugs identified below in the code and return ONLY the corrected code.
No explanation. No markdown. No comments about what changed. Just clean working code.

Bugs to fix:
${bugList || 'Fix any bugs you identify'}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: originalCode }]
      })
    })

    const data = await response.json()
    return data.content?.[0]?.text?.trim() || null
  },

  // ── START SESSION ─────────────────────────────────────────────
  async startSession(userId, code, persona, context = null) {
    console.log('[Socratic] Starting session for user:', userId)

    // Phase 1: Analyze code for bugs
    const detectedBugs = await this.analyzeCodeForBugs(code, persona)

    if (detectedBugs.length === 0) {
      const fallbackBug = {
        id: 'bug_general',
        title: 'Code review',
        description: 'General code quality and potential improvements',
        lineNumber: 1,
        lineRef: 'the code',
        severity: 'low',
        keywords: ['bug', 'error', 'issue', 'problem'],
        socraticQuestion: 'Let us walk through this code together. What do you think happens when this code runs? Can you trace the execution step by step?',
        isSolved: false
      }
      detectedBugs.push(fallbackBug)
    }

    const totalBugs = Math.min(detectedBugs.length, 5)
    const bugsToTrack = detectedBugs.slice(0, totalBugs)

    // Get opening question for first bug
    const firstBug = bugsToTrack[0]
    const openingQuestion = firstBug.socraticQuestion || 
      `Let us look at this code together. What do you notice about line ${firstBug.lineNumber}? What happens when this code runs?`

    // Create session
    const session = await SocraticSession.create({
      userId,
      code,
      originalCode: code,
      persona,
      context,
      detectedBugs: bugsToTrack,
      totalBugs,
      currentBugIndex: 0,
      bugsFound: 0,
      turnCount: 0,
      maxTurns: 10,
      analysisComplete: true,
      messages: [{
        role: 'ai',
        content: openingQuestion,
        turn: 0,
        relatedBugId: firstBug.id
      }],
      status: 'active'
    })

    console.log(`[Socratic] Session created: ${session._id}, bugs detected: ${totalBugs}`)

    return {
      sessionId: session._id.toString(),
      messages: [{ role: 'ai', content: openingQuestion }],
      turnCount: 0,
      maxTurns: 10,
      bugsFound: 0,
      totalBugs,
      completed: false
    }
  },

  // ── CONTINUE SESSION ──────────────────────────────────────────
  async continueSession(sessionId, userMessage, codeSnapshot = null) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) throw new Error('Session not found')
    if (session.status === 'completed') {
      return {
        sessionId,
        aiMessage: 'This session has already completed.',
        turnCount: session.turnCount,
        maxTurns: session.maxTurns,
        bugsFound: session.bugsFound,
        totalBugs: session.totalBugs,
        completed: true,
        optimizedCode: session.optimizedCode
      }
    }

    const newTurnCount = session.turnCount + 1
    const currentBug = session.detectedBugs[session.currentBugIndex]

    // Handle code change notification
    let codeChangeNote = ''
    if (codeSnapshot && codeSnapshot !== session.code) {
      codeChangeNote = `\n\n[The developer also changed their code. New code:\n${codeSnapshot}\n]`
      session.code = codeSnapshot
    }

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage + codeChangeNote,
      turn: newTurnCount,
      relatedBugId: currentBug?.id || null
    })

    let aiReply = ''
    let bugSolvedThisTurn = false
    let newBugsFound = session.bugsFound

    // Validate if user correctly identified current bug
    if (currentBug && !currentBug.isSolved) {
      const validation = await this.validateUserResponse(
        userMessage + codeChangeNote,
        currentBug,
        session.messages.slice(-6),
        session.persona
      )

      if (validation.isCorrect && validation.confidence >= 60) {
        // Bug correctly identified
        bugSolvedThisTurn = true
        newBugsFound = session.bugsFound + 1

        session.detectedBugs[session.currentBugIndex].isSolved = true
        session.detectedBugs[session.currentBugIndex].solvedAtTurn = newTurnCount
        session.detectedBugs[session.currentBugIndex].userExplanation = userMessage

        const nextBugIndex = session.currentBugIndex + 1
        const hasMoreBugs = nextBugIndex < session.detectedBugs.length
        const allBugsSolved = newBugsFound >= session.totalBugs

        if (allBugsSolved || !hasMoreBugs) {
          // All bugs found — complete session
          aiReply = `${validation.nextMessage}\n\nExcellent work! You have discovered all ${session.totalBugs} issue${session.totalBugs > 1 ? 's' : ''} in this code! That is the mark of a sharp developer.`
          session.currentBugIndex = nextBugIndex
        } else {
          // Move to next bug
          session.currentBugIndex = nextBugIndex
          const nextBug = session.detectedBugs[nextBugIndex]
          const transition = `${validation.nextMessage}\n\nGreat discovery! That is bug ${newBugsFound} of ${session.totalBugs} found. Let us look at another issue in the code.`
          const nextQuestion = await this.getNextBugQuestion(
            nextBug, 
            session.persona,
            session.messages
          )
          aiReply = `${transition}\n\n${nextQuestion}`
        }
      } else {
        // Not correct or partially correct
        aiReply = validation.nextMessage
      }
    } else {
      // No current bug or all bugs solved — general continuation
      aiReply = 'You have done excellent work analyzing this code. Is there anything specific you would like to understand better?'
    }

    // Check if session should end
    const shouldComplete = 
      newBugsFound >= session.totalBugs || 
      newTurnCount >= session.maxTurns

    if (shouldComplete && session.status !== 'completed') {
      session.status = 'completed'

      // Generate optimized code
      const solvedBugs = session.detectedBugs.filter(b => b.isSolved)
      try {
        session.optimizedCode = await this.generateOptimizedCode(
          session.originalCode,
          solvedBugs.length > 0 ? solvedBugs : session.detectedBugs,
          session.persona
        )
      } catch (err) {
        console.error('[Socratic] Optimized code generation failed:', err.message)
        session.optimizedCode = null
      }

      if (newBugsFound < session.totalBugs && newTurnCount >= session.maxTurns) {
        aiReply = aiReply || `You have used all ${session.maxTurns} turns and found ${newBugsFound} out of ${session.totalBugs} issues. The session is now complete. You can view the full review or try again.`
      }
    }

    // Add AI reply to messages
    session.messages.push({
      role: 'ai',
      content: aiReply,
      turn: newTurnCount,
      relatedBugId: currentBug?.id || null,
      isValidation: bugSolvedThisTurn
    })

    session.turnCount = newTurnCount
    session.bugsFound = newBugsFound
    session.updatedAt = new Date()

    await session.save()

    return {
      sessionId: session._id.toString(),
      aiMessage: aiReply,
      turnCount: newTurnCount,
      maxTurns: session.maxTurns,
      bugsFound: newBugsFound,
      totalBugs: session.totalBugs,
      completed: session.status === 'completed',
      bugSolvedThisTurn,
      optimizedCode: session.status === 'completed' ? session.optimizedCode : null,
      currentBugIndex: session.currentBugIndex
    }
  },

  // ── EXTEND SESSION ────────────────────────────────────────────
  async extendSession(sessionId, userId, additionalTurns = 5) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) throw new Error('Session not found')
    if (session.userId.toString() !== userId) throw new Error('Not your session')

    session.maxTurns = session.maxTurns + additionalTurns
    session.status = 'active'
    session.updatedAt = new Date()
    await session.save()

    return { success: true, newMaxTurns: session.maxTurns }
  },

  // ── GET SESSION ───────────────────────────────────────────────
  async getSession(sessionId, userId) {
    const session = await SocraticSession.findById(sessionId)
    if (!session) throw new Error('Session not found')
    if (session.userId.toString() !== userId) throw new Error('Not your session')

    return {
      sessionId: session._id.toString(),
      messages: session.messages,
      turnCount: session.turnCount,
      maxTurns: session.maxTurns,
      bugsFound: session.bugsFound,
      totalBugs: session.totalBugs,
      completed: session.status === 'completed',
      optimizedCode: session.optimizedCode,
      status: session.status
    }
  }
}

