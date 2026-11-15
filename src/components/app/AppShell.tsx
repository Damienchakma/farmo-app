import {
  Bell,
  ChevronRight,
  Code2,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Settings,
  Sprout,
  Terminal,
  UserCog,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Wordmark } from '@/components/brand/brand'
import { Stamp } from '@/components/ui/data'
import { Breadcrumbs, type Crumb } from '@/components/app/Breadcrumbs'
import { CommandPalette } from '@/components/app/CommandPalette'
import { DevMenu } from '@/components/app/DevMenu'
import { InboxPanel } from '@/components/app/InboxPanel'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  TooltipProvider,
} from '@/components/ui/overlays'
import { useAsync } from '@/lib/hooks'
import { isGuestDemo, setGuestDemo } from '@/lib/guest'
import { api, latencyRange, resetDemoData } from '@/mock/api'
import { useFarm } from '@/store/farm'
import { useSession } from '@/store/session'
import { useUi, toast } from '@/store/ui'

/* ------------------------------------------------------------- Sidebar ---- */

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useSession()
  const dataVersion = useUi((s) => s.dataVersion)
  const mode = useUi((s) => s.mode)
  const projects = useAsync(() => api.listProjects(), [dataVersion, user?.id])
  const unread = useFarm((s) => s.notifications.filter((n) => !n.read).length)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[57px] flex-none items-center justify-between border-b border-line px-4">
        <Link to="/projects" onClick={onNavigate} aria-label="Farmo home">
          <Wordmark size={26} />
        </Link>
        <span className="stamp stamp-plain text-[10px]">{isGuestDemo ? 'guest demo' : 'demo'}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Main">
        <NavLink to="/projects" className="nav-item" onClick={onNavigate}>
          <LayoutGrid aria-hidden />
          Projects
        </NavLink>
        {mode === 'researcher' && (
          <NavLink to="/developers" className="nav-item" onClick={onNavigate}>
            <Terminal aria-hidden />
            Developer API
          </NavLink>
        )}
        <NavLink to="/account" className="nav-item" onClick={onNavigate}>
          <Settings aria-hidden />
          Account
        </NavLink>

        <div className="mt-5 px-2 pb-1.5">
          <span className="eyebrow">Farms</span>
        </div>
        {projects.loading && (
          <div className="space-y-1.5 px-2 py-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel h-[26px]" />
            ))}
          </div>
        )}
        {projects.data?.map(({ project, farms }) => (
          <div key={project.id}>
            <NavLink to={`/projects/${project.id}`} className="nav-item" onClick={onNavigate}>
              <LayoutGrid aria-hidden />
              <span className="truncate">{project.name}</span>
            </NavLink>
            {farms.map((farm) => (
              <FarmNavItem key={farm.id} farmId={farm.id} farmName={farm.name} projectName={project.name} onNavigate={onNavigate} />
            ))}
          </div>
        ))}

        <div className="mt-5 px-2 pb-1.5">
          <span className="eyebrow">Session</span>
        </div>
        <div className="px-2 pb-1 text-xs leading-relaxed text-ink-3">
          Signed in as <span className="font-medium text-ink-2">{user?.name}</span>
          {unread > 0 && <> · {unread} unread</>}
        </div>
        <button type="button" className="nav-item w-full" onClick={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </button>
      </nav>

      <div className="flex-none border-t border-line px-3 py-2.5">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs text-ink-3 hover:bg-paper-deep hover:text-ink"
          onClick={() => {
            resetDemoData()
            window.location.reload()
          }}
        >
          <RefreshCw size={13} aria-hidden />
          Reset demo data
        </button>
        <p className="mt-1 px-1.5 font-mono text-[10px] text-soil-300">
          mock api · {latencyRange()[0]}–{latencyRange()[1]} ms
        </p>
      </div>
    </div>
  )
}

function FarmNavItem({ farmId, farmName, projectName, onNavigate }: { farmId: string; farmName: string; projectName: string; onNavigate?: () => void }) {
  const name = useFarm((s) => s.bundle?.farm.id === farmId ? s.bundle.farm.name : farmName)

  return (
    <NavLink to={`/farms/${farmId}/overview`} className="nav-item" onClick={onNavigate} title={projectName}>
      <Sprout aria-hidden />
      <span className="truncate">{name}</span>
    </NavLink>
  )
}

