import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useContentStore } from '@/stores/content-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import type { ContentFormat, Platform } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Nama file minimal 2 karakter'),
  type: z.enum(['Video', 'Image', 'Thumbnail', 'Script', 'Caption']),
  platform: z.enum(['YouTube', 'TikTok', 'Instagram']),
  size: z.string().min(1, 'Ukuran wajib diisi'),
})

type Values = z.infer<typeof schema>

export function AssetModal({
  open,
  onClose,
  format = 'short',
}: {
  open: boolean
  onClose: () => void
  format?: ContentFormat
}) {
  const { addAsset } = useContentStore()
  const { push } = useToastStore()
  const platforms: Platform[] = format === 'long' ? ['YouTube'] : ['TikTok', 'Instagram']
  const defaultPlatform = platforms[0]
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'Video', platform: defaultPlatform, size: '' },
  })

  React.useEffect(() => {
    if (open) reset({ name: '', type: 'Video', platform: defaultPlatform, size: '' })
  }, [open, reset, defaultPlatform])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={format === 'long' ? 'Tambah aset long-form' : 'Tambah aset short-form'}
      description={
        format === 'long'
          ? 'Daftarkan master video, thumbnail, atau naskah episode. Demo ini tidak mengunggah file sungguhan.'
          : 'Daftarkan klip vertikal, caption, atau hook untuk batch. Demo ini tidak mengunggah file sungguhan.'
      }
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" form="asset-form">Tambah aset</Button>
        </>
      }
    >
      <form
        id="asset-form"
        onSubmit={handleSubmit((values) => {
          addAsset({ ...values, createdAt: new Date().toISOString() })
          push({ title: 'Aset ditambahkan', description: values.name, tone: 'success' })
          onClose()
        })}
        className="space-y-4"
      >
        <Field label="Nama file" error={errors.name?.message}>
          <Input
            placeholder={format === 'long' ? 'episode-final-master.mp4' : 'hook-vertikal-cut.mp4'}
            {...register('name')}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipe">
            <Select {...register('type')}>
              <option value="Video">Video</option>
              <option value="Image">Image</option>
              <option value="Thumbnail">Thumbnail</option>
              <option value="Script">Script</option>
              <option value="Caption">Caption</option>
            </Select>
          </Field>
          <Field label="Ukuran" error={errors.size?.message}>
            <Input placeholder="48 MB" {...register('size')} />
          </Field>
          <Field label="Platform" className="sm:col-span-2">
            <Select {...register('platform')}>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
          Hanya metadata yang disimpan di browser. Tidak ada file yang benar-benar diunggah.
        </p>
      </form>
    </Dialog>
  )
}
