import mongoose from 'mongoose'

const bugSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  lineNumber: { type: Number, default: null },
  lineRef: { type: String, default: null },
  severity: { 
    type: String, 
    enum: ['critical', 'high', 'medium', 'low'], 
    default: 'medium' 
  },
  keywords: [{ type: String }],
  isSolved: { type: Boolean, default: false },
  solvedAtTurn: { type: Number, default: null },
  userExplanation: { type: String, default: null }
}, { _id: false })

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['ai', 'user'], required: true },
  content: { type: String, required: true },
  turn: { type: Number, default: 0 },
  relatedBugId: { type: String, default: null },
  isValidation: { type: Boolean, default: false }
}, { _id: false })

const socraticSessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  code: { type: String, required: true },
  persona: { 
    type: String, 
    enum: ['faang', 'startup', 'security'], 
    required: true 
  },
  context: { type: mongoose.Schema.Types.Mixed, default: null },

  // Detected bugs — filled in during analysis phase
  detectedBugs: [bugSchema],
  totalBugs: { type: Number, default: 0 },

  // Progress tracking
  currentBugIndex: { type: Number, default: 0 },
  bugsFound: { type: Number, default: 0 },
  turnCount: { type: Number, default: 0 },
  maxTurns: { type: Number, default: 10 },

  // Conversation
  messages: [messageSchema],

  // State
  status: { 
    type: String, 
    enum: ['active', 'completed', 'extended'], 
    default: 'active' 
  },
  analysisComplete: { type: Boolean, default: false },

  // Result
  optimizedCode: { type: String, default: null },
  originalCode: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export const SocraticSession = mongoose.model(
  'SocraticSession', 
  socraticSessionSchema
)