/* -------------------------------------------------------------- Topbar ---- */

function useCrumbs(): Crumb[] {
  const location = useLocation()
  const params = useParams()
  const farmBundle = useFarm((s) => s.bundle)
  const crumbs: Crumb[] = []

  const segments = location.pathname.split('/').filter(Boolean)
  if (segments[0] === 'projects' && !segments[1]) crumbs.push({ label: 'Projects' })
  if (segments[0] === 'projects' && segments[1]) {
    crumbs.push({ label: 'Projects', to: '/projects' })
    crumbs.push({ label: 'Project', to: location.pathname })
  }
  if (segments[0] === 'farms') {
    crumbs.push({ label: 'Projects', to: '/projects' })
    if (farmBundle && params.farmId === farmBundle.farm.id) {
      crumbs.push({ label: farmBundle.project.name, to: `/projects/${farmBundle.project.id}` })
      crumbs.push({ label: farmBundle.farm.name, to: `/farms/${farmBundle.farm.id}/overview` })
      const tab = segments[2]
      if (tab && tab !== 'overview') crumbs.push({ label: tab.charAt(0).toUpperCase() + tab.slice(1) })
    } else {
      crumbs.push({ label: 'Farm', to: location.pathname })
    }
  }
  if (segments[0] === 'developers') crumbs.push({ label: 'Developer API' })
  if (segments[0] === 'account') crumbs.push({ label: 'Account' })
  return crumbs
}

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const crumbs = useCrumbs()
  const { user, users, switchUser } = useSession()
  const setPaletteOpen = useUi((s) => s.setPaletteOpen)
  const inboxOpen = useUi((s) => s.inboxOpen)
  const setInboxOpen = useUi((s) => s.setInboxOpen)
  const mode = useUi((s) => s.mode)
  const notifications = useFarm((s) => s.notifications)
  const loadNotifications = useFarm((s) => s.loadNotifications)
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications, user?.id])

  return (
    <header className="sticky top-0 z-40 flex h-[57px] flex-none items-center gap-3 border-b border-line bg-paper/95 px-3 backdrop-blur-[2px] sm:px-4">
      <button
        type="button"
        className="btn btn-quiet btn-icon btn-sm lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs crumbs={crumbs} />
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="group hidden h-[32px] items-center gap-2 rounded-sm border border-line-strong bg-paper-raised px-2.5 text-xs text-ink-3 hover:border-soil-300 hover:text-ink md:flex md:w-[236px]"
      >
        <Search size={14} aria-hidden />
        <span className="flex-1 truncate whitespace-nowrap text-left">Search farms, plants, actions…</span>
        <span className="kbd">⌘K</span>
      </button>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="btn btn-quiet btn-icon btn-sm md:hidden"
        aria-label="Search"
      >
        <Search aria-hidden />
      </button>

      <Popover open={inboxOpen} onOpenChange={setInboxOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="btn btn-quiet btn-icon btn-sm relative"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          >
            <Bell aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-marigold-500 px-1 text-[10px] font-semibold text-soil-800">
                {unread}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent width={380} align="end">
          <InboxPanel onClose={() => setInboxOpen(false)} />
        </PopoverContent>
      </Popover>

      <DevMenu />

      <Dropdown>
        <DropdownTrigger asChild>
          <button
            type="button"
            className="flex h-[30px] items-center gap-2 rounded-sm border border-line-strong bg-paper-raised px-1.5 pr-2 text-xs font-medium text-ink-2 hover:border-soil-300 hover:text-ink"
            aria-label="Account menu"
          >
            <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-green-100 text-[10px] font-semibold text-green-700">
              {user?.initials ?? '··'}
            </span>
            <span className="hidden max-w-[110px] truncate sm:inline">{user?.name ?? 'Signed out'}</span>
            <ChevronRight size={12} className="rotate-90 text-ink-3" aria-hidden />
          </button>
        </DropdownTrigger>
        <DropdownContent>
          <div className="px-2.5 py-2">
            <p className="text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-ink-3">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-1">
              <Stamp tone={user?.emailVerified ? 'green' : 'marigold'}>
                {user?.emailVerified ? 'email verified' : 'email unverified'}
              </Stamp>
              <Stamp tone={user?.phoneVerified ? 'green' : 'neutral'}>
                {user?.phoneVerified ? 'phone ok' : 'phone pending'}
              </Stamp>
            </div>
          </div>
          <DropdownSeparator />
          <DropdownLabel>Demo: switch user</DropdownLabel>
          {users.map((u) => (
            <DropdownItem
              key={u.id}
              icon={<UserCog />}
              onSelect={() => {
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
              {u.name}
              {u.id === user?.id ? ' · current' : ''}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem icon={<Settings />} onSelect={() => navigate('/account')}>
            Account settings
          </DropdownItem>
          {mode === 'researcher' && (
            <DropdownItem icon={<Terminal />} onSelect={() => navigate('/developers')}>
              Developer API
            </DropdownItem>
          )}
          <DropdownSeparator />
          <DropdownItem
            icon={<LogOut />}
            danger
            onSelect={() => {
              void useSession.getState().signOut()
              navigate('/login')
            }}
          >
            Sign out
          </DropdownItem>
        </DropdownContent>
      </Dropdown>
    </header>
  )
}

/* ---------------------------------------------------------- AppShell ----- */

export function AppShell() {
  const navOpen = useUi((s) => s.navOpen)
  const setNavOpen = useUi((s) => s.setNavOpen)
  const mode = useUi((s) => s.mode)
  const location = useLocation()
  const bundle = useFarm((s) => s.bundle)
  const recalcActive = useFarm((s) => s.recalc.active)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname, setNavOpen])

  // Keep the browser tab honest about where the user is.
  useEffect(() => {
    const farm = bundle?.farm.name
    document.title = farm ? `${farm} · Farmo` : 'Farmo — farm decision support'
  }, [bundle?.farm.name])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh bg-paper">
        <aside className="hidden w-[248px] flex-none border-r border-line bg-paper-sunken lg:block">
          <div className="sticky top-0 h-dvh">
            <SidebarContent />
          </div>
        </aside>

        {navOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-soil-800/40"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[268px] border-r border-line-strong bg-paper-sunken shadow-[var(--shadow-pop)]">
              <button
                type="button"
                className="btn btn-quiet btn-icon btn-sm absolute right-2 top-3"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
              >
                <X aria-hidden />
              </button>
              <SidebarContent onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenNav={() => setNavOpen(true)} />
          {isGuestDemo && (
            <section aria-label="Guest demo" className="flex flex-wrap items-center justify-between gap-2 border-b border-marigold-100 bg-marigold-50 px-4 py-2.5 text-xs text-soil-800 sm:px-6 lg:px-8">
              <p><strong>Guest demo.</strong> Sample farms only. Changes stay in this tab and are cleared when you exit.</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setGuestDemo(false)}>
                Exit guest demo
              </button>
            </section>
          )}
          {recalcActive && (
            <div className="h-[2px] w-full overflow-hidden bg-marigold-100">
              <span className="block h-full w-1/3 animate-[farmo-slide_1.1s_ease-in-out_infinite] bg-marigold-500" />
            </div>
          )}
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <Outlet />
          </main>
          <footer className="flex-none border-t border-line px-4 py-3 text-[11px] text-ink-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Farmo demo · advice and risk are generated by a deterministic mock engine</span>
              {mode === 'researcher' && (
                <Link to="/developers" className="link inline-flex items-center gap-1">
                  <Code2 size={11} aria-hidden />
                  API reference
                </Link>
              )}
              <Link to="/account" className="link inline-flex items-center gap-1">
                <MessageSquarePlus size={11} aria-hidden />
                Send feedback
              </Link>
              <span className="ml-auto hidden sm:inline">{new Date().getFullYear()} · v0.9 demo</span>
            </div>
          </footer>
        </div>
      </div>
      <CommandPalette />
    </TooltipProvider>
  )
}

