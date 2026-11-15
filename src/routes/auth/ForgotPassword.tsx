import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Field, Input } from '@/components/ui/controls'
import { InlineAlert } from '@/components/ui/feedback'
import { OtpInput } from '@/components/ui/OtpInput'
import { ApiError } from '@/mock/api'
import { backendEnabled } from '@/lib/backend'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'
import { AuthHeading, AuthLayout } from './AuthLayout'

const requestSchema = z.object({
  email: z.string().min(1, 'Enter the email address on your account.').email('That does not look like an email address.'),
})

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[0-9]/, 'Include at least one number.')
      .regex(/[a-zA-Z]/, 'Include at least one letter.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'The two passwords do not match.',
  })

type RequestValues = z.infer<typeof requestSchema>
type ResetValues = z.infer<typeof resetSchema>

export function ForgotPasswordRoute() {
  const { requestOtp, completeReset } = useSession()
  const navigate = useNavigate()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const requestForm = useForm<RequestValues>({ resolver: zodResolver(requestSchema), defaultValues: { email: '' } })
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const onRequest = async (values: RequestValues) => {
    setRequestError(null)
    try {
      const generated = await requestOtp(values.email, 'reset')
      setEmail(values.email)
      setStep('reset')
      setCode('')
      toast({
        tone: 'code',
        title: 'Password reset code',
        body: generated ? 'Development code only — no email was sent.' : 'If the account exists, a code will arrive by email. Check spam too.',
        code: generated,
        ttl: 20000,
      })
    } catch (error) {
      setRequestError(error instanceof ApiError ? error.message : 'Could not send a reset code.')
    }
  }

  const onReset = async (values: ResetValues) => {
    setCodeError(null)
    if (code.length !== 6) {
      setCodeError('Enter all six digits from the reset code.')
      return
    }
    setSubmitting(true)
    try {
      await completeReset(email, code, values.password)
      toast({ tone: 'success', title: 'Password updated', body: 'Sign in with your new password.' })
      navigate('/login', { replace: true })
    } catch (error) {
      setCodeError(error instanceof ApiError ? error.message : 'That reset code is not valid.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      footer={
        <span>
          {backendEnabled ? 'Reset codes expire after 10 minutes and can only be used once.' : 'Demo reset codes appear in the notification; no email is sent.'}
        </span>
      }
    >
      {step === 'request' ? (
        <>
          <AuthHeading
            title="Reset your password"
            description="Give us the email on the account. We will send a six-digit reset code."
          />
          <form onSubmit={requestForm.handleSubmit(onRequest)} noValidate className="space-y-4">
            {requestError && <InlineAlert tone="danger" title="Could not send the code">{requestError}</InlineAlert>}
            <Field label="Email" error={requestForm.formState.errors.email?.message}>
              {({ id, ...aria }) => (
                <Input id={id} type="email" autoComplete="email" placeholder="you@example.com" {...aria} {...requestForm.register('email')} />
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={requestForm.formState.isSubmitting}>
              <KeyRound size={15} aria-hidden />
              Send reset code
            </Button>
          </form>
        </>
      ) : (
        <>
          <AuthHeading
            title="Choose a new password"
            description={
              <>
                Enter the six-digit code sent to <span className="font-medium text-ink">{email}</span>, then set a new
                password.
              </>
            }
          />
          <form onSubmit={resetForm.handleSubmit(onReset)} noValidate className="space-y-5">
            <div>
              <span className="field-label">Reset code</span>
              <OtpInput
                label="Six digit password reset code"
                value={code}
                onChange={setCode}
                invalid={Boolean(codeError)}
                disabled={submitting}
              />
              {codeError && (
                <p className="field-error" role="alert">
                  {codeError}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" error={resetForm.formState.errors.password?.message} hint="8+ characters, one number.">
                {({ id, ...aria }) => (
                  <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" {...aria} {...resetForm.register('password')} />
                )}
              </Field>
              <Field label="Confirm password" error={resetForm.formState.errors.confirm?.message}>
                {({ id, ...aria }) => (
                  <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" {...aria} {...resetForm.register('confirm')} />
                )}
              </Field>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={submitting}>
              Update password
            </Button>
            <button type="button" className="link inline-flex items-center gap-1.5 text-xs" onClick={() => setStep('request')}>
              <ArrowLeft size={12} aria-hidden />
              Use a different email
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-sm text-ink-2">
        Remembered it?{' '}
        <Link to="/login" className="link">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
