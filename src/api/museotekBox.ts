import axios, { type AxiosInstance } from 'axios'
import { config } from '@/config'
import { getToken, login } from '@/platform/auth'
import type { AuthorizationContext } from '@/platform/authz/types'
import type { AuthorizationFetchResult } from '@/platform/authz/cache'

/**
 * Typed Museotek Box Backend client. Attaches the bearer token and re-logs-in on 401.
 * This is the ONLY backend this frontend talks to — it never calls the Catalogue directly.
 */
const http: AxiosInstance = axios.create({ baseURL: `${config.backendUrl}/museotekbox/api/v1` })

http.interceptors.request.use(async (req) => {
  const token = await getToken()
  if (token) {
    req.headers.Authorization = `Bearer ${token}`
  }
  return req
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Token rejected (expired/invalid) — bounce through the IdP again.
      login(window.location.pathname)
    }
    return Promise.reject(error)
  },
)

export async function fetchAuthorization(etag?: string): Promise<AuthorizationFetchResult> {
  const res = await http.get<AuthorizationContext>('/me/authorization', {
    headers: etag ? { 'If-None-Match': etag } : undefined,
    validateStatus: (s) => s === 200 || s === 304,
  })
  return {
    status: res.status,
    data: res.status === 200 ? res.data : undefined,
    etag: res.headers['etag'],
  }
}

export interface OrganisationDto {
  id: string
  name: string
  slug: string
  status: string
}

export async function getOrganisation(orgId: string): Promise<OrganisationDto> {
  const res = await http.get<OrganisationDto>(`/organisations/${orgId}`)
  return res.data
}

/** A project ("Experience" in the UI) belongs to exactly one organisation and one tool. */
export interface ProjectDto {
  id: string
  orgId: string
  name: string
  slug: string
  status: string
  toolSlug: string
  /** ISO timestamps. Optional so the type still describes older backend builds that omit them. */
  createdAt?: string
  updatedAt?: string
}

export interface CreateProjectRequest {
  name: string
  slug: string
}

export interface UpdateProjectRequest {
  name: string
}

export async function listProjects(orgId: string): Promise<ProjectDto[]> {
  const res = await http.get<ProjectDto[]>(`/organisations/${orgId}/projects`)
  return res.data
}

export async function createProject(orgId: string, body: CreateProjectRequest): Promise<ProjectDto> {
  const res = await http.post<ProjectDto>(`/organisations/${orgId}/projects`, body)
  return res.data
}

export async function getProject(projectId: string): Promise<ProjectDto> {
  const res = await http.get<ProjectDto>(`/projects/${projectId}`)
  return res.data
}

/** Edit an experience's name (manager-of-org or admin); slug and tool are immutable. */
export async function updateProject(projectId: string, body: UpdateProjectRequest): Promise<ProjectDto> {
  const res = await http.patch<ProjectDto>(`/projects/${projectId}`, body)
  return res.data
}

/** Soft-delete an experience (manager-of-org or admin). */
export async function deleteProject(projectId: string): Promise<void> {
  await http.delete(`/projects/${projectId}`)
}

/** Soft-deleted experiences in an organisation awaiting restore (platform admin only). */
export async function listDeletedProjects(orgId: string): Promise<ProjectDto[]> {
  const res = await http.get<ProjectDto[]>(`/organisations/${orgId}/projects/deleted`)
  return res.data
}

/** Restore a soft-deleted experience (platform admin only). */
export async function restoreProject(projectId: string): Promise<ProjectDto> {
  const res = await http.post<ProjectDto>(`/projects/${projectId}/restore`)
  return res.data
}

/** The backend's error envelope (web/error/ErrorEnvelope): code + message + per-field details. */
interface ErrorEnvelope {
  code?: string
  message?: string
  details?: string[]
}

/** HTTP status of a failed request, or undefined if it never reached the backend. */
export function errorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}

/**
 * Turn an axios/backend error into a human message. The backend returns an envelope of
 * `{ code, message, details[] }`; prefer the field-level `details`, then `message`, then a
 * status-based fallback for the cases (401/403) that have no useful body.
 */
