import type { AgentFinding, AgentResult, AgentRunInput, AgentRuntime } from './contracts.js'
import type { AgentContextSnapshot } from './snapshot.js'

export class DeterministicAgentRuntime implements AgentRuntime {
  async run(input?: AgentRunInput): Promise<AgentResult> {
    const snap = input?.snapshot as AgentContextSnapshot | undefined
    if (!snap) {
      return {
        summary:
          'Agent runtime berjalan dalam mode deterministik. Data modul tetap tersedia melalui endpoint Finance, Seller, dan Content.',
        findings: [],
      }
    }

    const findings: AgentFinding[] = []

    // 1. Finance (Asep)
    if (snap.finance) {
      const overBudgets = snap.finance.budgets?.filter((b) => b.spent > b.limit) ?? []
      for (const ob of overBudgets) {
        findings.push({
          agent: 'asep',
          title: `Pengeluaran ${ob.category} melampaui limit anggaran`,
          detail: `Realisasi ${ob.category} mencapai Rp ${ob.spent.toLocaleString('id-ID')} dari batas Rp ${ob.limit.toLocaleString('id-ID')}.`,
          why: 'Pengeluaran melebihi batas anggaran dapat menekan marjin laba bersih usaha.',
          tone: 'warning',
          action: `Evaluasi dan kendalikan pengeluaran kategori ${ob.category}.`,
        })
      }

      if (snap.finance.summary && snap.finance.summary.net > 0) {
        findings.push({
          agent: 'asep',
          title: 'Arus kas bisnis tercatat surplus',
          detail: `Net profit mencapai Rp ${snap.finance.summary.net.toLocaleString('id-ID')} dengan rasio tabungan ${snap.finance.summary.savingsRate}%.`,
          why: 'Kesehatan likuiditas kas terjaga dengan baik untuk operasional.',
          tone: 'positive',
          action: 'Alokasikan sebagian surplus ke cadangan dana darurat bisnis.',
        })
      }
    }

    // 2. Seller (Ucup)
    if (snap.seller) {
      const critical = snap.seller.criticalStock ?? []
      for (const item of critical) {
        findings.push({
          agent: 'ucup',
          title: `Stok kritis pada SKU ${item.name}`,
          detail: `Tersisa ${item.stock} unit, berada di bawah batas minimum ${item.minStock} unit.`,
          why: 'Kehabisan stok pada produk aktif dapat menyebabkan hilangnya potensi penjualan dan ranking toko.',
          tone: 'warning',
          action: `Segera terbitkan PO restock untuk ${item.name}.`,
        })
      }
    }

    // 3. Content (Bambang)
    if (snap.content) {
      if (snap.content.summary?.published > 0) {
        findings.push({
          agent: 'bambang',
          title: 'Portofolio konten aktif terpublikasi',
          detail: `${snap.content.summary.published} konten telah terbit dengan rata-rata engagement ${snap.content.summary.engagement}%.`,
          why: 'Konsistensi publikasi menjaga awareness audiens dan konversi ke toko.',
          tone: 'positive',
          action: 'Lanjutkan produksi batch materi berikutnya.',
        })
      }
    }

    const summary =
      findings.length > 0
        ? `Analisis deterministik snapshot Nuanscape menemukan ${findings.length} poin evaluasi. Kondisi operasional terdistribusi pada ${new Set(findings.map((f) => f.agent)).size} agen spesialis.`
        : 'Snapshot operasional Nuanscape dalam kondisi normal tanpa peringatan kritis.'

    return {
      summary,
      findings,
    }
  }
}
