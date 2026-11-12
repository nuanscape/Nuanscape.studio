import * as React from 'react'
import { useForm } from 'react-hook-form'
import { formResolver } from '@/lib/form'
import { z } from 'zod'
import { useFinanceStore } from '@/stores/finance-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { dateOffset, formatIDR } from '@/lib/utils'

const assetSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  type: z.enum(['Cash', 'Bank', 'Investment', 'Business', 'Inventory']),
  value: z.coerce.number().positive('Nilai harus lebih dari 0'),
  note: z.string().optional(),
})

const liabilitySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  type: z.enum(['Debt', 'Obligation']),
  value: z.coerce.number().positive('Nilai harus lebih dari 0'),
  dueDate: z.string().min(1),
})

type AssetValues = z.infer<typeof assetSchema>
type LiabilityValues = z.infer<typeof liabilitySchema>

export function AssetModal({
  open,
  onClose,
  mode = 'asset',
}: {
  open: boolean
  onClose: () => void
  mode?: 'asset' | 'liability'
}) {
  const { addAsset, addLiability } = useFinanceStore()
  const { push } = useToastStore()

  const assetForm = useForm<AssetValues>({
    resolver: formResolver(assetSchema),
    defaultValues: { type: 'Bank', note: '', name: '', value: undefined as unknown as number },
  })
  const liabilityForm = useForm<LiabilityValues>({
    resolver: formResolver(liabilitySchema),
    defaultValues: { type: 'Debt', dueDate: dateOffset(30), name: '', value: undefined as unknown as number },
  })

  React.useEffect(() => {
    if (open && mode === 'asset') {
      assetForm.reset({ type: 'Bank', note: '', name: '', value: undefined as unknown as number })
    }
    if (open && mode === 'liability') {
      liabilityForm.reset({ type: 'Debt', dueDate: dateOffset(30), name: '', value: undefined as unknown as number })
    }
  }, [open, mode, assetForm, liabilityForm])

  const isAsset = mode === 'asset'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isAsset ? 'Tambah aset' : 'Tambah liabilitas'}
      description={isAsset ? 'Catat aset agar net worth dan alokasi akurat.' : 'Catat kewajiban agar rasio utang terukur.'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form={isAsset ? 'asset-form' : 'liability-form'}>
            Simpan
          </Button>
        </>
      }
    >
      {isAsset ? (
        <form
          id="asset-form"
          onSubmit={assetForm.handleSubmit((values) => {
            addAsset(values)
            push({ title: 'Aset ditambahkan', description: `${values.name} · ${formatIDR(values.value)}`, tone: 'success' })
            onClose()
          })}
          className="space-y-4"
        >
          <Field label="Nama aset" error={assetForm.formState.errors.name?.message}>
            <Input placeholder="Contoh: Rekening BCA" {...assetForm.register('name')} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipe">
              <Select {...assetForm.register('type')}>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="Investment">Investment</option>
                <option value="Business">Business</option>
                <option value="Inventory">Inventory</option>
              </Select>
            </Field>
            <Field label="Nilai (Rp)" error={assetForm.formState.errors.value?.message}>
              <Input type="number" min="0" placeholder="0" {...assetForm.register('value')} />
            </Field>
          </div>
          <Field label="Catatan (opsional)">
            <Input placeholder="Detail singkat" {...assetForm.register('note')} />
          </Field>
        </form>
      ) : (
        <form
          id="liability-form"
          onSubmit={liabilityForm.handleSubmit((values) => {
            addLiability(values)
            push({ title: 'Liabilitas ditambahkan', description: `${values.name} · ${formatIDR(values.value)}`, tone: 'success' })
            onClose()
          })}
          className="space-y-4"
        >
          <Field label="Nama liabilitas" error={liabilityForm.formState.errors.name?.message}>
            <Input placeholder="Contoh: Pinjaman modal" {...liabilityForm.register('name')} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipe">
              <Select {...liabilityForm.register('type')}>
                <option value="Debt">Debt</option>
                <option value="Obligation">Obligation</option>
              </Select>
            </Field>
            <Field label="Nilai (Rp)" error={liabilityForm.formState.errors.value?.message}>
              <Input type="number" min="0" placeholder="0" {...liabilityForm.register('value')} />
            </Field>
          </div>
          <Field label="Jatuh tempo">
            <Input type="date" {...liabilityForm.register('dueDate')} />
          </Field>
        </form>
      )}
    </Dialog>
  )
}
