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

TASK: Perform a comprehensive code analysis to identify ALL real bugs, errors, 
and vulnerabilities. Be thorough and critical.

SEARCH FOR ALL BUG TYPES:
✓ Logic errors (incorrect conditions, off-by-one, wrong operators)
✓ Null/undefined dereference and missing checks
✓ Runtime errors (array access, type mismatches, division by zero)
✓ Infinite loops and deadlocks
✓ Missing return statements or unreachable code
✓ Security vulnerabilities (injection, auth flaws, input validation)
✓ Race conditions and async issues (missing await, unhandled promises)
✓ Resource leaks (unclosed connections, memory leaks)
✓ Error handling gaps (missing try-catch, unhandled errors)
✓ Data integrity issues (lost updates, inconsistent state)

Return ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "bugs": [
    {
      "id": "bug_1",
      "title": "Short bug title",
      "description": "Detailed description of why this is a critical bug and what failure it causes",
      "lineNumber": 11,
      "lineRef": "line 11" or "lines 18-19",
      "severity": "critical|high|medium|low",
      "keywords": ["keyword1", "keyword2", "concept"],
      "socraticQuestion": "A Socratic question that guides user to discover this bug WITHOUT revealing the solution"
    }
  ]
}

CRITICAL RULES:
- Maximum 5 bugs (return the 5 MOST CRITICAL)
- ONLY include REAL bugs — actual problems that cause failure, not style issues
- Do NOT include code style, naming conventions, or minor suggestions
- severity: Use CRITICAL for bugs that cause crashes/security breaches, HIGH for bugs that cause incorrect behavior, MEDIUM for edge cases
- lineNumber must be accurate or null if line cannot be determined
- keywords: Include technical terms user might mention when identifying the bug
- socraticQuestion: Guide discovery without naming the bug
- PRIORITIZE: Order by criticality — most dangerous first
- If code has < 5 bugs, return only what you find (e.g., 1-3 bugs is OK)`

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

    let parsedBugs = []
    try {
      const data = await response.json()
      const rawText = data?.content?.[0]?.text || data?.completion || ''
      const clean = (rawText || '').toString().replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      parsedBugs = parsed.bugs || []
    } catch (err) {
      console.error('[Socratic] Failed to parse bug analysis or AI call failed:', err?.message || err)
      parsedBugs = []
    }

    // If AI didn't return any bugs, fall back to a lightweight static analysis
    if (!parsedBugs || parsedBugs.length === 0) {
      const fallback = this._fallbackStaticAnalysis(code)
      if (fallback && fallback.length > 0) return fallback
    }

    return parsedBugs
  },

  // Lightweight static heuristics to catch many bug types when the AI fails
  _fallbackStaticAnalysis(code) {
    const bugs = []
    let idCounter = 1
    const maxBugs = 5

    // 1. Off-by-one loop detection: for (...) i <= array.length
    const offByOneRegex = /for\s*\([^)]*;[^;]*<=\s*([^\)\s;]+)\.length[^;]*;/g
    let m
    while ((m = offByOneRegex.exec(code)) !== null && bugs.length < maxBugs) {
      const varName = m[1] || 'the array'
      bugs.push({
        id: `fallback_bug_${idCounter++}`,
        title: 'Off-by-one loop bound causing out-of-range access',
        description: `Loop uses a \"<=\" boundary against ${varName}.length which can access one element past the end and cause undefined values or runtime errors.`,
        lineNumber: null,
        lineRef: 'near for-loop',
        severity: 'high',
        keywords: ['off-by-one', 'out-of-range', 'indexing', 'loop'],
        socraticQuestion: `Look at the for-loop that iterates over ${varName}. What happens when the loop index equals ${varName}.length?`,
        isSolved: false
      })
    }

    // 2. Division by zero pattern: / 0
    const divByZeroRegex = /\/\s*0\b/
    if (divByZeroRegex.test(code) && bugs.length < maxBugs) {
      bugs.push({
        id: `fallback_bug_${idCounter++}`,
        title: 'Possible division by zero',
        description: 'Code contains a division by a literal zero which will throw or produce Infinity.',
        lineNumber: null,
        lineRef: 'division expression',
        severity: 'critical',
        keywords: ['division by zero', 'Infinity', 'NaN', 'divide'],
        socraticQuestion: 'What happens when you divide a number by zero in JavaScript? Look at the division expression and what it produces.',
        isSolved: false
      })
    }

    // 3. Null/undefined dereference: variable.property without null check
    const nullDerefRegex = /(\w+)\.\w+(?!\s*=)/g
    const derefMatches = new Set()
    let derefM
    while ((derefM = nullDerefRegex.exec(code)) !== null) {
      const varName = derefM[1]
      if (!['this', 'console', 'Math', 'Array', 'String', 'Object', 'JSON', 'document', 'window'].includes(varName)) {
        derefMatches.add(varName)
      }
    }
    if (derefMatches.size > 0 && bugs.length < maxBugs && !code.includes('if (') && !code.includes('?.')) {
      const firstVar = Array.from(derefMatches)[0]
      bugs.push({
        id: `fallback_bug_${idCounter++}`,
        title: 'Potential null/undefined dereference',
        description: `Variable \"${firstVar}\" is accessed without null/undefined checks. If \"${firstVar}\" is null or undefined, accessing its properties will throw an error.`,
        lineNumber: null,
        lineRef: `${firstVar}.property access`,
        severity: 'high',
        keywords: ['null', 'undefined', 'dereference', 'TypeError', 'optional chaining'],
        socraticQuestion: `What happens if \"${firstVar}\" is null or undefined when you try to access its properties? What checks should you add before accessing it?`,
        isSolved: false
      })
    }

    // 4. Infinite loop detection: while(true) or while(1)
    const infiniteLoopRegex = /while\s*\(\s*true\s*\)|while\s*\(\s*1\s*\)/g
    let infiniteM
    while ((infiniteM = infiniteLoopRegex.exec(code)) !== null && bugs.length < maxBugs) {
      if (!code.includes('break')) {
        bugs.push({
          id: `fallback_bug_${idCounter++}`,
          title: 'Infinite loop detected',
          description: 'Loop condition is always true and no clear exit/break statement found. This will cause the program to hang.',
          lineNumber: null,
          lineRef: 'while(true) loop',
          severity: 'critical',
          keywords: ['infinite loop', 'while true', 'hang', 'break', 'exit'],
          socraticQuestion: 'This loop runs forever - what condition should stop it? How can you exit this loop safely?',
          isSolved: false
        })
        break
      }
    }

    // 5. Missing return statement in function
    const functionRegex = /function\s+\w+\s*\([^)]*\)\s*\{|(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{/g
    let funcM
    let foundMissingReturn = false
    while ((funcM = functionRegex.exec(code)) !== null && bugs.length < maxBugs && !foundMissingReturn) {
      const afterFunc = code.substring(funcM.index + funcM[0].length, funcM.index + 200)
      if (!afterFunc.includes('return ') && (afterFunc.includes('const ') || afterFunc.includes('let ') || afterFunc.includes('=') || afterFunc.includes('}'))) {
        bugs.push({
          id: `fallback_bug_${idCounter++}`,
          title: 'Missing return statement',
          description: 'Function computes a value but may not return it. Function will implicitly return undefined.',
          lineNumber: null,
          lineRef: 'function body',
          severity: 'medium',
          keywords: ['missing return', 'undefined', 'return statement'],
          socraticQuestion: 'This function computes a value but does it actually return it? What will happen if the result is undefined?',
          isSolved: false
        })
        foundMissingReturn = true
      }
    }

    // 6. Array access with potential negative/large index
    const arrayAccessRegex = /(\w+)\[(-?\d+)\]/g
    let arrM
    while ((arrM = arrayAccessRegex.exec(code)) !== null && bugs.length < maxBugs) {
      const arrayName = arrM[1]
      const index = parseInt(arrM[2])
      if (index < 0) {
        bugs.push({
          id: `fallback_bug_${idCounter++}`,
          title: 'Array access with negative index',
          description: `Array \"${arrayName}\" is accessed with index ${index}. Negative indices are allowed in JavaScript but often indicate a logic error.`,
          lineNumber: null,
          lineRef: `${arrayName}[${index}]`,
          severity: 'medium',
          keywords: ['negative index', 'array', 'out of bounds'],
          socraticQuestion: `Why is \"${arrayName}\" being accessed with a negative index? Should this be accessing a different element?`,
          isSolved: false
        })
        break
      }
    }

    // 7. Missing error handling (async without try-catch)
    if (code.includes('async ') && code.includes('await ') && !code.includes('try') && bugs.length < maxBugs) {
      bugs.push({
        id: `fallback_bug_${idCounter++}`,
        title: 'Missing error handling for async operations',
        description: 'Async/await code without try-catch block. If promise rejects, error will crash the application.',
        lineNumber: null,
        lineRef: 'async function',
        severity: 'high',
        keywords: ['try catch', 'error handling', 'async', 'await', 'reject'],
        socraticQuestion: 'What happens if the await statement throws an error? How should you handle potential failures?',
        isSolved: false
      })
    }

    // 8. Variable shadowing
    const varShadowingRegex = /(\b(?:let|const)\s+(\w+)|function\s+(\w+))/g
    const varNames = new Map()
    let varM
    while ((varM = varShadowingRegex.exec(code)) !== null) {
      const name = varM[2] || varM[3]
      if (name && varNames.has(name)) {
        if (bugs.length < maxBugs) {
          bugs.push({
            id: `fallback_bug_${idCounter++}`,
            title: 'Variable shadowing',
            description: `Variable \"${name}\" is redeclared, shadowing the outer scope variable. This can cause confusion and bugs.`,
            lineNumber: null,
            lineRef: `var ${name}`,
            severity: 'medium',
            keywords: ['shadowing', 'variable', 'scope', 'redeclare'],
            socraticQuestion: `Variable \"${name}\" appears to be declared multiple times in different scopes. Which one is being used where?`,
            isSolved: false
          })
          break
        }
      } else if (name) {
        varNames.set(name, true)
      }
    }

    // 9. Logic error: using = instead of == or ===
    const assignmentInCondition = /if\s*\([^)]*=\s*[^=]/g
    if (assignmentInCondition.test(code) && bugs.length < maxBugs) {
      bugs.push({
        id: `fallback_bug_${idCounter++}`,
        title: 'Assignment in conditional (logic error)',
        description: 'Assignment operator (=) used in if condition instead of comparison (== or ===). This assigns value instead of comparing.',
        lineNumber: null,
        lineRef: 'if condition',
        severity: 'high',
        keywords: ['assignment', 'comparison', '=', '==', '===', 'if condition'],
        socraticQuestion: 'In the if condition, is this comparing values or assigning a value? What should this be?',
        isSolved: false
      })
    }

    // 10. Type mismatch: string concatenation instead of addition
    const stringConcatRegex = /["\'][\w\s]*["\\']\s*\+\s*\d+|\d+\s*\+\s*["\'][\w\s]*["\']/
    if (stringConcatRegex.test(code) && bugs.length < maxBugs) {
      bugs.push({
        id: `fallback_bug_${idCounter++}`,
        title: 'String concatenation instead of arithmetic',
        description: 'String and number are added together. This results in string concatenation, not arithmetic addition.',
        lineNumber: null,
        lineRef: 'string + number expression',
        severity: 'medium',
        keywords: ['type coercion', 'string concatenation', 'arithmetic', 'addition'],
        socraticQuestion: 'When you add a string and a number, what happens? Is this the intended behavior?',
        isSolved: false
      })
    }

    return bugs.slice(0, maxBugs)
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

