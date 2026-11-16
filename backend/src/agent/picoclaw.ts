import { execFile as nodeExecFile } from 'node:child_process'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AgentResult, AgentRunInput, AgentRuntime } from './contracts.js'
import { parseAgentResult } from './parser.js'
import { buildAgentPrompt } from './prompt.js'

const WORKSPACES = ['workspace', 'workspace-asep', 'workspace-ucup', 'workspace-bambang']

interface RuntimeConfig {
  agents?: {
    defaults?: { workspace?: string }
    list?: Array<{ workspace?: string }>
  }
}

export type ExecFileRunner = (
  file: string,
  args: string[],
  options: {
    cwd: string
    env: Record<string, string>
    timeout: number
    maxBuffer: number
    encoding: 'utf8'
    signal?: AbortSignal
  },
) => Promise<{ stdout: string; stderr: string }>

const defaultExecFile: ExecFileRunner = (file, args, options) =>
  new Promise((resolve, reject) => {
    nodeExecFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ stdout, stderr })
    })
  })

export interface PicoClawRuntimeOptions {
  bin: string
  configPath: string
  homeDir: string
  workDir: string
  timeoutMs: number
  model?: string
  execFile?: ExecFileRunner
}

export class PicoClawAgentRuntime implements AgentRuntime {
  constructor(private readonly options: PicoClawRuntimeOptions) {}

  async run(input: AgentRunInput, signal?: AbortSignal): Promise<AgentResult> {
    const workspaces = WORKSPACES.map((name) => path.join(this.options.workDir, name))
    const snapshot = JSON.stringify(input.snapshot, null, 2)
    const prepared = await this.prepareConfig(input.runId)

    await Promise.all(
      workspaces.map(async (dir) => {
        await mkdir(dir, { recursive: true })
        await writeFile(path.join(dir, 'context.json'), snapshot, 'utf8')
      }),
    )

    try {
      const args = [
        'agent',
        '--message',
        buildAgentPrompt(input),
        '--session',
        `agent:muhe:nuanscape:${input.runId}`,
      ]
      if (this.options.model) args.push('--model', this.options.model)

      const { stdout, stderr } = await this.exec(args, signal, prepared.configPath)
      try {
        return parseAgentResult(stdout)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'AGENT_OUTPUT_MISSING' &&
          /empty response|credits insufficient|unauthorized|invalid api key/i.test(
            `${stdout}\n${stderr}`,
          )
        ) {
          throw new Error(
            'AGENT_PROVIDER_ERROR: provider tidak mengembalikan respons; periksa kredensial dan saldo model.',
          )
        }
        throw error
      }
    } finally {
      await Promise.all(
        workspaces.map((dir) => unlink(path.join(dir, 'context.json')).catch(() => undefined)),
      )
      await prepared.cleanup()
    }
  }

  private async prepareConfig(runId: string): Promise<{ configPath: string; cleanup: () => Promise<void> }> {
    try {
      const raw = JSON.parse(await readFile(this.options.configPath, 'utf8')) as RuntimeConfig
      const absolute = (value?: string) =>
        value ? (path.isAbsolute(value) ? value : path.resolve(this.options.workDir, value)) : value

      if (raw.agents?.defaults?.workspace) {
        raw.agents.defaults.workspace = absolute(raw.agents.defaults.workspace)
      }
      for (const agent of raw.agents?.list ?? []) {
        if (agent.workspace) agent.workspace = absolute(agent.workspace)
      }

      const configPath = path.join(
        path.dirname(this.options.configPath),
        `config.runtime-${runId}.json`,
      )
      await mkdir(this.options.homeDir, { recursive: true })
      await writeFile(configPath, JSON.stringify(raw, null, 2), 'utf8')
      return {
        configPath,
        cleanup: async () => {
          await unlink(configPath).catch(() => undefined)
        },
      }
    } catch {
      return { configPath: this.options.configPath, cleanup: async () => undefined }
    }
  }

  private async exec(args: string[], signal?: AbortSignal, configPath?: string) {
    const runner = this.options.execFile ?? defaultExecFile
    return runner(this.options.bin, args, {
      cwd: this.options.workDir,
      env: {
        PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
        HOME: process.env.HOME ?? this.options.homeDir,
        PICOCLAW_CONFIG: configPath ?? this.options.configPath,
        PICOCLAW_HOME: this.options.homeDir,
        PICOCLAW_LOG_LEVEL: 'warn',
      },
      timeout: this.options.timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
      encoding: 'utf8',
      ...(signal ? { signal } : {}),
    })
  }
}