import { Check, ExternalLink, LogOut, MailCheck, MailWarning, Phone, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ProviderMark } from '@/components/brand/brand'
import { Button, Field, Input } from '@/components/ui/controls'
import { Stamp } from '@/components/ui/data'
import { InlineAlert, Skeleton } from '@/components/ui/feedback'
import { ConfirmDialog } from '@/components/ui/overlays'
import { Divider, Panel, PanelBody, PanelHead, SectionHead } from '@/components/ui/surfaces'
import { useAsync } from '@/lib/hooks'
import { formatDate } from '@/lib/format'
import { api } from '@/mock/api'
import type { OAuthProvider } from '@/mock/types'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'

const PROVIDER_NAME: Record<OAuthProvider, string> = { google: 'Google', facebook: 'Facebook', yahoo: 'Yahoo' }

export function AccountRoute() {
  const { user, users, updateProfile, signOut, switchUser, requestOtp, verifyOtp } = useSession()
  const navigate = useNavigate()
  const projects = useAsync(() => api.listProjects(), [])
  const [name, setName] = useState(user?.name ?? '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  if (!user) return null

  const farms = projects.data?.flatMap((row) => row.farms) ?? []
  const dirty = name !== user.name || jobTitle !== user.jobTitle || phone !== user.phone

  return (
    <div className="mx-auto max-w-[1240px]">
      <SectionHead
        eyebrow="Account"
        title="Your profile and access"
        description="One Farmo account holds every project you own or work on. Verification status here decides which farm-level actions you can take."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel>
            <PanelHead title="Profile" meta="Shown to everyone you share a farm with" display />
            <PanelBody>
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-line bg-green-100 font-display text-lg text-green-700">
                  {user.initials}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-xl text-ink">{user.name}</p>
                  <p className="text-sm text-ink-3">{user.jobTitle}</p>
                  <p className="mt-0.5 text-xs text-ink-3">Member since {formatDate(user.createdAt, 'long')}</p>
                </div>
              </div>

              <Divider className="my-4" />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  {({ id, ...aria }) => <Input id={id} value={name} onChange={(event) => setName(event.target.value)} {...aria} />}
                </Field>
                <Field label="Role or title">
                  {({ id, ...aria }) => <Input id={id} value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} {...aria} />}
                </Field>
                <Field label="Phone" error={phoneError} hint="Used for frost and outbreak alerts by SMS.">
                  {({ id, ...aria }) => (
                    <Input
                      id={id}
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value)
                        setPhoneError(null)
                      }}
                      placeholder="+1 555 0100"
                      {...aria}
                    />
                  )}
                </Field>
                <Field label="Email" hint="Contact support to change the address on the account.">
                  {({ id, ...aria }) => <Input id={id} value={user.email} readOnly disabled {...aria} />}
                </Field>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  loading={saving}
                  disabled={!dirty}
                  onClick={() => {
                    if (phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
                      setPhoneError('Use an international format, e.g. +1 555 0142.')
                      return
                    }
                    setSaving(true)
                    void updateProfile({ name, jobTitle, phone })
                      .then(() => toast({ tone: 'success', title: 'Profile updated' }))
                      .finally(() => setSaving(false))
                  }}
                >
                  Save profile
                </Button>
                {dirty && (
                  <button
                    type="button"
                    className="link text-xs"
                    onClick={() => {
                      setName(user.name)
                      setJobTitle(user.jobTitle)
                      setPhone(user.phone)
                      setPhoneError(null)
                    }}
                  >
                    Discard changes
                  </button>
                )}
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Verified contact points" meta="Codes are shown in a dev toast — there is no mail server in the demo" display />
            <PanelBody className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line px-3.5 py-3">
                <div className="flex items-start gap-3">
                  <span className={user.emailVerified ? 'text-green-600' : 'text-marigold-700'}>
                    {user.emailVerified ? <MailCheck size={18} aria-hidden /> : <MailWarning size={18} aria-hidden />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{user.email}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {user.emailVerified ? 'Verified — invitations and alerts are delivered here.' : 'Not verified yet.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stamp tone={user.emailVerified ? 'green' : 'marigold'}>{user.emailVerified ? 'verified' : 'unverified'}</Stamp>
                  {!user.emailVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void requestOtp(user.email, 'verify-email').then((code) => {
                          toast({ tone: 'code', title: 'Email verification code', body: `Six digits for ${user.email}.`, code, ttl: 20000 })
                          navigate('/verify', { state: { email: user.email, code } })
                        })
                      }
                    >
                      Verify now
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line px-3.5 py-3">
                <div className="flex items-start gap-3">
                  <span className={user.phoneVerified ? 'text-green-600' : 'text-marigold-700'}>
                    <Phone size={18} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{user.phone || 'No number on the account'}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {user.phoneVerified ? 'Verified — SMS alerts are active.' : 'Verify to receive SMS outbreak and frost alerts.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stamp tone={user.phoneVerified ? 'green' : 'neutral'}>{user.phoneVerified ? 'verified' : 'unverified'}</Stamp>
                  {!user.phoneVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void requestOtp(user.email, 'verify-phone').then((code) => {
                          toast({
                            tone: 'code',
                            title: 'Mobile verification code',
                            body: `${user.phone ? `Sent to ${user.phone}` : 'Add a number first, then verify it'}. In the demo the code is shown here.`,
                            code,
                            ttl: 20000,
                          })
                        })
                      }
                    >
                      Send code
                    </Button>
                  )}
                </div>
              </div>

              {!user.phoneVerified && user.phone && (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const input = new FormData(event.currentTarget).get('code')?.toString() ?? ''
                    void verifyOtp(user.email, input, 'verify-phone')
                      .then(() => toast({ tone: 'success', title: 'Mobile number verified' }))
                      .catch((error: unknown) =>
                        toast({ tone: 'danger', title: 'Could not verify', body: error instanceof Error ? error.message : 'Check the code' }),
                      )
                  }}
                >
                  <Field label="Six-digit code" hint="Shown in the toast when you request it.">
                    {({ id, ...aria }) => (
                      <Input id={id} name="code" inputMode="numeric" maxLength={6} placeholder="123456" className="w-[130px] font-mono" {...aria} />
                    )}
                  </Field>
                  <Button type="submit" variant="primary">
                    Confirm code
                  </Button>
                </form>
              )}
            </PanelBody>
          </Panel>

          <Panel accent="clay">
            <PanelHead title="Session and data" display />
            <PanelBody className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-2">
                The demo keeps everything in this browser's local storage. Signing out clears the session, not the data;
                resetting restores the seeded projects, farms and history.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" icon={<LogOut />} onClick={() => setSignOutOpen(true)}>
                  Sign out
                </Button>
                <Button
                  variant="danger"
                  icon={<Trash2 />}
                  onClick={() =>
                    void api.resetDemoData().then(() => {
                      toast({ tone: 'info', title: 'Demo data reset', body: 'Seeded projects and history restored.' })
                      window.location.assign('/projects')
                    })
                  }
                >
                  Reset demo data
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <PanelHead title="Connected sign-in providers" display />
            <PanelBody className="space-y-2.5">
              {(['google', 'facebook', 'yahoo'] as OAuthProvider[]).map((provider) => {
                const connected = user.providers.includes(provider)
                return (
                  <div key={provider} className="flex items-center justify-between gap-3 rounded-sm border border-line px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <ProviderMark provider={provider} />
                      <span className="text-sm text-ink">{PROVIDER_NAME[provider]}</span>
                    </span>
                    {connected ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Stamp tone="green">connected</Stamp>
                        <Button
                          size="sm"
                          variant="quiet"
                          onClick={() =>
                            toast({
                              tone: 'info',
                              title: 'Provider disconnected (demo)',
                              body: `${PROVIDER_NAME[provider]} would be unlinked here. Your email and password still work.`,
                            })
                          }
                        >
                          Disconnect
                        </Button>
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/oauth/${provider}`)}>
                        Connect
                      </Button>
                    )}
                  </div>
                )
              })}
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
                <ShieldCheck size={13} className="mt-[2px] flex-none" aria-hidden />
                Farmo receives your name, email and language preference only. The consent screen in the demo is a faithful
                mock of the provider's page.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Your access" meta={`${farms.length} farms across ${projects.data?.length ?? 0} projects`} display />
            <PanelBody className="space-y-2.5">
              {projects.loading && <Skeleton className="h-20 w-full" />}
              {projects.data?.map((row) => (
                <div key={row.project.id} className="border-t border-line pt-2.5 first:border-0 first:pt-0">
                  <p className="text-sm font-medium text-ink">{row.project.name}</p>
                  <ul className="mt-1 space-y-0.5">
                    {row.farms.map((farm) => (
                      <li key={farm.id} className="flex items-center justify-between gap-3 text-xs">
                        <Link to={`/farms/${farm.id}/overview`} className="link truncate">
                          {farm.name}
                        </Link>
                        <span className="flex-none text-ink-3">{farm.district}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {projects.data?.length === 0 && (
                <InlineAlert tone="info">You are not part of a project yet. Create one from the projects screen.</InlineAlert>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Demo: switch user" meta="Inspect the invitee side of the flow" display />
            <PanelBody className="space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    void switchUser(u.id).then(() => {
                      toast({ tone: 'info', title: `Now signed in as ${u.name}`, body: u.jobTitle })
                      navigate('/projects')
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-sm border border-line px-3 py-2.5 text-left hover:bg-paper-sunken"
                >
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-paper-sunken text-[10px] font-semibold text-ink-2">
                    {u.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{u.name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {u.jobTitle} · {u.email}
                    </span>
                  </span>
                  {u.id === user.id ? <Stamp tone="green">current</Stamp> : <UserCog size={14} className="text-ink-3" aria-hidden />}
                </button>
              ))}
              <p className="text-xs leading-relaxed text-ink-3">
                Two of the demo accounts have a pending farm invitation, so the notification bell has something to act on.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Documentation" display />
            <PanelBody className="space-y-2 text-sm">
              <Link to="/developers" className="link inline-flex items-center gap-1.5">
                <ExternalLink size={12} aria-hidden />
                Developer API reference and console
              </Link>
              <p className="text-xs leading-relaxed text-ink-3">
                Advice and risk in this demo are produced by a deterministic rule engine over the same property model the
                production models are trained on. Model versions are shown alongside every version of the output.
              </p>
              <p className="flex items-center gap-1.5 text-xs text-ink-3">
                <Check size={12} className="text-green-600" aria-hidden />
                WCAG AA contrast, keyboard navigation and reduced-motion support are documented in DESIGN.md.
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out of Farmo?"
        description="Your projects stay in this browser. You can sign back in with the same email and the demo password."
        confirmLabel="Sign out"
        onConfirm={() => {
          setSignOutOpen(false)
          void signOut().then(() => navigate('/login'))
        }}
      />
    </div>
  )
}
