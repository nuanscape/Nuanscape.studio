import { describe, expect, it } from 'vitest'
import { extractAgentJson, parseAgentResult } from '../src/agent/parser.js'

const valid = `logo picoclaw
<<<NUANSCAPE_JSON>>>
{"summary":"Arus kas sehat tetapi iklan melebihi budget.","findings":[{"agent":"asep","title":"Budget iklan terlampaui","detail":"Spent 4.600.000 dari limit 4.000.000.","why":"Biaya akuisisi naik.","tone":"warning","action":"Turunkan budget iklan 15%."}]}
<<<END_NUANSCAPE_JSON>>>`

describe('agent parser', () => {
  it('mengekstrak JSON di antara sentinel terakhir', () => {
    expect(extractAgentJson(valid)).toMatchObject({ summary: expect.any(String) })
  })

  it('menolak output tanpa sentinel', () => {
    expect(() => extractAgentJson('tidak ada json')).toThrow('AGENT_OUTPUT_MISSING')
  })

  it('menolak findings kosong', () => {
    expect(() =>
      parseAgentResult(
        '<<<NUANSCAPE_JSON>>>{"summary":"cukup panjang","findings":[]}<<<END_NUANSCAPE_JSON>>>',
      ),
    ).toThrow('AGENT_OUTPUT_INVALID_SHAPE')
  })

  it('menormalkan tone non-kontrak dari LLM', () => {
    const result = parseAgentResult(
      '<<<NUANSCAPE_JSON>>>{"summary":"Temuan dengan tone info.","findings":[{"agent":"ucup","title":"Stok kritis","detail":"Stok di bawah minimum.","why":"Risiko kehilangan penjualan.","tone":"info"}]}<<<END_NUANSCAPE_JSON>>>',
    )
    expect(result.findings[0]?.tone).toBe('neutral')
  })
})