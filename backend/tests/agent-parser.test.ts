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

  it('menerima evidence, prioritas, dan langkah tindakan', () => {
    const result = parseAgentResult(
      '<<<NUANSCAPE_JSON>>>{"summary":"Budget iklan melewati batas.","findings":[{"agent":"asep","title":"Budget iklan terlampaui","detail":"Spent 4.600.000 dari limit 4.000.000.","why":"Biaya akuisisi naik.","tone":"warning","action":"Turunkan budget iklan 15%.","priority":"high","confidence":0.86,"evidence":[{"metric":"budgetUsage","value":"115%","baseline":"100%","source":"finance.topCategories"}],"impact":{"metric":"overspend","value":600000,"unit":"Rp"},"steps":["Pause campaign ROAS rendah.","Evaluasi ulang budget Senin."]}]}<<<END_NUANSCAPE_JSON>>>',
    )
    expect(result.findings[0]?.priority).toBe('high')
    expect(result.findings[0]?.confidence).toBe(0.86)
    expect(result.findings[0]?.evidence?.[0]?.metric).toBe('budgetUsage')
    expect(result.findings[0]?.steps).toHaveLength(2)
  })
})