import * as React from 'react'
import { Download, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { PageHeader, MetricCard } from '@/components/shared/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Badge } from '@/components/ui/badge'
import { TransactionsTable } from '@/features/finance/components/transactions-table'
import { TransactionModal } from '@/features/finance/components/transaction-modal'
import { useFinanceStore } from '@/stores/finance-store'
import { useToastStore } from '@/stores/app-store'
import { categoryTotals } from '@/lib/metrics'
import { downloadText, formatIDR } from '@/lib/utils'

export function FinanceTransactionsPage() {
  const { transactions } = useFinanceStore()
  const { push } = useToastStore()
  const [modalOpen, setModalOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [type, setType] = React.useState<'all' | 'income' | 'expense'>('all')
  const [category, setCategory] = React.useState('all')
  const [account, setAccount] = React.useState('all')
  const [page, setPage] = React.useState(1)
  const perPage = 10

  const categories = React.useMemo(() => {
    const names = Array.from(new Set(transactions.map((t) => t.category))).sort()
    return names
  }, [transactions])

  const filtered = React.useMemo(() => {
    return transactions
      .filter((t) => type === 'all' || t.type === type)
      .filter((t) => category === 'all' || t.category === category)
      .filter((t) => account === 'all' || t.account === account)
      .filter((t) =>
        !query.trim()
          ? true
          : `${t.description} ${t.category} ${t.source ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [transactions, type, category, account, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)
  const totals = categoryTotals(filtered, 'income').reduce((a, x) => a + x.value, 0)
  const expenseTotals = categoryTotals(filtered, 'expense').reduce((a, x) => a + x.value, 0)

  const exportCsv = () => {
    const header = 'Tanggal,Tipe,Deskripsi,Kategori,Akun,Nominal,Sumber\n'
    const body = filtered
      .map((t) => [t.date, t.type, `"${t.description}"`, t.category, t.account, t.amount, t.source ?? ''].join(','))
      .join('\n')
    downloadText(`transaksi-asistenmuhe-${new Date().toISOString().slice(0, 10)}.csv`, header + body)
    push({ title: 'CSV diunduh', description: `${filtered.length} transaksi diekspor.`, tone: 'success' })
  }

  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="Semua pemasukan dan pengeluaran tercatat. Filter, cari, dan ekspor untuk rekonsiliasi."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>
              <Download /> Ekspor CSV
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus /> Tambah transaksi
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Hasil filter" value={`${filtered.length} transaksi`} deltaLabel={`dari ${transactions.length} total`} accent="yellow" />
        <MetricCard label="Total income" value={formatIDR(totals)} deltaLabel={`${filtered.filter((t) => t.type === 'income').length} pemasukan`} accent="teal" />
        <MetricCard label="Total expense" value={formatIDR(expenseTotals)} deltaLabel={`${filtered.filter((t) => t.type === 'expense').length} pengeluaran`} accent="orange" />
        <MetricCard label="Net" value={formatIDR(totals - expenseTotals)} deltaLabel={totals - expenseTotals >= 0 ? 'arus kas positif' : 'arus kas negatif'} accent="pink" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <Segmented
            value={type}
            size="sm"
            onChange={(v) => {
              setType(v)
              setPage(1)
            }}
            options={[
              { label: 'Semua', value: 'all' },
              { label: 'Pemasukan', value: 'income' },
              { label: 'Pengeluaran', value: 'expense' },
            ]}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Cari deskripsi, kategori, sumber…"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="size-3.5 text-text-muted" />
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
              className="h-9 w-auto min-w-[130px] text-xs"
            >
              <option value="all">Semua kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              value={account}
              onChange={(e) => {
                setAccount(e.target.value)
                setPage(1)
              }}
              className="h-9 w-auto min-w-[110px] text-xs"
            >
              <option value="all">Semua akun</option>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
              <option value="Marketplace">Marketplace</option>
            </Select>
          </div>
        </div>

        <TransactionsTable transactions={rows} emptyMessage="Tidak ada transaksi yang cocok dengan filter." />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <p className="text-[11px] text-text-muted">
            Menampilkan <span className="text-text-secondary">{rows.length}</span> dari{' '}
            <span className="text-text-secondary">{filtered.length}</span> transaksi
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Badge tone="outline">
              {currentPage} / {totalPages}
            </Badge>
            <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      </Card>

      <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
        Data tersimpan lokal di browser (demo). Kategori dan akun digunakan untuk analisis AI. Tidak
        ada koneksi bank sungguhan pada versi ini.
      </p>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
