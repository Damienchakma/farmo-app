import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ProviderMark } from '@/components/brand/brand'
import { Button, Field, Input } from '@/components/ui/controls'
import { InlineAlert } from '@/components/ui/feedback'
import { Divider } from '@/components/ui/surfaces'
import { ApiError } from '@/mock/api'
import { backendEnabled } from '@/lib/backend'
import { setGuestDemo } from '@/lib/guest'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'
import { AuthHeading, AuthLayout, DemoCredentials } from './AuthLayout'

const schema = z.object({
  email: z.string().min(1, 'Enter the email address on your account.').email('That does not look like an email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type FormValues = z.infer<typeof schema>

export function LoginRoute() {
  const login = useSession((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [oauthBusy, setOauthBusy] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    try {
      const user = await login(values.email, values.password)
      const target = (location.state as { from?: string } | null)?.from ?? '/projects'
      toast({ tone: 'success', title: `Welcome back, ${user.name.split(' ')[0]}`, body: backendEnabled ? 'Signed in to Farmo.' : 'Signed in to the Farmo demo.' })
      navigate(target, { replace: true })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Sign-in failed. Try again.')
    }
  }

  return (
    <AuthLayout
      footer={
        <span>
          {backendEnabled ? 'Sign in using the password you chose at sign-up.' : 'Demo accounts live in this browser. Seeded accounts use the demo password; new accounts use the password chosen at sign-up.'}
        </span>
      }
    >
      <AuthHeading
        title="Sign in to Farmo"
        description="Advice, risk and visualisations for every plot in your programme."
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <InlineAlert tone="danger" title="Could not sign in">{formError}</InlineAlert>}

        <Field label="Email" error={errors.email?.message}>
          {({ id, ...aria }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...aria}
              {...register('email')}
            />
          )}
        </Field>

        <Field
          label="Password"
          error={errors.password?.message}
          hint={
            <Link to="/forgot" className="link">
              Forgot your password?
            </Link>
          }
        >
          {({ id, ...aria }) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-9"
                {...aria}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1 grid h-[28px] w-[28px] place-items-center rounded-sm text-ink-3 hover:bg-paper-sunken hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} iconRight={<ArrowRight />}>
          Sign in
        </Button>
      </form>

      <div className="mt-4">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => {
            try {
              setGuestDemo(true)
            } catch {
              setFormError('Guest demo needs browser session storage. Allow site storage and try again.')
            }
          }}
        >
          Try demo as guest
        </Button>
        <p className="mt-2 text-center text-xs text-ink-3">
          No account needed. Explore sample farms; changes stay in this tab.
        </p>
      </div>

      <Divider label="or continue with" className="my-6" />

      <div className="space-y-2">
        {(['google', 'facebook', 'yahoo'] as const).map((provider) => (
          <Button
            key={provider}
            variant="outline"
            size="lg"
            className="w-full justify-start gap-2.5"
            icon={<ProviderMark provider={provider} />}
            loading={oauthBusy === provider}
            onClick={() => {
              setOauthBusy(provider)
              navigate(`/oauth/${provider}`)
            }}
          >
            <span className="flex-1 text-left">
              Continue with {provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'Yahoo'}
            </span>
          </Button>
        ))}
      </div>

      <p className="mt-6 text-sm text-ink-2">
        New here?{' '}
        <Link to="/signup" className="link">
          Create an account
        </Link>
      </p>

      {!backendEnabled && <DemoCredentials />}
    </AuthLayout>
  )
}
