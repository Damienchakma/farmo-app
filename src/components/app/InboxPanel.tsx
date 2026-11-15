import { BellOff, Check, Info, Mail, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/controls'
import { EmptyState } from '@/components/ui/feedback'
import { EnvelopeIllustration } from '@/components/brand/brand'
import { Stamp } from '@/components/ui/data'
import { cn } from '@/lib/cn'
import { relativeTime } from '@/lib/format'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'

/** Notification inbox. Farm invitations can be accepted or declined here. */
export function InboxPanel({ onClose }: { onClose: () => void }) {
  const notifications = useFarm((s) => s.notifications)
  const bundle = useFarm((s) => s.bundle)
  const respondToInvite = useFarm((s) => s.respondToInvite)
  const markAllRead = useFarm((s) => s.markNotificationsRead)
  const { user } = useSession()
  const [busy, setBusy] = useState<string | null>(null)
  const navigate = useNavigate()

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div>
      <header className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">Inbox</h2>
          {unread > 0 && <Stamp tone="marigold">{unread} new</Stamp>}
        </div>
        {unread > 0 && (
          <button type="button" className="link text-xs" onClick={() => void markAllRead()}>
            Mark all read
          </button>
        )}
      </header>

      {!notifications.length && (
        <EmptyState
          compact
          illustration={<EnvelopeIllustration />}
          title="No messages"
          description="Invitations to farms and decisions from your team land here."
        />
      )}

      <ul className="divide-y divide-line">
        {notifications.map((notification) => {
          const invite = notification.kind === 'invite' && notification.membershipId
          const farmName = bundle && bundle.farm.id === notification.farmId ? bundle.farm.name : null
          return (
            <li key={notification.id} className={cn('px-3.5 py-3', !notification.read && 'bg-marigold-50/60')}>
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full border',
                    notification.kind === 'invite'
                      ? 'border-marigold-100 bg-marigold-100 text-marigold-700'
                      : notification.kind === 'decision'
                        ? 'border-green-100 bg-green-100 text-green-700'
                        : 'border-line bg-paper-sunken text-ink-3',
                  )}
                  aria-hidden
                >
                  {notification.kind === 'invite' ? <Mail size={13} /> : notification.kind === 'decision' ? <Check size={13} /> : <Info size={13} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm leading-snug', notification.read ? 'text-ink-2' : 'font-semibold text-ink')}>
                    {notification.title}
                  </p>
                  {notification.body && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{notification.body}</p>}
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-ink-3">
                    <span>{relativeTime(notification.at)}</span>
                    {farmName && (
                      <button
                        type="button"
                        className="link"
                        onClick={() => {
                          onClose()
                          navigate(`/farms/${notification.farmId}/overview`)
                        }}
                      >
                        open farm
                      </button>
                    )}
                  </p>
                  {invite && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy === notification.membershipId}
                        onClick={() => {
                          setBusy(notification.membershipId)
                          void respondToInvite(notification.membershipId!, 'accepted')
                            .then(() => {
                              toast({
                                tone: 'success',
                                title: 'Invitation accepted',
                                body: `You now have access to the farm as ${user?.jobTitle ?? 'a team member'}.`,
                              })
                              if (notification.farmId) navigate(`/farms/${notification.farmId}/overview`)
                              onClose()
                            })
                            .finally(() => setBusy(null))
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="quiet"
                        icon={<X />}
                        onClick={() => {
                          setBusy(notification.membershipId)
                          void respondToInvite(notification.membershipId!, 'rejected')
                            .then(() => toast({ tone: 'info', title: 'Invitation declined', body: 'The farm owner has been told.' }))
                            .finally(() => setBusy(null))
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {notifications.length > 0 && (
        <footer className="flex items-center gap-2 border-t border-line bg-paper-sunken px-3.5 py-2.5 text-[11px] text-ink-3">
          <BellOff size={12} aria-hidden />
          Use <span className="font-medium text-ink-2">Dev → switch user</span> to see another person’s inbox.
        </footer>
      )}
    </div>
  )
}
