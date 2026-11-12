import * as React from 'react'
import { useForm } from 'react-hook-form'
import { formResolver } from '@/lib/form'
import { z } from 'zod'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import type { ContentFormat, Platform } from '@/types'

const schema = z.object({
  title: z.string().min(4, 'Judul minimal 4 karakter'),
  hook: z.string().min(6, 'Hook minimal 6 karakter'),
  platform: z.enum(['YouTube', 'TikTok', 'Instagram']),
  niche: z.string().min(2, 'Niche minimal 2 karakter'),
  angle: z.string().min(3, 'Sudut pandang wajib diisi'),
  format: z.string().min(2),
  score: z.coerce.number().min(0).max(100),
})

type Values = z.infer<typeof schema>

const longFormats = ['Long-form', 'Documentary', 'Tutorial bertahap', 'Lofi session']
const shortFormats = ['Short-form tutorial', 'Reels', 'Carousel', 'POV', 'Before-after']

export function IdeaModal({
  open,
  onClose,
  format = 'short',
}: {
  open: boolean
  onClose: () => void
  format?: ContentFormat
}) {
  const platforms: Platform[] = format === 'long' ? ['YouTube'] : ['TikTok', 'Instagram']
  const formatOptions = format === 'long' ? longFormats : shortFormats
  const defaultPlatform = platforms[0]
  const defaultFormat = formatOptions[0]
  const { addIdea } = useContentStore()
  const { push } = useToastStore()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: formResolver(schema),
    defaultValues: {
      title: '',
      hook: '',
      platform: defaultPlatform,
      niche: 'Agentic AI',
      angle: 'Demo + hasil nyata',
      format: defaultFormat,
      score: 82,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        title: '',
        hook: '',
        platform: defaultPlatform,
        niche: 'Agentic AI',
        angle: 'Demo + hasil nyata',
        format: defaultFormat,
        score: 82,
      })
    }
  }, [open, reset, defaultPlatform, defaultFormat])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={format === 'long' ? 'Tambah ide long-form' : 'Tambah ide short-form'}
      description={
        format === 'long'
          ? 'Simpan ide episode dengan sudut pandang jelas agar mudah disusun jadi naskah panjang.'
          : 'Simpan ide dengan hook cepat agar mudah diproduksi dalam satu sesi batch.'
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" form="idea-form">Simpan ide</Button>
        </>
      }
    >
      <form
        id="idea-form"
        onSubmit={handleSubmit((values) => {
          addIdea(values)
          push({ title: 'Ide ditambahkan', description: values.title, tone: 'success' })
          onClose()
        })}
        className="space-y-4"
      >
        <Field label="Judul ide" error={errors.title?.message}>
          <Input placeholder="Contoh: 3 cara AI hemat 10 jam/minggu" {...register('title')} />
        </Field>
        <Field label="Hook pembuka" error={errors.hook?.message}>
          <Textarea rows={2} placeholder="Kalimat pertama yang menghentikan scroll…" {...register('hook')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Platform">
            <Select {...register('platform')}>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </Select>
          </Field>
          <Field label="Niche" error={errors.niche?.message}>
            <Input placeholder="Agentic AI" {...register('niche')} />
          </Field>
          <Field label="Sudut pandang" error={errors.angle?.message}>
            <Input placeholder="Demo + hasil nyata" {...register('angle')} />
          </Field>
          <Field label="Format">
            <Select {...register('format')}>
              {formatOptions.map((entry) => (
                <option key={entry} value={entry}>{entry}</option>
              ))}
            </Select>
          </Field>
          <Field label="Skor perkiraan" hint="0-100, penilaian awal" className="sm:col-span-2">
            <Input type="number" min="0" max="100" {...register('score')} />
          </Field>
        </div>
      </form>
    </Dialog>
  )
}
