import type { ProjectDto } from '@/api/museotekBox'
import type { AuthorizationContext } from '@/platform/authz'

/**
 * The tool this frontend authors for. An organisation's projects in the Catalogue include other
 * tools' too (iGuide, Media Editor, …); only these are Museotek Box experiences.
 */
export const TOOL_SLUG = 'museotekbox'

/** Whether a Catalogue project is a Museotek Box experience. */
export function isExperience(project: Pick<ProjectDto, 'toolSlug'>): boolean {
  return project.toolSlug === TOOL_SLUG
}

/**
 * Keep only the Museotek Box experiences. Every screen that lists or counts experiences goes
 * through this one function, so the Dashboard and the Experiences screen cannot disagree.
 */
export function onlyExperiences<T extends Pick<ProjectDto, 'toolSlug'>>(projects: readonly T[]): T[] {
  return projects.filter(isExperience)
}

/**
 * Whether to offer "New experience". Creating needs an organisation to create in, and the
 * Catalogue lets only its managers (or a platform admin) do it; the dialog creates in the first
 * organisation the user manages. So: the user manages at least one organisation. A platform admin
 * who manages none would get a dialog that cannot create. UX gating only.
 */
export function canCreateExperience(ctx: AuthorizationContext | null | undefined): boolean {
  return (ctx?.managedOrganisations.length ?? 0) > 0
}