export function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ErrorEnvelope | undefined
    if (body?.details?.length) return body.details.join('; ')
    if (body?.message) return body.message
    if (error.response?.status === 403) return 'You are not allowed to do that.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}

// ─────────────────────────── Scan objects ───────────────────────────

/**
 * The four concrete kinds of scan object. The backend exposes a create/update endpoint per kind
 * (`…/scan-objects/coloured-cards`, `…/drafts`, …) and reports the kind back on the response as a
 * plain string with no documented vocabulary — so `resolveScanObjectKind` below recovers it
 * defensively rather than trusting an exact spelling.
 */
export type ScanObjectKind = 'COLOURED_CARD' | 'PRINTED_IMAGE' | 'THREE_D_PRINTED_OBJECT' | 'DRAFT'

/** Fixed palette of the coloured card, per the backend enum. */
export type CardColour = 'RED' | 'GREEN' | 'YELLOW' | 'WHITE'

export const CARD_COLOURS: CardColour[] = ['RED', 'GREEN', 'YELLOW', 'WHITE']

export interface ScanObjectDto {
  id: number
  orgId: string
  /** References a scan object type. There is no endpoint to list types yet — see docs/BACKEND-GAPS.md. */
  scanObjectTypeId: number | null
  name: string
  rfidTag: string | null
  reusable: boolean
  kind: string
  /** Coloured cards only. */
  colour: CardColour | null
  /** Printed images only — a reference, not an upload. */
  imageUrl: string | null
  /** 3D printed objects only — a reference, not an upload. */
  modelRef: string | null
}

/** Fields every kind accepts. */
export interface ScanObjectBaseRequest {
  name: string
  rfidTag: string | null
  reusable: boolean
  scanObjectTypeId: number | null
}

export interface ColouredCardRequest extends ScanObjectBaseRequest {
  colour: CardColour
}

export interface PrintedImageRequest extends ScanObjectBaseRequest {
  imageUrl: string | null
}

export interface ThreeDPrintedObjectRequest extends ScanObjectBaseRequest {
  modelRef: string | null
}

export type DraftRequest = ScanObjectBaseRequest

export type ScanObjectRequest =
  | ColouredCardRequest
  | PrintedImageRequest
  | ThreeDPrintedObjectRequest
  | DraftRequest

/** URL segment per kind — the path is the only thing that distinguishes the four endpoints. */
const KIND_SEGMENT: Record<ScanObjectKind, string> = {
  COLOURED_CARD: 'coloured-cards',
  PRINTED_IMAGE: 'printed-images',
  THREE_D_PRINTED_OBJECT: 'three-d-printed-objects',
  DRAFT: 'drafts',
}

export const SCAN_OBJECT_KINDS = Object.keys(KIND_SEGMENT) as ScanObjectKind[]

/** Human labels; the backend ships no display names. */
export const KIND_LABEL: Record<ScanObjectKind, string> = {
  COLOURED_CARD: 'Coloured card',
  PRINTED_IMAGE: 'Printed image',
  THREE_D_PRINTED_OBJECT: '3D printed object',
  DRAFT: 'Draft',
}

/**
 * Recover a kind from the free-text `kind` the backend reports.
 *
 * The value is undocumented, so matching is done on letters only — `COLOURED_CARD`,
 * `ColouredCard` and `coloured-card` all collapse to the same token — and both the British and
 * American spellings of "colour" are accepted. An unrecognised value yields `null`, which the UI
 * shows as-is rather than guessing an endpoint and writing to the wrong kind.
 */
export function resolveScanObjectKind(kind: string | null | undefined): ScanObjectKind | null {
  const token = (kind ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!token) return null
  if (token.includes('COLOUREDCARD') || token.includes('COLOREDCARD') || token === 'CARD') {
    return 'COLOURED_CARD'
  }
  if (token.includes('PRINTEDIMAGE') || token === 'IMAGE') return 'PRINTED_IMAGE'
  // Check the 3D kind before the generic "printed" fallbacks: its name contains "PRINTED" too.
  if (token.includes('THREED') || token.includes('3D') || token.includes('MODEL')) {
    return 'THREE_D_PRINTED_OBJECT'
  }
  if (token.includes('DRAFT')) return 'DRAFT'
  return null
}

