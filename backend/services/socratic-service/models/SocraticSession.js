import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['ai', 'user'], required: true },
  content: { type: String, required: true },
}, { _id: false })

const bugSchema = new mongoose.Schema({
  id: { type: String },
  title: { type: String },
  what: { type: String },
  why: { type: String },
  where: { type: String },
  severity: { type: String },
  concept: { type: String },
  giveaway: { type: String },
  fix: { type: String },
}, { _id: false })

const socraticSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  currentCode: { type: String, required: true },
  persona: { type: String, enum: ['faang', 'startup', 'security'], required: true },
  bugs: { type: [bugSchema], default: [] },
  currentBugIndex: { type: Number, default: 0 },
  discoveredBugs: { type: [bugSchema], default: [] },
  messages: { type: [messageSchema], default: [] },
  currentState: { type: String, default: 'QUESTIONING' },
  dontKnowCountForCurrentBug: { type: Number, default: 0 },
  turnCount: { type: Number, default: 0 },
  maxTurns: { type: Number, default: 10 },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  language: { type: String, default: 'code' },
  quality: { type: String, default: 'fair' },
  source: { type: String, default: 'paste' },
  repoFullName: { type: String, default: null },
  filePath: { type: String, default: null },
  repoRef: { type: String, default: null },
}, { timestamps: true })

export default mongoose.model('SocraticSession', socraticSessionSchema)
