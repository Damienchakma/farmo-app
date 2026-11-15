import { TEAM_ROLE_BY_ID } from '@/mock/catalog'
import type { FarmBundle, TeamRole, User } from '@/mock/types'
import type { ExperienceMode } from '@/store/ui'

export type FarmRole = 'owner' | TeamRole | null

type Actor = Pick<User, 'id' | 'email'> | null | undefined

/** The signed-in user's effective role on a farm: owner, an accepted team role, or none. */
export function farmRole(bundle: FarmBundle, user: Actor): FarmRole {
  if (!user) return null
  if (bundle.project.ownerId === user.id) return 'owner'
  const email = user.email.toLowerCase()
  const membership = bundle.memberships.find(
    (m) => m.status === 'accepted' && (m.userId === user.id || m.email.toLowerCase() === email),
  )
  return membership ? membership.role : null
}

/** Property editing is for the owner, agronomists and managers. Viewers and field workers read only. */
export function canEditFarm(bundle: FarmBundle, user: Actor): boolean {
  const role = farmRole(bundle, user)
  if (role === 'owner') return true
  return role ? (TEAM_ROLE_BY_ID.get(role)?.canEdit ?? false) : false
}

/** Inviting, revoking and changing roles is for the owner and farm managers. */
export function canManageTeam(bundle: FarmBundle, user: Actor): boolean {
  const role = farmRole(bundle, user)
  return role === 'owner' || role === 'manager'
}

/** Researcher mode unlocks the developer API, project configuration and destructive actions. */
export function isResearcher(mode: ExperienceMode): boolean {
  return mode === 'researcher'
}