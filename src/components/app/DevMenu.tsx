import { Beaker, Check, ExternalLink, RotateCcw, Sparkles, UserCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/overlays'
import { isGuestDemo } from '@/lib/guest'
import { latencyRange, resetDemoData } from '@/mock/api'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'
import { toast } from '@/store/ui'

/**
 * Developer affordances kept deliberately visible: switching the demo user,
 * resetting the seeded data, and seeing what the mock layer is doing.
 */
export function DevMenu() {
  const { users, user, switchUser } = useSession()
  const navigate = useNavigate()
  const resetRecalc = useFarm((s) => s.resetRecalc)

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          className="btn btn-quiet btn-icon btn-sm"
          aria-label="Developer menu"
          title="Developer menu"
        >
          <Beaker aria-hidden />
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-[268px]">
        <DropdownLabel>Demo: switch user</DropdownLabel>
        {users.map((u) => (
          <DropdownItem
            key={u.id}
            icon={u.id === user?.id ? <Check /> : <UserCog />}
            onSelect={() => {
              if (u.id === user?.id) return
              void switchUser(u.id).then(() => {
                toast({
                  tone: 'info',
                  title: `Now signed in as ${u.name}`,
                  body: `${u.jobTitle} · ${u.email}`,
                })
                navigate('/projects')
              })
            }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="truncate">{u.name}</span>
              <span className="flex-none text-[11px] text-ink-3">{u.jobTitle}</span>
            </span>
          </DropdownItem>
        ))}

        <DropdownSeparator />
        <DropdownLabel>Mock layer</DropdownLabel>
        <div className="px-2.5 pb-1.5 text-[11px] leading-relaxed text-ink-3">
          <p>
            Latency {latencyRange()[0]}–{latencyRange()[1]} ms per call · {isGuestDemo ? 'temporary guest data in this tab' : 'state in localStorage'}
          </p>
          <p className="mt-0.5">Advice and risk recalculate 1.4 s after a property edit.</p>
        </div>
        <DropdownItem
          icon={<Sparkles />}
          onSelect={() => {
            toast({
              tone: 'code',
              title: 'Sample verification code',
              body: 'Any email that exists in the demo gets a six-digit code shown here.',
              code: '482913',
            })
          }}
        >
          Show a sample OTP toast
        </DropdownItem>
        <DropdownItem
          icon={<RotateCcw />}
          onSelect={() => {
            resetRecalc()
            resetDemoData()
            window.location.assign('/projects')
          }}
        >
          Reset demo data and reload
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={<ExternalLink />} onSelect={() => navigate('/developers')}>
          Open developer console
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}
