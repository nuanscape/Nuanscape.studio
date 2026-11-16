import { z } from 'zod'

export const agentIdSchema = z.enum(['muhe', 'asep', 'ucup', 'bambang'])
export const agentModuleSchema = z.enum(['Finance', 'Shop', 'Content'])

export const agentFindingSchema = z.object({
  agent: agentIdSchema,
  title: z.string().min(3).max(160),
  detail: z.string().min(10).max(1200),
  why: z.string().min(10).max(800),
  tone: z.enum(['positive', 'warning', 'neutral', 'danger']),
  action: z.string().max(300).optional(),
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