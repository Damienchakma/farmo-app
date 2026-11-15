import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

export interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  label: string
  describedBy?: string
}

/**
 * Six separate digit boxes with paste support and full keyboard handling.
 * The group is one labelled control for assistive tech, not six mysteries.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  label,
  describedBy,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = value.padEnd(length, ' ').slice(0, length).split('')

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1)
    if (!char) {
      const next = value.split('')
      next[index] = ''
      commit(next.join(''))
      return
    }
    const next = value.padEnd(length, ' ').split('')
    next[index] = char
    const joined = commit(next.join('').replace(/ /g, ''))
    if (index < length - 1) refs.current[index + 1]?.focus()
    void joined
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const next = value.padEnd(length, ' ').split('')
      if (next[index] && next[index] !== ' ') {
        next[index] = ' '
        commit(next.join('').replace(/ /g, ' ').trimEnd().replace(/ /g, ''))
      } else if (index > 0) {
        next[index - 1] = ' '
        commit(next.join('').replace(/ /g, ''))
        refs.current[index - 1]?.focus()
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      refs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return
    const next = value.padEnd(length, ' ').split('')
    for (let i = 0; i < pasted.length && index + i < length; i += 1) next[index + i] = pasted[i]
    const joined = next.join('').replace(/ /g, '')
    onChange(joined.slice(0, length))
    if (joined.length >= length) onComplete?.(joined.slice(0, length))
    refs.current[Math.min(index + pasted.length, length - 1)]?.focus()
  }

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      className="flex items-center gap-2"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          value={digit.trim()}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          className={cn(
            'h-[52px] w-[42px] rounded-sm border bg-paper-raised text-center font-mono text-xl font-semibold text-ink tnum',
            invalid ? 'border-clay-500 bg-clay-50' : 'border-line-strong',
            'transition-colors duration-100 hover:border-soil-300 focus:border-green-600',
            disabled && 'opacity-60',
          )}
          maxLength={1}
        />
      ))}
    </div>
  )
}
