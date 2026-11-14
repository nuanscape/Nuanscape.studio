import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'ring-focus h-10 w-full rounded-xl border border-white/[0.09] bg-[#0f0f0f] px-3.5 text-sm text-white placeholder:text-white/30 transition-colors hover:border-white/[0.18] focus:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'ring-focus min-h-[92px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#0f0f0f] px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-white/30 transition-colors hover:border-white/[0.18] focus:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

interface SelectOption {
  value: string
  label: string
  group?: string
  disabled?: boolean
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

function collectOptions(children: React.ReactNode, group?: string): SelectOption[] {
  const options: SelectOption[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return

    const props = child.props as {
      children?: React.ReactNode
      label?: string
      value?: string | number
      disabled?: boolean
    }

    if (child.type === 'optgroup') {
      options.push(...collectOptions(props.children, props.label ?? ''))
      return
    }

    if (child.type === 'option') {
      const label = nodeText(props.children)
      options.push({
        value: String(props.value ?? label),
        label,
        group,
        disabled: Boolean(props.disabled),
      })
      return
    }

    if (child.type === React.Fragment) {
      options.push(...collectOptions(props.children, group))
    }
  })

  return options
}

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, value, defaultValue, onChange, disabled, ...props }, ref) => {
  const options = collectOptions(children)
  const controlledValue = value !== undefined ? String(value) : undefined
  const initialValue =
    controlledValue ?? (defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? '')

  const [selected, setSelected] = React.useState(initialValue)
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({})
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const selectRef = React.useRef<HTMLSelectElement | null>(null)
  const listboxId = React.useId()

  React.useEffect(() => {
    if (controlledValue !== undefined) setSelected(controlledValue)
  }, [controlledValue])

  const setSelectRef = React.useCallback(
    (node: HTMLSelectElement | null) => {
      selectRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  const selectedOption = options.find((option) => option.value === selected)
  const selectedLabel = selectedOption?.label ?? options[0]?.label ?? ''

  const positionMenu = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24)
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12)
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const openUp = below < 220 && above > below

    setMenuStyle({
      left,
      width,
      maxHeight: Math.max(140, Math.min(320, openUp ? above : below)),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    })
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return

    positionMenu()
    const onScroll = () => positionMenu()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, positionMenu])

  React.useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openMenu = () => {
    if (disabled) return
    const index = options.findIndex((option) => option.value === selected)
    setHighlight(index >= 0 ? index : 0)
    setOpen(true)
  }

  const choose = (option: SelectOption) => {
    if (option.disabled) return

    const node = selectRef.current
    if (node) node.value = option.value
    const target = node ?? ({ value: option.value, name: props.name } as HTMLSelectElement)
    onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>)

    setSelected(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const moveHighlight = (direction: 1 | -1) => {
    if (!options.length) return
    let next = highlight
    for (let index = 0; index < options.length; index += 1) {
      next = (next + direction + options.length) % options.length
      if (!options[next]?.disabled) break
    }
    setHighlight(next)
  }

  return (
    <div className="relative">
      <select
        ref={setSelectRef}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        {...props}
      >
        {children}
      </select>

      <div
        onKeyDown={(event) => {
          if (disabled) return

          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) openMenu()
            else moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
            return
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (!open) {
              openMenu()
            } else {
              const option = options[highlight]
              if (option) choose(option)
            }
            return
          }

          if (event.key === 'Escape' && open) {
            event.preventDefault()
            setOpen(false)
          }
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={props['aria-label']}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className={cn(
            'ring-focus flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/[0.09] bg-[#0f0f0f] px-3.5 text-left text-sm text-white transition-colors hover:border-white/[0.18] focus-visible:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50',
            open && 'border-primary/45',
            className,
          )}
        >
          <span className={cn('truncate', !selectedLabel && 'text-white/30')}>{selectedLabel || 'Pilih'}</span>
          <svg
            className={cn('size-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              style={menuStyle}
              className="animate-fade-in fixed z-[120] overflow-y-auto rounded-xl border border-primary/25 bg-[#0b0b0b] p-1.5 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.95)]"
            >
              {options.map((option, index) => {
                const isSelected = option.value === selected
                const showGroup = option.group && options[index - 1]?.group !== option.group

                return (
                  <React.Fragment key={`${option.group ?? ''}:${option.value}:${index}`}>
                    {showGroup ? (
                      <div className="px-2.5 pb-1 pt-2 text-[9px] font-medium uppercase tracking-[0.14em] text-text-muted first:pt-1">
                        {option.group}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => choose(option)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-primary/12 text-primary'
                          : 'text-text-secondary hover:bg-white/[0.06] hover:text-text-primary',
                        !isSelected && highlight === index && 'bg-white/[0.05] text-text-primary',
                        option.disabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? (
                        <svg
                          className="size-3.5 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </button>
                  </React.Fragment>
                )
              })}
              {!options.length ? <p className="px-2.5 py-2 text-xs text-text-muted">Tidak ada pilihan</p> : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
})
Select.displayName = 'Select'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-1.5 block text-xs font-medium tracking-wide text-text-secondary', className)}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-0', className)}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'ring-focus relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-primary/40 bg-primary/25' : 'border-line bg-white/5',
      )}
    >
      <span
        className={cn(
          'absolute size-4 rounded-full transition-transform',
          checked ? 'translate-x-[22px] bg-primary' : 'translate-x-1 bg-text-muted',
        )}
      />
    </button>
  )
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'ring-focus grid size-4 place-items-center rounded border transition-colors',
        checked ? 'border-primary bg-primary text-[#0B0B0B]' : 'border-line bg-transparent',
        className,
      )}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m2.5 6 2.3 2.3L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  )
}
