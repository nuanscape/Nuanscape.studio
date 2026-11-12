import * as React from 'react'
import { useForm } from 'react-hook-form'
import { formResolver } from '@/lib/form'
import { z } from 'zod'
import type { Goal } from '@/types'
import { useFinanceStore } from '@/stores/finance-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { dateOffset, formatIDR } from '@/lib/utils'

const goalSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  target: z.coerce.number().positive('Target harus lebih dari 0'),
  saved: z.coerce.number().min(0, 'Tidak boleh negatif'),
  deadline: z.string().min(1),
})

const contributionSchema = z.object({
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
})

type GoalValues = z.infer<typeof goalSchema>
type ContributionValues = z.infer<typeof contributionSchema>

const colors = ['#F5D64B', '#6DBBFF', '#FFD166', '#FFE9A3', '#FF9E7D', '#7C8CF8']

export function GoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addGoal } = useFinanceStore()
  const { push } = useToastStore()
  const [color, setColor] = React.useState(colors[0])
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GoalValues>({
    resolver: formResolver(goalSchema),
    defaultValues: { name: '', target: undefined as unknown as number, saved: 0, deadline: dateOffset(180) },
  })

  React.useEffect(() => {
    if (open) reset({ name: '', target: undefined as unknown as number, saved: 0, deadline: dateOffset(180) })
  }, [open, reset])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buat goal baru"
      description="Tentukan target dan deadline. AI akan menghitung kebutuhan setoran bulanan."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" form="goal-form">Buat goal</Button>
        </>
      }
    >
      <form
        id="goal-form"
        onSubmit={handleSubmit((values) => {
          addGoal({ ...values, color })
          push({ title: 'Goal dibuat', description: values.name, tone: 'success' })
          onClose()
        })}
        className="space-y-4"
      >
        <Field label="Nama goal" error={errors.name?.message}>
          <Input placeholder="Contoh: Dana darurat 6 bulan" {...register('name')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Target (Rp)" error={errors.target?.message}>
            <Input type="number" min="0" placeholder="0" {...register('target')} />
          </Field>
          <Field label="Sudah terkumpul (Rp)" error={errors.saved?.message}>
            <Input type="number" min="0" placeholder="0" {...register('saved')} />
          </Field>
        </div>
        <Field label="Deadline" error={errors.deadline?.message}>
          <Input type="date" {...register('deadline')} />
        </Field>
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-text-secondary">Warna</p>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Warna ${c}`}
                className="size-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: color === c ? '#F2F7F8' : 'transparent' }}
              />
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  )
}

export function ContributeModal({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { contributeGoal } = useFinanceStore()
  const { push } = useToastStore()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContributionValues>({
    resolver: formResolver(contributionSchema),
    defaultValues: { amount: undefined as unknown as number },
  })

  React.useEffect(() => {
    if (goal) reset({ amount: undefined as unknown as number })
  }, [goal, reset])

  return (
    <Dialog
      open={Boolean(goal)}
      onClose={onClose}
      title="Tambah setoran"
      description={goal ? `${goal.name} · ${formatIDR(goal.saved)} dari ${formatIDR(goal.target)}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" form="contribution-form">Simpan setoran</Button>
        </>
      }
    >
      <form
        id="contribution-form"
        onSubmit={handleSubmit((values) => {
          if (goal) contributeGoal(goal.id, values.amount)
          push({ title: 'Setoran dicatat', description: goal ? `${formatIDR(values.amount)} ke ${goal.name}` : undefined, tone: 'success' })
          onClose()
        })}
        className="space-y-4"
      >
        <Field label="Nominal setoran (Rp)" error={errors.amount?.message}>
          <Input type="number" min="0" placeholder="0" {...register('amount')} />
        </Field>
        <p className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
          Setoran tidak otomatis membuat transaksi pengeluaran. Catat juga di halaman transaksi jika
          uang benar-benar berpindah.
        </p>
      </form>
    </Dialog>
  )
}
