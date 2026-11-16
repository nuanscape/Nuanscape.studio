import type { AppConfig } from '../config.js'
import type { AgentRuntime } from './contracts.js'
import { DeterministicAgentRuntime } from './deterministic.js'
import { PicoClawAgentRuntime } from './picoclaw.js'

export function createAgentRuntime(config: AppConfig): AgentRuntime {
  if (config.agentRuntime === 'deterministic') {
    return new DeterministicAgentRuntime()
  }

  return new PicoClawAgentRuntime({
    bin: config.picoclawBin,
    configPath: config.picoclawConfig,
    homeDir: config.picoclawHome,
    workDir: config.picoclawWorkDir,
    timeoutMs: config.picoclawTimeoutMs,
    ...(config.picoclawModel ? { model: config.picoclawModel } : {}),
  })
}