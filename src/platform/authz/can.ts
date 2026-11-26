import type { Action, AuthorizationContext, ResourceRef } from './types'

/**
 * Evaluate the platform authorization rule against a loaded context. Mirrors the Catalogue's
 * authorization rule exactly so tools agree without duplicating server logic:
 *
 *   allow if platformAdmin
 *        OR orgId ∈ managedOrganisations
 *        OR projectId ∈ projectMemberships
 *
 * The `action` is accepted for forward-compatibility; the current model is role-uniform.
 * This is a client-side UX mirror only — the backend/Catalogue always re-enforces it.
 */
export function can(
  ctx: AuthorizationContext | null | undefined,
  _action: Action,
  ref: ResourceRef = {},
): boolean {
  if (!ctx) return false
  if (ctx.platformAdmin) return true
  if (ref.orgId && ctx.managedOrganisations.includes(ref.orgId)) return true
  if (ref.projectId && ctx.projectMemberships.some((m) => m.projectId === ref.projectId)) return true
  return false
}

/**
 * Whether the caller may do an organisation-manager action (publish, put an experience on a Box,
 * create or change Boxes): a platform admin, or a manager of that organisation. Project
 * membership is not enough. Mirrors the backend's `requireManager`; UX gating only.
 */
export function canManageOrg(ctx: AuthorizationContext | null | undefined, orgId: string | null | undefined): boolean {
  if (!ctx || !orgId) return false
  return ctx.platformAdmin || ctx.managedOrganisations.includes(orgId)
}

/**
 * Whether the caller manages anything: a platform admin, or a manager of at least one
 * organisation. For what only managers see at all (the Members link in the menu, the
 * Dashboard's members count and idle Boxes). UX gating only.
 */
export function managesAnyOrg(ctx: AuthorizationContext | null | undefined): boolean {
  if (!ctx) return false
  return ctx.platformAdmin || ctx.managedOrganisations.length > 0
}
