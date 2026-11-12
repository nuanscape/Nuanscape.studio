import * as React from 'react'
import { useForm } from 'react-hook-form'
import { formResolver } from '@/lib/form'
import { z } from 'zod'
import type { Budget } from '@/types'
import { useFinanceStore } from '@/stores/finance-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { formatIDR } from '@/lib/utils'

const schema = z.object({
  category: z.string().min(1, 'Pilih kategori'),
  limit: z.coerce.number().positive('Limit harus lebih dari 0'),
})

type Values = z.infer<typeof schema>

const categories = [
  'Operasional',
  'HPP Produk',
  'Marketing',
  'Produksi Konten',
  'Makan',
  'Transportasi',
  'Tagihan',
  'Pendidikan',
  'Kesehatan',
  'Hiburan',
  'Lainnya',
]

export function BudgetModal({
  open,
  onClose,
  budget,
}: {
  open: boolean
  onClose: () => void
  budget?: Budget
}) {
  const { addBudget, updateBudget } = useFinanceStore()
  const { push } = useToastStore()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: formResolver(schema),
    defaultValues: { category: budget?.category ?? 'Operasional', limit: budget?.limit },
  })

  React.useEffect(() => {
    if (open) {
      reset({ category: budget?.category ?? 'Operasional', limit: budget?.limit ?? undefined })
    }
  }, [open, budget, reset])

  const onSubmit = (values: Values) => {
    if (budget) {
      updateBudget(budget.id, { limit: values.limit, category: values.category })
      push({ title: 'Budget diperbarui', description: `${values.category} · ${formatIDR(values.limit)}`, tone: 'success' })
    } else {
      addBudget({ category: values.category, limit: values.limit })
      push({ title: 'Budget dibuat', description: `${values.category} · ${formatIDR(values.limit)}`, tone: 'success' })
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={budget ? 'Ubah budget' : 'Buat budget baru'}
      description="Limit bulanan per kategori. Pengeluaran dihitung dari transaksi yang sudah tercatat."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="budget-form" loading={isSubmitting}>
            {budget ? 'Simpan perubahan' : 'Buat budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Kategori" error={errors.category?.message}>
          <Select {...register('category')}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Limit bulanan (Rp)" error={errors.limit?.message}>
          <Input type="number" min="0" placeholder="0" {...register('limit')} />
        </Field>
        <p className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
          Budget membantu AI memberi peringatan lebih awal. Angka limit tidak memotong transaksi
          secara otomatis.
        </p>
      </form>
    </Dialog>
  )
}
