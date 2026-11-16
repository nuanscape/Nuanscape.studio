import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PicoClawAgentRuntime } from '../src/agent/picoclaw.js'
import { loadConfig } from '../src/config.js'

const config = loadConfig()
const runtime = new PicoClawAgentRuntime({
  bin: config.picoclawBin,
  configPath: config.picoclawConfig,
  homeDir: config.picoclawHome,
  workDir: config.picoclawWorkDir,
  timeoutMs: config.picoclawTimeoutMs,
  ...(config.picoclawModel ? { model: config.picoclawModel } : {}),
})

const snapshot = JSON.parse(
  await readFile(path.resolve('agents/picoclaw/context.sample.json'), 'utf8'),
) as unknown

const result = await runtime.run({
  runId: `smoke-${Date.now()}`,
  ownerId: 'demo',
  module: 'Finance',
  snapshot,
})

const agents = [...new Set(result.findings.map((finding) => finding.agent))].join(',')
console.log(`AGENT SMOKE OK: findings=${result.findings.length} agents=${agents}`)