export function scanObjectKindSegment(kind: ScanObjectKind): string {
  return KIND_SEGMENT[kind]
}

export async function listScanObjects(orgId: string): Promise<ScanObjectDto[]> {
  const res = await http.get<ScanObjectDto[]>(`/organisations/${orgId}/scan-objects`)
  return res.data
}

export async function getScanObject(orgId: string, id: number): Promise<ScanObjectDto> {
  const res = await http.get<ScanObjectDto>(`/organisations/${orgId}/scan-objects/${id}`)
  return res.data
}

export async function createScanObject(
  orgId: string,
  kind: ScanObjectKind,
  body: ScanObjectRequest,
): Promise<ScanObjectDto> {
  const res = await http.post<ScanObjectDto>(
    `/organisations/${orgId}/scan-objects/${KIND_SEGMENT[kind]}`,
    body,
  )
  return res.data
}

/**
 * Update a scan object through its own kind's endpoint.
 *
 * Callers send the object's COMPLETE field set, not just what changed: the PATCH bodies carry
 * every field, and it is not documented whether an omitted or null field is ignored or applied —
 * sending the full set means the outcome is the same either way.
 */
export async function updateScanObject(
  orgId: string,
  kind: ScanObjectKind,
  id: number,
  body: ScanObjectRequest,
): Promise<ScanObjectDto> {
  const res = await http.patch<ScanObjectDto>(
    `/organisations/${orgId}/scan-objects/${KIND_SEGMENT[kind]}/${id}`,
    body,
  )
  return res.data
}

export async function deleteScanObject(orgId: string, id: number): Promise<void> {
  await http.delete(`/organisations/${orgId}/scan-objects/${id}`)
}

// ─────────────────────────── Boxes ───────────────────────────

export interface BoxDto {
  id: number
  orgId: string
  name: string
  serialNumber: string
  /** Free-text on the backend; `boxOnline()` decides what counts as online. */
  status: string
  /** The experience the box is currently running, if any. */
  currentProjectId: string | null
}

export interface BoxRequest {
  name: string
  serialNumber: string
}

/**
 * The box `status` is an undocumented string, so treat anything that reads as "online" as online
 * and everything else — including an empty value — as not online. Never invent a third state.
 */
export function boxOnline(status: string | null | undefined): boolean {
  return (status ?? '').toUpperCase().replace(/[^A-Z]/g, '') === 'ONLINE'
}

export async function listBoxes(orgId: string): Promise<BoxDto[]> {
  const res = await http.get<BoxDto[]>(`/organisations/${orgId}/boxes`)
  return res.data
}

export async function getBox(orgId: string, boxId: number): Promise<BoxDto> {
  const res = await http.get<BoxDto>(`/organisations/${orgId}/boxes/${boxId}`)
  return res.data
}

export async function createBox(orgId: string, body: BoxRequest): Promise<BoxDto> {
  const res = await http.post<BoxDto>(`/organisations/${orgId}/boxes`, body)
  return res.data
}

/** Name and serial only: UpdateBoxRequest carries nothing else, so the running experience
 *  cannot be set from here yet (see docs/BACKEND-GAPS.md). */
export async function updateBox(orgId: string, boxId: number, body: BoxRequest): Promise<BoxDto> {
  const res = await http.patch<BoxDto>(`/organisations/${orgId}/boxes/${boxId}`, body)
  return res.data
}

export async function deleteBox(orgId: string, boxId: number): Promise<void> {
  await http.delete(`/organisations/${orgId}/boxes/${boxId}`)
}

/**
 * Organisation members, as returned by GET /organisations/{orgId}/members. `displayName` and
 * `email` come from the IdP profile, so either can be missing for an account that has never signed
 * in; `since` is the ISO instant the person joined the organisation.
 */
export interface MemberDto {
  /** Null for a person who exists only as an invitation/local row and has no IdP account yet. */
  userId: string | null
  email: string | null
  displayName: string | null
  role: string | null
  since: string | null
}

export async function listMembers(orgId: string): Promise<MemberDto[]> {
  const res = await http.get<MemberDto[]>(`/organisations/${orgId}/members`)
  return res.data
}
