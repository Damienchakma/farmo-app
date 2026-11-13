import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Wordmark } from '@/components/brand/brand'
import { useSession } from '@/store/session'

/** Gate for the signed-in area. The demo has no roles beyond authentication. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useSession()
  const location = useLocation()

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper">
        <div className="flex flex-col items-center gap-4">
          <Wordmark size={30} showTagline />
          <span className="skel h-[3px] w-[140px]" aria-hidden />
          <span className="sr-only" role="status">
            Restoring your session
          </span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <>{children}</>
}
