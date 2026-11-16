import { z } from 'zod'

export const agentIdSchema = z.enum(['muhe', 'asep', 'ucup', 'bambang'])
export const agentModuleSchema = z.enum(['Finance', 'Shop', 'Content'])

export const agentEvidenceSchema = z.object({
  metric: z.string().min(2).max(100),
  value: z.union([z.string().min(1).max(120), z.number()]),
  baseline: z.union([z.string().min(1).max(120), z.number()]).optional(),
  delta: z.union([z.string().min(1).max(120), z.number()]).optional(),
  source: z.string().min(1).max(160).optional(),
})

export const agentImpactSchema = z.object({
  metric: z.string().min(2).max(100),
  value: z.number().optional(),
  unit: z.string().max(40).optional(),
  estimate: z.string().max(200).optional(),
})

export const agentFindingSchema = z.object({
  agent: agentIdSchema,
  title: z.string().min(3).max(160),
  detail: z.string().min(10).max(1200),
  why: z.string().min(10).max(800),
  tone: z.enum(['positive', 'warning', 'neutral', 'danger']),
  action: z.string().max(300).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(agentEvidenceSchema).min(1).max(6).optional(),
  impact: agentImpactSchema.optional(),
  steps: z.array(z.string().min(3).max(240)).min(1).max(5).optional(),
})

export const agentResultSchema = z.object({
  summary: z.string().min(10).max(2000),
  findings: z.array(agentFindingSchema).min(1).max(12),
})

export type AgentId = z.infer<typeof agentIdSchema>
export type AgentModule = z.infer<typeof agentModuleSchema>
export type AgentFinding = z.infer<typeof agentFindingSchema>
export type AgentResult = z.infer<typeof agentResultSchema>

export interface AgentRunInput {
  runId: string
  ownerId: string
  module: AgentModule
  snapshot: unknown
}

export interface AgentRuntime {
  run(input: AgentRunInput, signal?: AbortSignal): Promise<AgentResult>
}