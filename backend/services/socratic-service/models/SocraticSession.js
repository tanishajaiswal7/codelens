import mongoose from 'mongoose'

const detectedBugSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  lineNumber: { type: Number, default: null },
  lineRef: { type: String, default: null },
  severity: { type: String, default: 'medium' },
  keywords: [String],
  socraticQuestion: { type: String, required: true },
  isSolved: { type: Boolean, default: false },
  solvedAtTurn: { type: Number, default: null }
}, { _id: false })

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['ai', 'user'], required: true },
  content: { type: String, required: true },
  turn: { type: Number, default: 0 },
  relatedBugId: { type: String, default: null }
}, { _id: false })

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalCode: { type: String, required: true },
  currentCode: { type: String, required: true },
  persona: { type: String, enum: ['faang', 'startup', 'security'], required: true },
  context: { type: mongoose.Schema.Types.Mixed, default: null },

  detectedBugs: [detectedBugSchema],
  totalBugs: { type: Number, default: 0 },
  currentBugIndex: { type: Number, default: 0 },
  bugsFound: { type: Number, default: 0 },

  turnCount: { type: Number, default: 0 },
  maxTurns: { type: Number, default: 10 },
  hasBeenExtended: { type: Boolean, default: false },

  messages: [messageSchema],
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  optimizedCode: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

export const SocraticSession = mongoose.model('SocraticSession', schema)
