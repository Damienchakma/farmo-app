import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FieldPattern, Wordmark } from '@/components/brand/brand'
import { HandRule } from '@/components/ui/surfaces'

/** Two-column editorial frame: field notes on the left, the form on the right. */
export function AuthLayout({
  children,
  aside,
  footer,
}: {
  children: ReactNode
  aside?: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-paper-sunken px-10 py-9 lg:flex xl:px-14">
        <FieldPattern opacity={0.55} />
        <div className="relative">
          <Wordmark size={30} showTagline />
        </div>

        <div className="relative max-w-[46ch]">
          <p className="eyebrow">Field note · Cedar Valley, 12 November</p>
          <p className="mt-3 font-display text-[28px] leading-[1.25] text-ink">
            “The soil test said the field was fine. The water table said otherwise.”
          </p>
          <HandRule className="my-5" />
          <p className="text-sm leading-relaxed text-ink-2">
            Farmo reads the property record — soil reaction, moisture, nutrient balance, the crop in the ground and what
            grew there last season — and writes the advice and the risk register an agronomist would write, with the
            numbers behind every line.
          </p>
          {aside}
        </div>

        <dl className="relative grid max-w-[520px] grid-cols-3 gap-x-6 gap-y-4 border-t border-line-strong pt-5">
          <div>
            <dt className="eyebrow">Crops modelled</dt>
            <dd className="tnum mt-1 font-display text-xl text-ink">8</dd>
          </div>
          <div>
            <dt className="eyebrow">Districts</dt>
            <dd className="tnum mt-1 font-display text-xl text-ink">9</dd>
          </div>
          <div>
            <dt className="eyebrow">Advice sections</dt>
            <dd className="tnum mt-1 font-display text-xl text-ink">6</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col bg-paper">
        <header className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden">
          <Wordmark size={24} />
          <Link to="/login" className="text-xs font-medium text-ink-3 hover:text-ink">
            Sign in
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        {footer && <footer className="border-t border-line px-5 py-4 text-xs text-ink-3 sm:px-8">{footer}</footer>}
      </div>
    </div>
  )
}

export function AuthHeading({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[26px] leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{description}</p>
    </div>
  )
}

export function DemoCredentials() {
  return (
    <div className="mt-5 rounded-sm border border-dashed border-line-strong bg-paper-sunken px-3 py-2.5">
      <p className="eyebrow">Demo sign-in</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
        Use any seeded address with the password <span className="font-mono font-semibold text-ink">farmo1234</span>.
        Try <span className="font-mono text-ink">sam.carter@farmo.dev</span> (owner) or{' '}
        <span className="font-mono text-ink">marcus.reed@farmo.dev</span> (has a pending invitation).
      </p>
    </div>
  )
}
