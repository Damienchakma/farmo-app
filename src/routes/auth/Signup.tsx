import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, CheckboxField, Field, Input } from '@/components/ui/controls'
import { InlineAlert } from '@/components/ui/feedback'
import { ApiError } from '@/mock/api'
import { backendEnabled } from '@/lib/backend'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'
import { AuthHeading, AuthLayout } from './AuthLayout'

const schema = z
  .object({
    name: z
      .string()
      .min(2, 'Enter your full name.')
      .max(60, 'That name is longer than the field allows.')
      .regex(/^[\p{L}\s.'-]+$/u, 'Letters, spaces, apostrophes and hyphens only.'),
    email: z.string().min(1, 'An email address is required.').email('That does not look like an email address.'),
    phone: z
      .string()
      .min(1, 'A mobile number is required for field alerts.')
      .regex(/^\+?[0-9][0-9\s\-()]{6,19}$/, 'Use an international number with its country code, e.g. +1 555 0142.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .regex(/[0-9]/, 'Include at least one number.')
      .regex(/[a-zA-Z]/, 'Include at least one letter.'),
    confirm: z.string(),
    terms: z.boolean(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'The two passwords do not match.',
  })
  .refine((values) => values.terms === true, {
    path: ['terms'],
    message: 'Please accept the terms to create an account.',
  })

type FormValues = z.infer<typeof schema>

export function SignupRoute() {
  const signup = useSession((s) => s.signup)
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirm: '', terms: false },
  })

  const terms = watch('terms')

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    try {
      const { user, code } = await signup({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      })
      if (user.emailVerified) {
        toast({ tone: 'success', title: `Welcome, ${user.name.split(' ')[0]}`, body: 'Your account is ready.' })
        navigate('/projects', { replace: true })
        return
      }
      toast({
        tone: 'code',
        title: 'Verification code sent',
        body: code ? 'Development code only — no email was sent.' : `A six-digit code was sent to ${user.email}. Check spam too.`,
        code,
        ttl: 20000,
      })
      navigate('/verify', { state: { email: user.email, code } })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not create the account. Try again.')
    }
  }

  return (
    <AuthLayout
      footer={<span>{backendEnabled ? 'Your account and farm records are saved on the Farmo server.' : 'Your account exists only in this browser. Nothing is uploaded anywhere.'}</span>}
    >
      <AuthHeading
        title="Create your Farmo account"
        description="One account holds your projects, farms and the plant record behind every recommendation."
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <InlineAlert tone="danger" title="Could not create the account">{formError}</InlineAlert>}

        <Field label="Full name" error={errors.name?.message}>
          {({ id, ...aria }) => (
            <Input id={id} autoComplete="name" placeholder="Alex Morgan" {...aria} {...register('name')} />
          )}
        </Field>

        <Field label="Email" error={errors.email?.message}>
          {({ id, ...aria }) => <Input id={id} type="email" autoComplete="email" placeholder="you@example.com" {...aria} {...register('email')} />}
        </Field>

        <Field
          label="Mobile number"
          error={errors.phone?.message}
          hint="Weather and outbreak alerts are sent by SMS in the live product."
        >
          {({ id, ...aria }) => (
            <Input id={id} inputMode="tel" autoComplete="tel" placeholder="01712 345678" {...aria} {...register('phone')} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message} hint="8+ characters, one number.">
            {({ id, ...aria }) => (
              <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" {...aria} {...register('password')} />
            )}
          </Field>
          <Field label="Confirm password" error={errors.confirm?.message}>
            {({ id, ...aria }) => (
              <Input id={id} type="password" autoComplete="new-password" placeholder="••••••••" {...aria} {...register('confirm')} />
            )}
          </Field>
        </div>

        <div className="pt-1">
          <CheckboxField
            checked={terms}
            onCheckedChange={(checked) => setValue('terms', checked, { shouldValidate: true })}
            label="I agree to the demo terms and data policy"
            description="Advice is decision support, not a guarantee of yield. Agronomic judgement still applies."
          />
          {errors.terms && (
            <p className="field-error" role="alert">
              {errors.terms.message}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting} iconRight={<ArrowRight />}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        Already have an account?{' '}
        <Link to="/login" className="link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
