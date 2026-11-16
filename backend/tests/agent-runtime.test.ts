import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PicoClawAgentRuntime } from '../src/agent/picoclaw.js'

let workDir = ''

afterEach(async () => {
  if (workDir) await rm(workDir, { recursive: true, force: true })
  workDir = ''
})

describe('PicoClawAgentRuntime', () => {
  it('menulis snapshot ke semua workspace, memanggil binary, dan memparse hasil', async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'nuanscape-agent-'))
    const calls: Array<{ file: string; args: string[]; env: Record<string, string> }> = []

    const runtime = new PicoClawAgentRuntime({
      bin: '/fake/picoclaw',
      configPath: '/fake/config.json',
      homeDir: '/fake/home',
      workDir,
      timeoutMs: 1000,
      execFile: async (file, args, options) => {
        calls.push({ file, args, env: options.env as Record<string, string> })
        for (const name of ['workspace', 'workspace-asep', 'workspace-ucup', 'workspace-bambang']) {
          expect(existsSync(path.join(workDir, name, 'context.json'))).toBe(true)
        }
        return {
          stdout:
            '<<<NUANSCAPE_JSON>>>{"summary":"Temuan uji runtime.","findings":[{"agent":"asep","title":"Uji","detail":"Detail temuan uji.","why":"Alasan uji.","tone":"neutral"}]}<<<END_NUANSCAPE_JSON>>>',
          stderr: '',
        }
      },
    })

    const result = await runtime.run({
      runId: 'run-1',
      ownerId: 'owner-1',
      module: 'Finance',
      snapshot: { finance: { net: 7300000 } },
    })

    expect(result.findings).toHaveLength(1)
    expect(calls[0]?.file).toBe('/fake/picoclaw')
    expect(calls[0]?.args).toContain('--session')
    expect(calls[0]?.args).toContain('agent:muhe:nuanscape:run-1')
    expect(calls[0]?.env.PICOCLAW_CONFIG).toBe('/fake/config.json')
    expect(calls[0]?.env.PICOCLAW_HOME).toBe('/fake/home')
    expect(existsSync(path.join(workDir, 'workspace', 'context.json'))).toBe(false)
  })

  it('meneruskan error dari proses', async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'nuanscape-agent-'))
    const runtime = new PicoClawAgentRuntime({
      bin: '/fake/picoclaw',
      configPath: '/fake/config.json',
      homeDir: '/fake/home',
      workDir,
      timeoutMs: 1234,
      execFile: async () => {
        throw new Error('ETIMEDOUT')
      },
    })

    await expect(
      runtime.run({
        runId: 'run-2',
        ownerId: 'owner-1',
        module: 'Finance',
        snapshot: {},
      }),
    ).rejects.toThrow('ETIMEDOUT')
  })

  it('memetakan respons provider kosong ke AGENT_PROVIDER_ERROR', async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'nuanscape-agent-'))
    const runtime = new PicoClawAgentRuntime({
      bin: '/fake/picoclaw',
      configPath: '/fake/config.json',
      homeDir: '/fake/home',
      workDir,
      timeoutMs: 1000,
      execFile: async () => ({
        stdout: 'The model returned an empty response. This may indicate a provider error.',
        stderr: '',
      }),
    })

    await expect(
      runtime.run({
        runId: 'run-3',
        ownerId: 'owner-1',
        module: 'Finance',
        snapshot: {},
      }),
    ).rejects.toThrow('AGENT_PROVIDER_ERROR')
  })
})