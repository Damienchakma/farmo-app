import { Check, Lock } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ProviderMark } from '@/components/brand/brand'
import { Button, Input } from '@/components/ui/controls'
import { InlineAlert } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'

type Provider = 'google' | 'facebook' | 'yahoo'

const PROVIDER_COPY: Record<Provider, { name: string; host: string; accent: string }> = {
  google: { name: 'Google', host: 'accounts.google.com', accent: '#4285F4' },
  facebook: { name: 'Facebook', host: 'facebook.com', accent: '#1877F2' },
  yahoo: { name: 'Yahoo', host: 'login.yahoo.com', accent: '#6001D2' },
}

const SCOPES = [
  { title: 'Name and profile photograph', detail: 'Used on your Farmo account and in team lists.' },
  { title: 'Email address', detail: 'Used to sign you in and to send farm invitations.' },
  { title: 'Language preference', detail: 'Used to choose the language of advice and alerts.' },
]

const SUGGESTED: Array<{ provider: Provider; email: string; name: string }> = [
  { provider: 'google', email: 'sam.carter@farmo.dev', name: 'Sam Carter' },
  { provider: 'facebook', email: 'marcus.reed@farmo.dev', name: 'Marcus Reed' },
  { provider: 'yahoo', email: 'dana.whitfield@farmo.dev', name: 'Dana Whitfield' },
]

/**
 * Mocked provider consent screen. It deliberately looks like the provider's
 * page, not like Farmo, because that is what the user actually sees — and it
 * makes clear that Farmo only receives name, email and language.
 */
export function OAuthConsentRoute() {
  const { provider: providerParam } = useParams<{ provider: string }>()
  const provider = (providerParam ?? '') as Provider
  const navigate = useNavigate()
  const oauthSignIn = useSession((s) => s.oauthSignIn)
  const [useOther, setUseOther] = useState(false)
  const [otherEmail, setOtherEmail] = useState('')
  const [otherName, setOtherName] = useState('')
  const [selected, setSelected] = useState<string>(SUGGESTED.find((s) => s.provider === provider)?.email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!['google', 'facebook', 'yahoo'].includes(provider)) return <Navigate to="/login" replace />

  const copy = PROVIDER_COPY[provider]
  const accounts = SUGGESTED.filter((s) => s.provider === provider)
  const email = useOther ? otherEmail.trim() : selected
  const name = useOther ? otherName.trim() : (accounts.find((a) => a.email === selected)?.name ?? email)

  const allow = async () => {
    setError(null)
    if (!useOther && !selected) {
      setError('Choose an account to continue.')
      return
    }
    if (useOther && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Enter a valid email address for the account you want to use.')
      return
    }
    setBusy(true)
    try {
      const user = await oauthSignIn(provider, email, name)
      toast({
        tone: 'success',
        title: `Signed in with ${copy.name}`,
        body: `${user.email} · Farmo received your name and email only.`,
      })
      navigate('/projects', { replace: true })
    } catch {
      setError('The provider did not complete the sign-in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#f1f3f4] px-4 py-8 sm:py-12">
      <div className="w-full max-w-[448px] rounded-sm border border-[#dadce0] bg-white px-5 py-7 sm:px-9 sm:py-9">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <ProviderMark provider={provider} size={20} />
            <span className="text-[15px] font-medium text-[#202124]">{copy.name}</span>
          </span>
          <span className="font-mono text-[11px] text-[#5f6368]">{copy.host}</span>
        </div>

        <h1 className="mt-7 text-[22px] leading-snug text-[#202124]">Farmo wants access to your {copy.name} Account</h1>
        <p className="mt-1.5 text-sm text-[#5f6368]">
          You are signing in to <span className="font-medium text-[#202124]">Farmo</span>, which will receive:
        </p>

        <ul className="mt-5 space-y-3">
          {SCOPES.map((scope) => (
            <li key={scope.title} className="flex items-start gap-3">
              <span className="mt-[3px] grid h-[19px] w-[19px] flex-none place-items-center rounded-full border border-[#dadce0]">
                <Check size={12} color={copy.accent} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] text-[#202124]">{scope.title}</span>
                <span className="block text-[12px] text-[#5f6368]">{scope.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-[#dadce0] pt-5">
          {error && (
            <div className="mb-4">
              <InlineAlert tone="danger">{error}</InlineAlert>
            </div>
          )}

          {!useOther ? (
            <>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#5f6368]">Choose an account</p>
              <ul className="space-y-1.5">
                {accounts.map((account) => {
                  const active = selected === account.email
                  return (
                    <li key={account.email}>
                      <button
                        type="button"
                        onClick={() => setSelected(account.email)}
                        aria-pressed={active}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-sm border px-3 py-2.5 text-left',
                          active ? 'border-[#4285F4] bg-[#e8f0fe]' : 'border-[#dadce0] hover:bg-[#f8f9fa]',
                        )}
                      >
                        <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[#e8eaed] text-[11px] font-semibold text-[#5f6368]">
                          {account.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] text-[#202124]">{account.name}</span>
                          <span className="block truncate text-[12px] text-[#5f6368]">{account.email}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button type="button" className="mt-3 text-[13px] font-medium text-[#1a73e8]" onClick={() => setUseOther(true)}>
                Use another account
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <label className="block text-[13px] text-[#5f6368]">
                Email
                <Input
                  value={otherEmail}
                  onChange={(event) => setOtherEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 border-[#dadce0] bg-white text-[14px] text-[#202124]"
                  autoFocus
                />
              </label>
              <label className="block text-[13px] text-[#5f6368]">
                Name on the account
                <Input
                  value={otherName}
                  onChange={(event) => setOtherName(event.target.value)}
                  placeholder="Full name"
                  className="mt-1 border-[#dadce0] bg-white text-[14px] text-[#202124]"
                />
              </label>
              <button type="button" className="text-[13px] font-medium text-[#1a73e8]" onClick={() => setUseOther(false)}>
                Back to suggested accounts
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-[#5f6368]">
          Farmo’s use of information received from {copy.name} will adhere to the {copy.name} API Services User Data
          Policy, including the Limited Use requirements.
        </p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="quiet" onClick={() => navigate('/login')}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={() => void allow()}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-sm bg-[#1a73e8] px-4 text-[14px] font-medium text-white hover:bg-[#1765cc] disabled:opacity-60"
          >
            {busy ? 'Connecting…' : 'Allow'}
          </button>
        </div>
      </div>

      <p className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-[#5f6368]">
        <Lock size={12} aria-hidden />
        Mock consent screen for the Farmo demo — no {copy.name} account is contacted.
      </p>
    </div>
  )
}
