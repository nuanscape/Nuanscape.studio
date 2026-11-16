import { agentResultSchema, type AgentFinding, type AgentResult } from './contracts.js'

export const AGENT_OUTPUT_START = '<<<NUANSCAPE_JSON>>>'
export const AGENT_OUTPUT_END = '<<<END_NUANSCAPE_JSON>>>'

const TONE_ALIASES: Record<string, AgentFinding['tone']> = {
  positive: 'positive',
  success: 'positive',
  ok: 'positive',
  warning: 'warning',
  warn: 'warning',
  neutral: 'neutral',
  info: 'neutral',
  informational: 'neutral',
  insight: 'neutral',
  danger: 'danger',
  critical: 'danger',
  error: 'danger',
  risk: 'danger',
}

function normalizeTones(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { findings?: unknown }).findings)) {
    return value
  }
  for (const finding of (value as { findings: unknown[] }).findings) {
    if (!finding || typeof finding !== 'object') continue
    const record = finding as Record<string, unknown>
    const raw = typeof record.tone === 'string' ? record.tone.trim().toLowerCase() : ''
    record.tone = TONE_ALIASES[raw] ?? 'neutral'
  }
  return value
}

export function extractAgentJson(output: string): unknown {
  const start = output.lastIndexOf(AGENT_OUTPUT_START)
  const end = output.lastIndexOf(AGENT_OUTPUT_END)
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('AGENT_OUTPUT_MISSING')
  }
  const raw = output.slice(start + AGENT_OUTPUT_START.length, end).trim()
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('AGENT_OUTPUT_INVALID_JSON')
  }
}

export function parseAgentResult(output: string): AgentResult {
  const parsed = agentResultSchema.safeParse(normalizeTones(extractAgentJson(output)))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new Error(`AGENT_OUTPUT_INVALID_SHAPE: ${first?.message ?? 'unknown'}`)
  }
  return parsed.data
}