import { Mail, ShieldCheck, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Segmented } from '@/components/ui/controls'
import { InlineAlert } from '@/components/ui/feedback'
import { OtpInput } from '@/components/ui/OtpInput'
import { ApiError } from '@/mock/api'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'
import { AuthHeading, AuthLayout } from './AuthLayout'

interface VerifyState {
  email?: string
  code?: string
}

export function VerifyRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, requestOtp, verifyOtp } = useSession()
  const state = (location.state ?? {}) as VerifyState

  const email = state.email ?? user?.email ?? ''
  const [channel, setChannel] = useState<'verify-email' | 'verify-phone'>('verify-email')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resentAt, setResentAt] = useState<number | null>(state.code ? Date.now() : null)
  const [cooldown, setCooldown] = useState(state.code ? 30 : 0)
  const shownCode = useRef<string | null>(state.code ?? null)

  // Cooldown timer for the resend link.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(id)
  }, [cooldown])

  // The first code is already in hand from signup: show it once as a dev aid.
  useEffect(() => {
    if (state.code) {
      toast({
        tone: 'code',
        title: 'Verification code',
        body: `Six digits for ${email}. Shown here because there is no mail server in the demo.`,
        code: state.code,
        ttl: 20000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (value: string) => {
    setError(null)
    if (value.length !== 6) {
      setError('Enter all six digits.')
      return
    }
    setSubmitting(true)
    try {
      const updated = await verifyOtp(email, value, channel)
      toast({
        tone: 'success',
        title: channel === 'verify-email' ? 'Email verified' : 'Mobile number verified',
        body:
          channel === 'verify-email'
            ? `${updated.email} is confirmed.`
            : channel === 'verify-phone'
              ? `${updated.phone} is confirmed for field alerts.`
              : '',
      })
      navigate('/projects', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code could not be verified.')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setError(null)
    try {
      const next = await requestOtp(email, channel)
      shownCode.current = next
      setResentAt(Date.now())
      setCooldown(30)
      toast({
        tone: 'code',
        title: channel === 'verify-email' ? 'New email code' : 'New SMS code',
        body: `Sent to ${channel === 'verify-email' ? email : (user?.phone ?? 'your mobile number')}.`,
        code: next,
        ttl: 20000,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a new code.')
    }
  }

  const destination = channel === 'verify-email' ? email : (user?.phone ?? 'your mobile number')

  return (
    <AuthLayout footer={<span>Codes expire after 24 hours. Nothing leaves this browser in the demo.</span>}>
      <AuthHeading
        title="Confirm it is you"
        description={
          <>
            We sent a six-digit code to <span className="font-medium text-ink">{destination}</span>. Enter it below.
            {channel === 'verify-phone' && ' Mobile verification also unlocks SMS outbreak alerts.'}
          </>
        }
      />

      <Segmented
        label="Verification channel"
        value={channel}
        onChange={(value) => {
          setChannel(value)
          setCode('')
          setError(null)
        }}
        options={[
          { value: 'verify-email', label: 'Email code' },
          { value: 'verify-phone', label: 'Mobile code' },
        ]}
        size="md"
      />

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-ink-3">
          {channel === 'verify-email' ? <Mail size={13} aria-hidden /> : <Smartphone size={13} aria-hidden />}
          {channel === 'verify-email' ? 'Sent to the address on your account' : 'Sent by SMS to the number on your account'}
        </div>

        <OtpInput
          label="Six digit verification code"
          value={code}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
          invalid={Boolean(error)}
          disabled={submitting}
        />

        {error && (
          <div className="mt-3">
            <InlineAlert tone="danger" title="That code did not work">
              {error}
            </InlineAlert>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="primary" loading={submitting} onClick={() => void submit(code)} disabled={code.length !== 6}>
            <ShieldCheck size={15} aria-hidden />
            Verify and continue
          </Button>
          <button
            type="button"
            className="link text-xs disabled:no-underline disabled:opacity-60"
            disabled={cooldown > 0}
            onClick={() => void resend()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Send a new code'}
          </button>
        </div>

        {resentAt && (
          <p className="mt-4 text-xs text-ink-3">
            The most recent code is still shown in the notification at the bottom of the screen.
          </p>
        )}

        <div className="mt-6 border-t border-line pt-4">
          <p className="text-sm text-ink-2">
            Wrong address?{' '}
            <Link to="/account" className="link">
              Change it in account settings
            </Link>{' '}
            or{' '}
            <button type="button" className="link" onClick={() => navigate('/projects')}>
              continue without verifying
            </button>
            .
          </p>
        </div>
      </div>

    </AuthLayout>
  )
}
