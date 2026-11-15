import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Loader2 } from 'lucide-react'
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

/* -------------------------------------------------------------------------- */
/*  Button                                                                    */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'outline' | 'quiet' | 'danger' | 'danger-solid' | 'accent'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  /** Icon-only buttons must carry an accessible name. */
  'aria-label'?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', icon, iconRight, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      className={cn(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        !children && 'btn-icon',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </button>
  )
})

/* -------------------------------------------------------------------------- */
/*  Form controls                                                             */
/* -------------------------------------------------------------------------- */

export interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  className?: string
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('min-w-0', className)}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="text-clay-600" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} className={cn('input', className)} aria-invalid={invalid ?? rest['aria-invalid']} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn('textarea', className)} {...rest} />
})

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] }>(
  function Select({ className, options, ...rest }, ref) {
    return (
      <select ref={ref} className={cn('select', className)} {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    )
  },
)

export interface SwitchFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function SwitchField({ checked, onCheckedChange, label, description, disabled }: SwitchFieldProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      </div>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative mt-0.5 h-[20px] w-[34px] flex-none rounded-full border transition-colors duration-100',
          checked ? 'border-green-700 bg-green-600' : 'border-line-strong bg-paper-deep',
          disabled && 'opacity-50',
        )}
      >
        <SwitchPrimitive.Thumb className="block h-[14px] w-[14px] translate-x-[3px] rounded-full bg-paper-raised transition-transform duration-150 data-[state=checked]:translate-x-[17px]" />
      </SwitchPrimitive.Root>
    </div>
  )
}

export interface CheckboxFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  description?: string
  disabled?: boolean
}

export function CheckboxField({ checked, onCheckedChange, label, description, disabled }: CheckboxFieldProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-2.5">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className={cn(
          'mt-[3px] grid h-[16px] w-[16px] flex-none place-items-center rounded-sm border transition-colors duration-100',
          checked ? 'border-green-700 bg-green-600 text-paper-raised' : 'border-line-strong bg-paper-raised',
          disabled && 'opacity-50',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check size={11} strokeWidth={3} aria-hidden />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Segmented control (keyboard-navigable, used for chart ranges)             */
/* -------------------------------------------------------------------------- */

export interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  label: string
  size?: 'sm' | 'md'
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'sm' }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex overflow-hidden rounded-sm border border-line-strong bg-paper-raised"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'border-r border-line px-2.5 font-medium transition-colors duration-100 last:border-r-0',
              size === 'sm' ? 'h-[26px] text-xs' : 'h-[30px] text-sm',
              active ? 'bg-green-100 text-green-700' : 'text-ink-3 hover:bg-paper-sunken hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
