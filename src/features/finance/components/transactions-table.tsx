import * as React from 'react'
import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Transaction } from '@/types'
import { cn, formatDate, formatIDR } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TD, TH, THead, TBody, TR, Table, TableEmpty } from '@/components/ui/table'
import { DropdownItem, DropdownMenu } from '@/components/ui/dropdown'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useFinanceStore } from '@/stores/finance-store'

export function TransactionsTable({
  transactions,
  emptyMessage = 'Belum ada transaksi.',
  showAccount = true,
}: {
  transactions: Transaction[]
  emptyMessage?: string
  showAccount?: boolean
}) {
  const [toDelete, setToDelete] = React.useState<Transaction | null>(null)
  const { deleteTransaction } = useFinanceStore()

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH className="w-full">Transaksi</TH>
            <TH className="hidden sm:table-cell">Kategori</TH>
            {showAccount ? <TH className="hidden md:table-cell">Akun</TH> : null}
            <TH className="hidden sm:table-cell">Tanggal</TH>
            <TH className="text-right">Nominal</TH>
            <TH className="w-10" />
          </TR>
        </THead>
        <TBody>
          {transactions.length === 0 ? (
            <TableEmpty colSpan={showAccount ? 6 : 5}>{emptyMessage}</TableEmpty>
          ) : (
            transactions.map((t) => (
              <TR key={t.id}>
                <TD className="w-full max-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                        t.type === 'income'
                          ? 'border-primary/20 bg-primary/[0.07] text-primary'
                          : 'border-danger/20 bg-danger/[0.06] text-danger',
                      )}
                    >
                      {t.type === 'income' ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-text-primary">{t.description}</p>
                      <p className="text-[10px] text-text-muted sm:hidden">{t.category} · {formatDate(t.date, 'd MMM')}</p>
                      <p className="hidden text-[10px] text-text-muted sm:block">
                        {t.source ?? (t.recurring !== 'none' ? `Berulang · ${t.recurring}` : 'Sekali')}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD className="hidden sm:table-cell">
                  <Badge tone="outline">{t.category}</Badge>
                </TD>
                {showAccount ? (
                  <TD className="hidden md:table-cell">
                    <span className="text-[11px] text-text-muted">{t.account}</span>
                  </TD>
                ) : null}
                <TD className="hidden sm:table-cell">
                  <span className="text-[11px] text-text-muted">{formatDate(t.date)}</span>
                </TD>
                <TD className="text-right">
                  <span className={cn('num whitespace-nowrap text-[12px] font-medium', t.type === 'income' ? 'text-primary' : 'text-text-primary')}>
                    {t.type === 'income' ? '+' : '-'}
                    <span className="sm:hidden">{formatIDR(t.amount, { compact: true })}</span>
                    <span className="hidden sm:inline">{formatIDR(t.amount)}</span>
                  </span>
                </TD>
                <TD className="text-right">
                  <DropdownMenu
                    width="w-40"
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Aksi transaksi">
                        <MoreHorizontal />
                      </Button>
                    }
                  >
                    <DropdownItem icon={<Trash2 />} danger onClick={() => setToDelete(t)}>
                      Hapus transaksi
                    </DropdownItem>
                  </DropdownMenu>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteTransaction(toDelete.id)
          setToDelete(null)
        }}
        title="Hapus transaksi?"
        description={toDelete ? `“${toDelete.description}” (${formatIDR(toDelete.amount)}) akan dihapus dari catatan demo.` : undefined}
        confirmLabel="Hapus"
      />
    </>
  )
}
