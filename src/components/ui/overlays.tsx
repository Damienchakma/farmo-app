import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './controls'

/* -------------------------------------------------------------------- Sheet */

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

/** Floating layer — the one place a shadow is allowed. */
export function Dialog({ open, onOpenChange, title, description, children, footer, width = 'md' }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-soil-800/35 backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[71] max-h-[90vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm border border-line-strong bg-paper-raised shadow-[var(--shadow-pop)]',
            width === 'sm' && 'sm:w-[400px]',
            width === 'md' && 'sm:w-[520px]',
            width === 'lg' && 'sm:w-[680px]',
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-lg text-ink">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs leading-relaxed text-ink-2">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="-mr-1 grid h-7 w-7 flex-none place-items-center rounded-sm text-ink-3 hover:bg-paper-sunken hover:text-ink"
                aria-label="Close dialog"
              >
                <X size={15} aria-hidden />
              </button>
            </DialogPrimitive.Close>
          </header>
          <div className="px-4 py-4">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-paper-sunken px-4 py-3">{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  tone?: 'danger' | 'primary'
  loading?: boolean
  /** Require the user to type this exact text to unlock the confirm button. */
  typeToConfirm?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = 'primary',
  loading,
  typeToConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (!open) setTyped('')
  }, [open])
  const unlocked = !typeToConfirm || typed.trim() === typeToConfirm

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      width="sm"
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger-solid' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            disabled={!unlocked}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeToConfirm && (
        <div className="text-sm text-ink-2">
          <p className="mb-2">
            Type <span className="font-mono font-semibold text-ink">{typeToConfirm}</span> to confirm.
          </p>
          <input
            className="input font-mono"
            value={typed}
            autoFocus
            aria-label={`Type ${typeToConfirm} to confirm`}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
    </Dialog>
  )
}

/* ----------------------------------------------------------------- Dropdown */

export const Dropdown = DropdownPrimitive.Root
export const DropdownTrigger = DropdownPrimitive.Trigger

export function DropdownContent({
  children,
  align = 'end',
  className,
  sideOffset = 6,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
  sideOffset?: number
}) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-[72] min-w-[190px] overflow-hidden rounded-sm border border-line-strong bg-paper-raised py-1 shadow-[var(--shadow-pop)]',
          'data-[state=open]:fade-up',
          className,
        )}
      >
        {children}
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  )
}

export function DropdownItem({
  children,
  onSelect,
  icon,
  danger,
  disabled,
  className,
}: {
  children: ReactNode
  onSelect?: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <DropdownPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 px-2.5 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-paper-sunken',
        danger ? 'text-clay-700 data-[highlighted]:bg-clay-50' : 'text-ink-2 data-[highlighted]:text-ink',
        disabled && 'pointer-events-none opacity-45',
        className,
      )}
    >
      {icon && <span className="flex-none text-ink-3 [&>svg]:h-[14px] [&>svg]:w-[14px]">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </DropdownPrimitive.Item>
  )
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <DropdownPrimitive.Label className="eyebrow px-2.5 pb-1 pt-2">{children}</DropdownPrimitive.Label>
}

export function DropdownSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-line" />
}

/* ------------------------------------------------------------------ Popover */

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger

export function PopoverContent({
  children,
  className,
  align = 'end',
  sideOffset = 8,
  width = 340,
}: {
  children: ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  width?: number | string
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        style={{ width }}
        className={cn(
          'z-[72] max-h-[70vh] overflow-y-auto rounded-sm border border-line-strong bg-paper-raised shadow-[var(--shadow-pop)] data-[state=open]:fade-up',
          className,
        )}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

/* ------------------------------------------------------------------ Tooltip */

export const TooltipProvider = TooltipPrimitive.Provider

export function Tip({
  children,
  content,
  side = 'top',
}: {
  children: ReactNode
  content: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root delayDuration={220}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[73] max-w-[280px] rounded-sm border border-line-strong bg-ink px-2 py-1.5 text-xs leading-relaxed text-paper-raised shadow-[var(--shadow-pop)]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
