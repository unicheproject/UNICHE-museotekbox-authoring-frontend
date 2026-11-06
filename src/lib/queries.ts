import {
  getExperience,
  listBoxProjects,
  listBoxes,
  listCommentCounts,
  listMedia,
  listMembers,
  listProjects,
  listScanObjectTypes,
  listScanObjects,
  type BoxDto,
  type ExperienceDto,
  type MediaDto,
  type MemberDto,
  type ProjectDto,
  type ScanObjectDto,
} from '@/api/museotekBox'
import { scanTypesFrom } from '@/lib/authoring/document'
import type { ScanType } from '@/lib/authoring/engine'
import { fetchQuery, invalidateQueries, setQueryData, useQuery, type QueryKey, type UseQueryOptions } from './useQuery'

/**
 * The server data more than one screen reads, each under one cache key. The experiences list, the
 * experience page and the Boxes screens all ask through here, so a thing fetched by one is there
 * for the others, and a change made anywhere refreshes it everywhere.
 *
 * Keys are matched by prefix when invalidated: `'installed'` clears every organisation's.
 */
export const keys = {
  projects: (orgId: string) => ['projects', orgId] as const,
  experience: (projectId: string) => ['experience', projectId] as const,
  scanTypes: (orgId: string) => ['scan-types', orgId] as const,
  /** The ids of the experiences on at least one of the organisation's Boxes. */
  installed: (orgId: string) => ['installed', orgId] as const,
  commentCounts: (orgId: string) => ['comment-counts', orgId] as const,
  /** The same keys the Boxes, Scan objects and Members screens subscribe to. */
  boxes: (orgId: string) => ['boxes', orgId] as const,
  boxProjects: (orgId: string, boxId: number) => ['box-projects', orgId, boxId] as const,
  scanObjects: (orgId: string) => ['scan-objects', orgId] as const,
  members: (orgId: string) => ['members', orgId] as const,
  media: (orgId: string) => ['media', orgId] as const,
}

export const fetchers = {
  boxes: (orgId: string): Promise<BoxDto[]> => listBoxes(orgId),
  scanObjects: (orgId: string): Promise<ScanObjectDto[]> => listScanObjects(orgId),
  members: (orgId: string): Promise<MemberDto[]> => listMembers(orgId),
  media: (orgId: string): Promise<MediaDto[]> => listMedia(orgId),
  projects: (orgId: string): Promise<ProjectDto[]> => listProjects(orgId),
  experience: (projectId: string): Promise<ExperienceDto> => getExperience(projectId),
  scanTypes: async (orgId: string): Promise<ScanType[]> => scanTypesFrom(await listScanObjectTypes(orgId)),
  // Built from the boxes and each box's experiences, through their own keys, so the Publish page
  // and this share every request.
  installed: async (orgId: string): Promise<string[]> => {
    const boxes = await fetchQuery(keys.boxes(orgId), () => listBoxes(orgId))
    const lists = await Promise.all(
      boxes.map((b) => fetchQuery(keys.boxProjects(orgId, b.id), () => listBoxProjects(orgId, b.id))),
    )
    return Array.from(new Set(lists.flat().map((p) => p.id)))
  },
  commentCounts: async (orgId: string): Promise<Record<string, number>> =>
    Object.fromEntries((await listCommentCounts(orgId)).map((c) => [c.projectId, c.open])),
}

type Shared = keyof typeof fetchers
/** The cache key of a shared query that takes one id. */
const keyOf = (name: Shared, arg: string) => (keys[name] as (a: string) => QueryKey)(arg)

/** Subscribe to one of the shared queries; the getter returns null to wait (e.g. for an id). */
export function useShared<K extends Shared>(
  name: K,
  arg: () => string | null | undefined,
  options?: UseQueryOptions,
) {
  type T = Awaited<ReturnType<(typeof fetchers)[K]>>
  return useQuery<T>(
    () => {
      const a = arg()
      return a ? keyOf(name, a) : null
    },
    () => fetchers[name](arg() as string) as Promise<T>,
    options,
  )
}

/** Read one of the shared queries outside a component; throws on failure. */
export function fetchShared<K extends Shared>(name: K, arg: string, options?: { staleMs?: number }) {
  type T = Awaited<ReturnType<(typeof fetchers)[K]>>
  return fetchQuery<T>(keyOf(name, arg), () => fetchers[name](arg) as Promise<T>, options)
}

/** After a save: the document the backend returned is the one every view should now show. */
export function storeExperience(doc: ExperienceDto) {
  setQueryData(keys.experience(doc.projectId), doc)
}

export const invalidate = {
  /** A rename, create, delete or restore: the lists show names and dates. */
  projects: () => invalidateQueries('projects'),
  /** Installed on or taken off a Box. */
  installed: () => invalidateQueries('installed', 'box-projects'),
  /** A file uploaded to (or removed from) the media library. */
  media: () => invalidateQueries('media'),
  /** A comment posted, replied to, resolved or reopened. */
  commentCounts: () => invalidateQueries('comment-counts'),
}
