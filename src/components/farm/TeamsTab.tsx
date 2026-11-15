import { zodResolver } from '@hookform/resolvers/zod'
import { Check, MailPlus, MoreHorizontal, RotateCcw, ShieldCheck, UserMinus, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Field, Input, Select, Textarea } from '@/components/ui/controls'
import { Ledger, Stamp, Td, Th } from '@/components/ui/data'
import { EmptyState, InlineAlert } from '@/components/ui/feedback'
import { ConfirmDialog, Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/overlays'
import { Panel, PanelBody, PanelHead } from '@/components/ui/surfaces'
import { formatDate, relativeTime } from '@/lib/format'
import { TEAM_ROLES, TEAM_ROLE_BY_ID } from '@/mock/catalog'
import type { Membership, TeamRole } from '@/mock/types'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'

const inviteSchema = z.object({
  email: z.string().min(1, 'An email address is required.').email('That does not look like an email address.'),
  role: z.enum(['agronomist', 'manager', 'field-worker', 'viewer']),
  message: z.string().max(240, 'Keep the note under 240 characters.').optional().default(''),
})

type InviteValues = z.input<typeof inviteSchema>

const STATUS_TONE: Record<Membership['status'], 'green' | 'marigold' | 'clay' | 'neutral'> = {
  accepted: 'green',
  pending: 'marigold',
  rejected: 'clay',
  revoked: 'neutral',
}

export function TeamsTab() {
  const bundle = useFarm((s) => s.bundle)
  const inviteMember = useFarm((s) => s.inviteMember)
  const respondToInvite = useFarm((s) => s.respondToInvite)
  const revokeMember = useFarm((s) => s.revokeMember)
  const changeMemberRole = useFarm((s) => s.changeMemberRole)
  const { user, users } = useSession()
  const [revoking, setRevoking] = useState<Membership | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'agronomist', message: '' },
  })

  if (!bundle) return null
  const memberships = bundle.memberships
  const myPending = memberships.filter((m) => m.status === 'pending' && m.email.toLowerCase() === user?.email.toLowerCase())
  const active = memberships.filter((m) => m.status === 'accepted')

  return (
    <div className="space-y-5">
      {/* The invitee's side of the flow, shown when the signed-in user has a pending invite here. */}
      {myPending.map((invite) => (
        <Panel key={invite.id} accent="marigold">
          <PanelBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Your invitation</p>
              <p className="mt-1 text-sm text-ink">
                You were invited to {bundle.farm.name} as <span className="font-medium">{TEAM_ROLE_BY_ID.get(invite.role)?.label}</span>{' '}
                {relativeTime(invite.invitedAt)}.
              </p>
              {invite.message && <p className="mt-1 max-w-[70ch] text-xs italic text-ink-3">“{invite.message}”</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                icon={<Check />}
                onClick={() =>
                  void respondToInvite(invite.id, 'accepted').then(() =>
                    toast({ tone: 'success', title: 'Invitation accepted', body: `You now have access to ${bundle.farm.name}.` }),
                  )
                }
              >
                Accept
              </Button>
              <Button
                variant="quiet"
                icon={<X />}
                onClick={() => void respondToInvite(invite.id, 'rejected').then(() => toast({ tone: 'info', title: 'Invitation declined' }))}
              >
                Decline
              </Button>
            </div>
          </PanelBody>
        </Panel>
      ))}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="space-y-5">
          <Panel>
            <PanelHead
              title="Farm team"
              meta={`${active.length} with access · ${memberships.filter((m) => m.status === 'pending').length} pending`}
              display
            />
            {memberships.length === 0 ? (
              <EmptyState
                compact
                title="No invitations yet"
                description="Invite an agronomist to review the fertiliser plan, or a field worker to record observations."
              />
            ) : (
              <div className="overflow-x-auto">
                <Ledger>
                  <caption className="sr-only">Team members and invitation status</caption>
                  <thead>
                    <tr>
                      <Th>Person</Th>
                      <Th>Role</Th>
                      <Th>Status</Th>
                      <Th>Invited</Th>
                      <Th>Responded</Th>
                      <Th className="col-actions">
                        <span className="sr-only">Actions</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((member) => (
                      <tr key={member.id}>
                        <Td label="Person" className="strong">
                          <span className="flex items-center gap-2.5">
                            <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full border border-line bg-paper-sunken text-[10px] font-semibold text-ink-2">
                              {(member.name ?? member.email)
                                .split(/[\s@.]+/)
                                .filter(Boolean)
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">{member.name ?? 'Not registered yet'}</span>
                              <span className="block truncate text-[11px] text-ink-3">{member.email}</span>
                            </span>
                          </span>
                        </Td>
                        <Td label="Role">
                          {TEAM_ROLE_BY_ID.get(member.role)?.label ?? member.role}
                          <span className="mt-0.5 block text-[11px] text-ink-3">
                            {TEAM_ROLE_BY_ID.get(member.role)?.canEdit ? 'can edit properties' : 'read only'}
                          </span>
                        </Td>
                        <Td label="Status">
                          <Stamp tone={STATUS_TONE[member.status]}>{member.status}</Stamp>
                        </Td>
                        <Td label="Invited">
                          {formatDate(member.invitedAt, 'dayMonth')}
                          <span className="mt-0.5 block text-[11px] text-ink-3">{relativeTime(member.invitedAt)}</span>
                        </Td>
                        <Td label="Responded">{member.respondedAt ? formatDate(member.respondedAt, 'dayMonth') : '—'}</Td>
                        <Td className="col-actions">
                          <span className="actions-inner">
                            {member.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="quiet"
                                icon={<RotateCcw />}
                                aria-label={`Cancel the invitation to ${member.email}`}
                                onClick={() => setRevoking(member)}
                              >
                                Cancel
                              </Button>
                            )}
                            {member.status === 'accepted' && (
                              <Dropdown>
                                <DropdownTrigger asChild>
                                  <button type="button" className="btn btn-sm btn-quiet btn-icon" aria-label={`Actions for ${member.email}`}>
                                    <MoreHorizontal aria-hidden />
                                  </button>
                                </DropdownTrigger>
                                <DropdownContent>
                                  <DropdownLabel>Change role</DropdownLabel>
                                  {TEAM_ROLES.map((role) => (
                                    <DropdownItem
                                      key={role.id}
                                      icon={member.role === role.id ? <Check /> : undefined}
                                      onSelect={() => {
                                        if (member.role === role.id) return
                                        void changeMemberRole(member.id, role.id).then(() =>
                                          toast({ tone: 'success', title: 'Role updated', body: `${member.name ?? member.email} is now ${role.label}.` }),
                                        )
                                      }}
                                    >
                                      {role.label}
                                    </DropdownItem>
                                  ))}
                                  <DropdownSeparator />
                                  <DropdownItem icon={<UserMinus />} danger onSelect={() => setRevoking(member)}>
                                    Revoke access
                                  </DropdownItem>
                                </DropdownContent>
                              </Dropdown>
                            )}
                            {member.status === 'rejected' && (
                              <Button
                                size="sm"
                                variant="quiet"
                                icon={<MailPlus />}
                                onClick={() => {
                                  reset({ email: member.email, role: member.role, message: '' })
                                  toast({ tone: 'info', title: 'Ready to re-invite', body: `${member.email} is filled into the form.` })
                                }}
                              >
                                Invite again
                              </Button>
                            )}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Ledger>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead title="How invitations work" display />
            <PanelBody className="space-y-3 text-sm text-ink-2">
              <p>
                An invitation is sent by email and appears in the recipient's inbox in Farmo. They accept or decline it
                themselves — nobody is added to a farm without responding.
              </p>
              <p className="text-xs text-ink-3">
                To see the other side of this flow, use <span className="font-medium text-ink-2">Dev → switch user</span> in
                the header and pick an account with a pending invitation, then open the bell in the top bar.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TEAM_ROLES.map((role) => (
                  <div key={role.id} className="border-t border-line pt-2.5">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <ShieldCheck size={13} className="text-green-600" aria-hidden />
                      {role.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{role.description}</p>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>
        </div>

        <Panel className="lg:sticky lg:top-[76px] lg:self-start">
          <PanelHead title="Invite a teammate" display />
          <PanelBody>
            <form
              className="space-y-4"
              onSubmit={handleSubmit(async (values) => {
                setFormError(null)
                try {
                  await inviteMember(bundle.farm.id, {
                    email: values.email,
                    role: values.role as TeamRole,
                    message: values.message ?? '',
                  })
                  reset()
                  toast({
                    tone: 'success',
                    title: 'Invitation sent',
                    body: `${values.email} will see it in their Farmo inbox.`,
                  })
                } catch (error) {
                  setFormError(error instanceof Error ? error.message : 'Could not send the invitation.')
                }
              })}
            >
              {formError && <InlineAlert tone="danger" title="Could not send the invitation">{formError}</InlineAlert>}
              <Field label="Email address" error={errors.email?.message} hint="Try one of the demo accounts to see the invitee side.">
                {({ id, ...aria }) => <Input id={id} type="email" placeholder="agronomist@example.com" {...aria} {...register('email')} />}
              </Field>
              <Field label="Role" error={errors.role?.message}>
                {({ id, ...aria }) => (
                  <Select id={id} options={TEAM_ROLES.map((r) => ({ value: r.id, label: r.label }))} {...aria} {...register('role')} />
                )}
              </Field>
              <Field label="Note" error={errors.message?.message} hint="Optional, but it tells them what you need.">
                {({ id, ...aria }) => (
                  <Textarea id={id} rows={3} placeholder="Please keep the irrigation log up to date." {...aria} {...register('message')} />
                )}
              </Field>
              <Button type="submit" variant="primary" className="w-full" icon={<MailPlus />} loading={isSubmitting}>
                Send invitation
              </Button>
              <p className="text-xs leading-relaxed text-ink-3">
                Demo accounts: {users.map((u) => u.email).join(', ')}.
              </p>
            </form>
          </PanelBody>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={revoking?.status === 'pending' ? 'Cancel this invitation?' : `Revoke access for ${revoking?.name ?? revoking?.email}?`}
        description="They keep their own account, but they lose sight of this farm and its advice. You can invite them again later."
        confirmLabel={revoking?.status === 'pending' ? 'Cancel invitation' : 'Revoke access'}
        tone="danger"
        onConfirm={() => {
          if (!revoking) return
          void revokeMember(revoking.id).then(() => {
            toast({ tone: 'info', title: 'Access updated', body: `${revoking.name ?? revoking.email}` })
            setRevoking(null)
          })
        }}
      />
    </div>
  )
}
