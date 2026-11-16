import { randomUUID } from 'node:crypto'
import type { NotificationType } from '@prisma/client'
import { loadConfig } from '../config.js'
import { prisma } from '../lib/prisma.js'
import type { AgentFinding, AgentModule, AgentResult } from './contracts.js'
import { createAgentRuntime } from './factory.js'
import { buildAgentSnapshot } from './snapshot.js'

export interface RunAgentPipelineOptions {
  module?: AgentModule
  createNotifications?: boolean
}

export interface PipelineExecutionResult {
  runId: string
  result: AgentResult
  notificationsCreated: number
}

function mapAgentToNotificationType(agent: string): NotificationType {
  switch (agent.toLowerCase()) {
    case 'asep':
      return 'finance'
    case 'ucup':
      return 'shop'
    case 'bambang':
      return 'content'
    default:
      return 'ai'
  }
}

export async function runAgentPipeline(
  ownerId: string,
  options: RunAgentPipelineOptions = {},
): Promise<PipelineExecutionResult> {
  const config = loadConfig()
  const runtime = createAgentRuntime(config)
  const snapshot = await buildAgentSnapshot(ownerId)
  const runId = `run-${randomUUID()}`

  const targetModule: AgentModule = options.module ?? 'Finance'

  const result = await runtime.run({
    runId,
    ownerId,
    module: targetModule,
    snapshot,
  })

  let notificationsCreated = 0

  if (options.createNotifications !== false && result.findings.length > 0) {
    // Buat notifikasi dari temuan bernada warning atau aksi penting
    const actionable = result.findings.filter(
      (f: AgentFinding) => f.tone === 'warning' || Boolean(f.action),
    )

    if (actionable.length > 0) {
      await prisma.appNotification.createMany({
        data: actionable.slice(0, 5).map((f) => ({
          ownerId,
          title: `[${f.agent.toUpperCase()}] ${f.title}`,
          message: f.detail,
          type: mapAgentToNotificationType(f.agent),
          read: false,
        })),
      })
      notificationsCreated = Math.min(actionable.length, 5)
    }
  }

  return {
    runId,
    result,
    notificationsCreated,
  }
}
