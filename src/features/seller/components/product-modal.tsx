import * as React from 'react'
import { useForm } from 'react-hook-form'
import { formResolver } from '@/lib/form'
import { z } from 'zod'
import type { Product } from '@/types'
import { useSellerStore } from '@/stores/seller-store'
import { useToastStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'

const schema = z.object({
  sku: z.string().min(2, 'SKU minimal 2 karakter'),
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  category: z.string().min(1),
  price: z.coerce.number().positive('Harga harus lebih dari 0'),
  cost: z.coerce.number().positive('HPP harus lebih dari 0'),
  stock: z.coerce.number().min(0, 'Stok tidak boleh negatif'),
  minStock: z.coerce.number().min(0),
  marketplace: z.enum(['TikTok Shop', 'Shopee', 'Both']),
  status: z.enum(['Active', 'Paused', 'Out of Stock']),
  seoScore: z.coerce.number().min(0).max(100),
  geoScore: z.coerce.number().min(0).max(100),
})

type Values = z.infer<typeof schema>

const categories = ['Lighting', 'Workspace', 'Electronics', 'Accessories', 'Lifestyle', 'Audio']

export function ProductModal({
  open,
  onClose,
  product,
}: {
  open: boolean
  onClose: () => void
  product?: Product
}) {
  const { addProduct, updateProduct } = useSellerStore()
  const { push } = useToastStore()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({
    resolver: formResolver(schema),
    defaultValues: {
      sku: '',
      name: '',
      category: 'Workspace',
      price: undefined as unknown as number,
      cost: undefined as unknown as number,
      stock: 0,
      minStock: 10,
      marketplace: 'Both',
      status: 'Active',
      seoScore: 75,
      geoScore: 70,
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        sku: product?.sku ?? '',
        name: product?.name ?? '',
        category: product?.category ?? 'Workspace',
        price: product?.price ?? (undefined as unknown as number),
        cost: product?.cost ?? (undefined as unknown as number),
        stock: product?.stock ?? 0,
        minStock: product?.minStock ?? 10,
        marketplace: product?.marketplace ?? 'Both',
        status: product?.status ?? 'Active',
        seoScore: product?.seoScore ?? 75,
        geoScore: product?.geoScore ?? 70,
      })
    }
  }, [open, product, reset])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? 'Edit produk' : 'Tambah produk'}
      description="Data produk dipakai untuk margin, stok, dan analisis SEO."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" form="product-form">{product ? 'Simpan perubahan' : 'Tambah produk'}</Button>
        </>
      }
    >
      <form
        id="product-form"
        onSubmit={handleSubmit((values) => {
          if (product) {
            updateProduct(product.id, values)
            push({ title: 'Produk diperbarui', description: values.name, tone: 'success' })
          } else {
            addProduct(values)
            push({ title: 'Produk ditambahkan', description: `${values.name} · ${values.sku}`, tone: 'success' })
          }
          onClose()
        })}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SKU" error={errors.sku?.message}>
            <Input placeholder="WK-LAMP-01" {...register('sku')} />
          </Field>
          <Field label="Nama produk" error={errors.name?.message}>
            <Input placeholder="Nama produk" {...register('name')} />
          </Field>
          <Field label="Kategori">
            <Select {...register('category')}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Marketplace">
            <Select {...register('marketplace')}>
              <option value="TikTok Shop">TikTok Shop</option>
              <option value="Shopee">Shopee</option>
              <option value="Both">Both</option>
            </Select>
          </Field>
          <Field label="Harga jual (Rp)" error={errors.price?.message}>
            <Input type="number" min="0" placeholder="0" {...register('price')} />
          </Field>
          <Field label="HPP (Rp)" error={errors.cost?.message}>
            <Input type="number" min="0" placeholder="0" {...register('cost')} />
          </Field>
          <Field label="Stok" error={errors.stock?.message}>
            <Input type="number" min="0" {...register('stock')} />
          </Field>
          <Field label="Minimum stok">
            <Input type="number" min="0" {...register('minStock')} />
          </Field>
          <Field label="Status">
            <Select {...register('status')}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Out of Stock">Out of Stock</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SEO score">
              <Input type="number" min="0" max="100" {...register('seoScore')} />
            </Field>
            <Field label="GEO score">
              <Input type="number" min="0" max="100" {...register('geoScore')} />
            </Field>
          </div>
        </div>
        <p className="rounded-lg border border-line bg-white/[0.02] p-2.5 text-[10px] leading-relaxed text-text-muted">
          Margin dihitung dari harga jual − HPP. Fee marketplace dan ads dihitung terpisah di
          halaman Finance.
        </p>
      </form>
    </Dialog>
  )
}
