import * as React from 'react'
import { useForm } from 'react-hook-form'
import { formResolver } from '@/lib/form'
import { z } from 'zod'
import type { Transaction } from '@/types'
import { useFinanceStore } from '@/stores/finance-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { dateOffset, formatIDR } from '@/lib/utils'

const schema = z.object({
  type: z.enum(['income', 'expense']),
  description: z.string().min(2, 'Deskripsi minimal 2 karakter'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  category: z.string().min(1),
  date: z.string().min(1),
  account: z.enum(['Personal', 'Business', 'Marketplace']),
  recurring: z.enum(['none', 'monthly', 'weekly']),
  source: z.string().optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const categories = {
  income: ['Gaji', 'Business Income', 'Freelance', 'Marketplace', 'Investasi', 'Lainnya'],
  expense: [
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
  ],
}

export function TransactionModal({
  open,
  onClose,
  defaultType = 'expense',
  defaultCategory,
}: {
  open: boolean
  onClose: () => void
  defaultType?: Transaction['type']
  defaultCategory?: string
}) {
  const { addTransaction } = useFinanceStore()
  const { push } = useToastStore()
  const [type, setType] = React.useState<Transaction['type']>(defaultType)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: formResolver(schema),
    defaultValues: {
      type: defaultType,
      category: defaultCategory ?? (defaultType === 'income' ? 'Freelance' : 'Operasional'),
      date: dateOffset(0),
      account: defaultType === 'income' ? 'Personal' : 'Business',
      recurring: 'none',
    },
  })

  React.useEffect(() => {
    if (open) {
      setType(defaultType)
      reset({
        type: defaultType,
        description: '',
        amount: undefined as unknown as number,
        category: defaultCategory ?? (defaultType === 'income' ? 'Freelance' : 'Operasional'),
        date: dateOffset(0),
        account: defaultType === 'income' ? 'Personal' : 'Business',
        recurring: 'none',
        source: '',
        note: '',
      })
    }
  }, [open, defaultType, defaultCategory, reset])

  const amount = watch('amount')

  const onSubmit = (values: FormValues) => {
    addTransaction({ ...values, type } as Omit<Transaction, 'id'>)
    push({
      title: values.type === 'income' ? 'Pemasukan dicatat' : 'Pengeluaran dicatat',
      description: `${values.description} · ${formatIDR(values.amount)}`,
      tone: 'success',
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah transaksi"
      description="Catat pemasukan atau pengeluaran dengan kategori yang tepat."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button form="transaction-form" type="submit" loading={isSubmitting}>
            Simpan transaksi
          </Button>
        </>
      }
    >
      <form id="transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Segmented
          className="w-full"
          value={type}
          onChange={(value) => {
            setType(value)
            setValue('type', value)
            setValue('category', value === 'income' ? 'Freelance' : 'Operasional')
            setValue('account', value === 'income' ? 'Personal' : 'Business')
          }}
          options={[
            { label: 'Pemasukan', value: 'income' },
            { label: 'Pengeluaran', value: 'expense' },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Deskripsi" error={errors.description?.message} className="sm:col-span-2">
            <Input placeholder="Contoh: Pembayaran invoice klien" {...register('description')} />
          </Field>
          <Field label="Nominal (Rp)" error={errors.amount?.message} hint={amount ? formatIDR(Number(amount)) : undefined}>
            <Input type="number" min="0" placeholder="0" {...register('amount')} />
          </Field>
          <Field label="Tanggal" error={errors.date?.message}>
            <Input type="date" {...register('date')} />
          </Field>
          <Field label="Kategori" error={errors.category?.message}>
            <Select {...register('category')}>
              {categories[type].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Akun / sumber dana">
            <Select {...register('account')}>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
              <option value="Marketplace">Marketplace</option>
            </Select>
          </Field>
          <Field label="Berulang">
            <Select {...register('recurring')}>
              <option value="none">Tidak berulang</option>
              <option value="monthly">Bulanan</option>
              <option value="weekly">Mingguan</option>
            </Select>
          </Field>
          <Field label="Sumber (opsional)" className="sm:col-span-2">
            <Input placeholder="Contoh: Shopee, klien, bank" {...register('source')} />
          </Field>
          <Field label="Catatan (opsional)" className="sm:col-span-2">
            <Textarea rows={2} placeholder="Detail tambahan…" {...register('note')} />
          </Field>
        </div>
        <p className="text-[10px] leading-relaxed text-text-muted">
          Transaksi langsung tersimpan di store demo. Pemasukan dan pengeluaran pada akun berbeda
          tidak digabung otomatis.
        </p>
      </form>
    </Dialog>
  )
}
