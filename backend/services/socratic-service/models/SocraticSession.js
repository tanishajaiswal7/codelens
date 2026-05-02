import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['ai', 'user'],
    required: true
  },
  content: { type: String, required: true },
}, { _id: false })

const bugSchema = new mongoose.Schema({
  id:           { type: String },
  title:        { type: String },
  explanation:  { type: String },
  lineRef:      { type: String },
  severity:     { type: String },
  fixHint:      { type: String },
}, { _id: false })

const socraticSessionSchema = new mongoose.Schema({
  userId:         { type: String, required: true, index: true },
  code:           { type: String, required: true },
  currentCode:    { type: String, required: true },
  persona:        { type: String, enum: ['faang','startup','security'], required: true },
  bugs:           { type: [bugSchema], default: [] },
  currentBugIndex: { type: Number, default: 0 },
  discoveredBugs: { type: [bugSchema], default: [] },
  messages:       { type: [messageSchema], default: [] },
  turnCount:      { type: Number, default: 0 },
  maxTurns:       { type: Number, default: 10 },
  status:         { type: String, enum: ['active','completed'], default: 'active' },
  overallQuality: { type: String, default: 'fair' },
  language:       { type: String, default: 'unknown' },
  source:         { type: String, default: 'paste' },
  repoFullName:   { type: String, default: null },
  filePath:       { type: String, default: null },
  repoRef:        { type: String, default: null },
}, {
  timestamps: true
})

export default mongoose.model('SocraticSession', socraticSessionSchema)
