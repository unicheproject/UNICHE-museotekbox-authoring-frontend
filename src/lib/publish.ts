import { describeError, errorCode, errorStatus, type PublishStatusDto } from '@/api/museotekBox'

/**
 * What the experience header says about publishing. `undefined` status means "not known yet"
 * (nothing is shown); `null` means it has never been published.
 */
export type PublishLabel = { kind: 'draft' } | { kind: 'published'; version: number; changes: boolean }

export function publishLabel(status: PublishStatusDto | null | undefined): PublishLabel | null {
  if (status === undefined) return null
  if (status === null) return { kind: 'draft' }
  return { kind: 'published', version: status.version, changes: status.hasUnpublishedChanges }
}

/** Whether Publish has a new version to make: never published, or saved since the last one. */
export function hasNewVersion(status: PublishStatusDto | null | undefined): boolean {
  return status === null || status?.hasUnpublishedChanges === true
}

const MANAGER_ONLY = 'Only an organisation manager can publish.'

/**
 * A failed publish or Box change, in words. `boxName` names the Box when the failure came from
 * putting the experience on (or taking it off) one Box. `EXPERIENCE_NOT_READY` is not handled
 * here: its `details` are a list the page shows as one.
 */
export function publishFailure(error: unknown, boxName?: string): string {
  switch (errorCode(error)) {
    case 'START_CARD_IN_USE':
      return boxName
        ? `Another experience on ${boxName} already starts with the same card. Pick a different start card, or take the other experience off that Box.`
        : 'Another experience on one of its Boxes already starts with the same card. Pick a different start card, or take the other experience off that Box.'
    case 'EXPERIENCE_NOT_PUBLISHED':
      return 'Publish the experience first, then choose its Boxes.'
    case 'PROJECT_NOT_IN_BOX_ORG':
      return `${boxName ?? 'That Box'} belongs to a different organisation.`
    case 'BOX_NOT_FOUND':
      return `${boxName ?? 'That Box'} no longer exists.`
  }
  if (errorStatus(error) === 403) return MANAGER_ONLY
  return describeError(error)
}
