import type { AuthorizationContext } from '@/platform/authz/types'

/**
 * What the header says about the signed-in user's place in UNICHE: which organisation they work in,
 * and their role, as a plain sentence in the account menu (the Portal's role line).
 */

/**
 * The organisation the app works in: the first one the user manages, else the organisation of
 * their first experience. Museotek Box has no organisation switching, so this is the one shown.
 */
export function currentOrgId(ctx: AuthorizationContext | null | undefined): string | undefined {
  return ctx?.managedOrganisations[0] ?? ctx?.projectMemberships[0]?.orgId
}

/**
 * The role as a sentence: "Platform administrator", "You manage Test Museum", "Curator on 1
 * experience". The platform admin reads as such even in an organisation they also manage.
 * Null while the authorization context has not loaded.
 */
export function roleLine(
  ctx: AuthorizationContext | null | undefined,
  orgName: string | undefined,
): string | null {
  if (!ctx) return null
  if (ctx.platformAdmin) return 'Platform administrator'
  const orgId = currentOrgId(ctx)
  if (!orgId) return 'Not part of an organisation yet'
  if (ctx.managedOrganisations.includes(orgId)) return `You manage ${orgName ?? 'this organisation'}`
  const n = new Set(ctx.projectMemberships.filter((m) => m.orgId === orgId).map((m) => m.projectId)).size
  return `Curator on ${n} experience${n === 1 ? '' : 's'}`
}
