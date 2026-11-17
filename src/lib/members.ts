import type { MemberDto } from '@/api/museotekBox'

/**
 * How the Members screen names and describes a member. Framework-free so it can be tested.
 */

/**
 * Whether this row is the signed-in user. Matched on the email, because the backend's `userId` is
 * the Catalogue's own user id, not the sign-in subject, so it never equals `/me/authorization`'s
 * `subject`. Emails are compared without regard to case or surrounding spaces.
 */
export function isSelfMember(member: Pick<MemberDto, 'email'>, signedInEmail: string | null | undefined): boolean {
  const a = member.email?.trim().toLowerCase()
  const b = signedInEmail?.trim().toLowerCase()
  return !!a && !!b && a === b
}

/** The name to show: the display name, or the email when there is none (every curator today). */
export function memberName(member: Pick<MemberDto, 'displayName' | 'email'>): string {
  return member.displayName?.trim() || member.email || 'Unknown'
}

/** The line under the name: the email, but only when the name is not already the email. */
export function memberSubline(member: Pick<MemberDto, 'displayName' | 'email'>): string | null {
  return member.displayName?.trim() && member.email ? member.email : null
}

/** "Manager" / "Curator" from the backend's constant. */
export function memberRole(role: string | null | undefined): string | null {
  if (!role) return null
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

/**
 * What `since` means for this row: when a manager was given the role, or when a curator was invited
 * (the backend has no join date). Null when the date is missing or unreadable.
 */
export function memberSince(member: Pick<MemberDto, 'role' | 'since'>, locale?: string): string | null {
  if (!member.since) return null
  const date = new Date(member.since)
  if (Number.isNaN(date.getTime())) return null
  const day = date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  return member.role === 'MANAGER' ? `Manager since ${day}` : `Invited on ${day}`
}
