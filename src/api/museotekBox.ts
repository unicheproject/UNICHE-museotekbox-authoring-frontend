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

/**
 * The backend's error envelope (web/error/ErrorEnvelope): a machine `code` (e.g. `NOT_FOUND`,
 * `VALIDATION_ERROR`, `DUPLICATE_RFID_TAG`), a human `message`, per-field or per-rule `details`,
 * and the `requestId` of the call for tracing it in the backend logs.
 */
export interface ErrorEnvelope {
  code?: string
  message?: string
  details?: string[]
  requestId?: string | null
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
  /** References a scan object type. The backend has no endpoint that lists or names these types. */
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

// ─────────────────────────── Scan object types ───────────────────────────

/**
 * A kind of object the museum uses ("Red card", "Vase replica"). Rules and the start scene refer to
 * a type, not to one physical object: any object of that type triggers them.
 */
export interface ScanObjectTypeDto {
  id: number
  orgId: string
  name: string
}

export async function listScanObjectTypes(orgId: string): Promise<ScanObjectTypeDto[]> {
  const res = await http.get<ScanObjectTypeDto[]>(`/organisations/${orgId}/scan-object-types`)
  return res.data
}

// ─────────────────────────── Boxes ───────────────────────────

export interface BoxDto {
  id: number
  orgId: string
  name: string
  serialNumber: string
  /** `ONLINE` or `OFFLINE` (the backend's BoxStatus enum); read it through `boxOnline()`. */
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

/** The experiences installed on a box. */
export async function listBoxProjects(orgId: string, boxId: number): Promise<ProjectDto[]> {
  const res = await http.get<ProjectDto[]>(`/organisations/${orgId}/boxes/${boxId}/projects`)
  return res.data
}

/** Install an experience on a box (org managers only). */
export async function assignProjectToBox(orgId: string, boxId: number, projectId: string): Promise<void> {
  await http.put(`/organisations/${orgId}/boxes/${boxId}/projects/${projectId}`)
}

/** Take an experience off a box (org managers only). */
export async function unassignProjectFromBox(orgId: string, boxId: number, projectId: string): Promise<void> {
  await http.delete(`/organisations/${orgId}/boxes/${boxId}/projects/${projectId}`)
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
 *  cannot be set from here — the backend has no endpoint for it yet. */
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

// ─────────────────────────── Experience document ───────────────────────────
//
// An experience's content is ONE document: where it plays (output), the authoring screens' own
// source (flow), the variables, and the scenes, each with its own blocks and rules.
// GET /projects/{projectId}/experience reads it; PUT replaces it whole — the backend diffs the
// document against what it has, deleting anything left out, updating what it knows by key and
// inserting the rest, in one transaction.
//
// Writes are guarded by the document version: the PUT must carry `If-Match: "<version>"`. A stale
// version answers 409 with the CURRENT document as its body (not an error envelope); an invalid
// document answers 400 VALIDATION_ERROR with one line per problem in `details`.

export type BlockType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'QUIZ' | 'BUTTON' | 'TRUE_FALSE'
export const BLOCK_TYPES: BlockType[] = ['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'BUTTON', 'TRUE_FALSE']

/**
 * Rule model v2: when (trigger) … if (condition) … do (effects, in order) … then (destination).
 * Of the rules of a scene whose trigger matches, the first by position whose condition holds runs.
 */
export type TriggerType = 'SCAN' | 'SCAN_OTHER' | 'TIMER_ELAPSED' | 'VIDEO_ENDED' | 'SCENE_ENTERED' | 'SESSION_STARTED'
export type DestinationType = 'GO_TO' | 'STAY' | 'END'
export type ConditionType = 'VAR_CMP' | 'FLAG_IS'
export type ConditionOp = 'GTE' | 'LTE' | 'GT' | 'LT' | 'EQ' | 'NEQ'
export type EffectType = 'REPLY' | 'BOX_SCREEN' | 'BOX_AUDIO' | 'SET_NUMBER' | 'ADD_NUMBER' | 'SET_FLAG'
export type VariableKind = 'NUMBER' | 'FLAG'
/** Where the experience plays: chosen once, on the first save, and never changed afterwards. */
export type ExperienceOutput = 'DISPLAY' | 'BOX'

/** Any JSON value; a block's `content` is stored as-is in a jsonb column. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * Scene, block and rule keys are positive-integer strings with no leading zeros ("1", "27").
 * Each kind is unique across the whole document — not per scene — and a NEW key must be at least
 * the project's matching `next*Seq` counter. Use `createKeyAllocator` to mint them.
 */
export type ElementKey = string

export interface BlockDto {
  blockKey: ElementKey
  type: BlockType
  position: number
  content: JsonValue
}

export interface TriggerDto {
  type: TriggerType
  /** SCAN only: the object type whose placing fires the rule. */
  scanObjectTypeId?: number | null
  /** TIMER_ELAPSED only, > 0. */
  seconds?: number | null
}

/** VAR_CMP compares a NUMBER variable (`op`, integer `value`); FLAG_IS tests a FLAG ("true"/"false"). */
export interface ConditionDto {
  type: ConditionType
  variable: string
  op?: ConditionOp | null
  value: string
}

/** Each type uses only some fields; values travel as strings, `amount` as a number. */
export interface EffectDto {
  type: EffectType
  variable?: string | null
  value?: string | null
  amount?: number | null
  color?: string | null
  text?: string | null
  media?: string | null
  audio?: string | null
  boxVideo?: string | null
  url?: string | null
}

export interface DestinationDto {
  type: DestinationType
  /** GO_TO only: any scene of the document. */
  targetSceneKey?: ElementKey | null
}

export interface RuleDto {
  ruleKey: ElementKey
  position: number
  trigger: TriggerDto
  condition: ConditionDto | null
  effects: EffectDto[]
  destination: DestinationDto
}

export interface SceneDto {
  sceneKey: ElementKey
  name: string
  position: number
  /** Exactly one scene of the document must be the start scene. */
  isStart: boolean
  /** The object type that starts the experience at this scene (a scan object type id). */
  initCardTypeId: number | null
  blocks: BlockDto[]
  rules: RuleDto[]
}

/** A number or flag the experience keeps while a visitor plays; `initial` is "0", "true"… */
export interface VariableDto {
  key: string
  kind: VariableKind
  initial: string
}

/**
 * The curator's own source for the experience (what the authoring screens built), stored as-is.
 * The backend reads only `schemaVersion`.
 */
export interface FlowDto {
  schemaVersion: number
  content: { [key: string]: JsonValue }
}

export interface ExperienceDto {
  projectId: string
  /** Echo this back as If-Match on the next save. */
  version: number
  nextSceneSeq: number
  nextBlockSeq: number
  nextRuleSeq: number
  /** Null until the first save. */
  output: ExperienceOutput | null
  /** Null until the first save. */
  flow: FlowDto | null
  variables: VariableDto[]
  scenes: SceneDto[]
}

/** What a save sends: everything but the version (it travels in If-Match) and the counters. */
export interface ExperienceWriteRequest {
  output: ExperienceOutput
  flow: FlowDto
  variables: VariableDto[]
  scenes: SceneDto[]
}

/**
 * Normalises a scene off the wire. The Java record component is `isStart`; depending on how
 * Jackson names a record's boolean `is…` accessor, the response can spell it `isStart` or `start`,
 * so both are read. Requests always send `isStart`, which is what the backend binds.
 */
function sceneFromWire(raw: SceneDto & { start?: boolean }): SceneDto {
  const { start, ...scene } = raw
  return {
    ...scene,
    isStart: raw.isStart ?? start ?? false,
    blocks: raw.blocks ?? [],
    rules: raw.rules ?? [],
  }
}

function experienceFromWire(raw: ExperienceDto): ExperienceDto {
  return {
    ...raw,
    output: raw.output ?? null,
    flow: raw.flow ?? null,
    variables: raw.variables ?? [],
    scenes: (raw.scenes ?? []).map(sceneFromWire),
  }
}

/** The quoted entity tag the backend expects in If-Match for a given version. */
export function versionTag(version: number): string {
  return `"${version}"`
}

/** Read a project's whole experience document. A new project has `output` and `flow` null and `scenes: []`. */
export async function getExperience(projectId: string): Promise<ExperienceDto> {
  const res = await http.get<ExperienceDto>(`/projects/${projectId}/experience`)
  return experienceFromWire(res.data)
}

/**
 * Thrown by `saveExperience` when someone else saved first (409). Carries the document as it is
 * now on the server, so the caller can show it or merge onto it and retry with its version.
 */
export class StaleExperienceError extends Error {
  constructor(public readonly current: ExperienceDto) {
    super('This experience was changed by someone else since it was opened.')
    this.name = 'StaleExperienceError'
  }
}

/**
 * Replace a project's experience document. `version` is the one the edit was based on — the
 * `version` of the last GET or save. Resolves to the saved document with its new version and
 * advanced counters. Rejects with `StaleExperienceError` on 409; a 400 with the validator's
 * messages is left as the axios error, which `describeError` turns into text.
 */
export async function saveExperience(
  projectId: string,
  version: number,
  body: ExperienceWriteRequest,
): Promise<ExperienceDto> {
  try {
    const res = await http.put<ExperienceDto>(`/projects/${projectId}/experience`, body, {
      headers: { 'If-Match': versionTag(version) },
    })
    return experienceFromWire(res.data)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409 && error.response.data) {
      throw new StaleExperienceError(experienceFromWire(error.response.data as ExperienceDto))
    }
    throw error
  }
}

export interface KeyAllocator {
  sceneKey(): ElementKey
  blockKey(): ElementKey
  ruleKey(): ElementKey
}

/**
 * Mints fresh scene/block/rule keys for new elements, starting from the document's counters and
 * never going below a key already in the document. Allocate from the document the edit is based
 * on; after a save, make a new allocator from the returned document.
 */
export function createKeyAllocator(experience: ExperienceDto): KeyAllocator {
  const highest = (keys: string[]) => keys.reduce((max, k) => Math.max(max, Number.parseInt(k, 10) || 0), 0)
  const scenes = experience.scenes
  let scene = Math.max(experience.nextSceneSeq, highest(scenes.map((s) => s.sceneKey)) + 1)
  let block = Math.max(
    experience.nextBlockSeq,
    highest(scenes.flatMap((s) => s.blocks.map((b) => b.blockKey))) + 1,
  )
  let rule = Math.max(
    experience.nextRuleSeq,
    highest(scenes.flatMap((s) => s.rules.map((r) => r.ruleKey))) + 1,
  )
  return {
    sceneKey: () => String(scene++),
    blockKey: () => String(block++),
    ruleKey: () => String(rule++),
  }
}

// ─────────────────────────── Media library ───────────────────────────
//
// An organisation's pictures, videos and sounds, uploaded once and used in any of its experiences.
// The experience document refers to an item by its id: a block's `content.mediaId`, and a reply's
// `media` (IMAGE), `audio` (AUDIO), `boxVideo` (VIDEO) or a BOX_AUDIO effect's `url` (AUDIO). The
// save is refused (400) for an id that is not in the org's library or is the wrong kind.

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO'

/** The content types each kind accepts; anything else answers 415. */
export const MEDIA_TYPES: Record<MediaKind, string[]> = {
  IMAGE: ['image/png', 'image/jpeg', 'image/webp'],
  VIDEO: ['video/mp4'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
}

export interface MediaDto {
  id: string
  kind: MediaKind
  /** The file's original name. */
  name: string
  contentType: string
  sizeBytes: number
  /** A path on the backend (context path included); needs the bearer token like every call. */
  contentUrl: string
  uploadedAt: string
}

/** Newest first; `kind` narrows the list to one kind. */
export async function listMedia(orgId: string, kind?: MediaKind): Promise<MediaDto[]> {
  const res = await http.get<MediaDto[]>(`/organisations/${orgId}/media`, { params: kind ? { kind } : undefined })
  return res.data
}

/** Upload one file; `onProgress` gets 0–100. 413 if it is too large, 415 if its type isn't allowed. */
export async function uploadMedia(orgId: string, file: File, onProgress?: (percent: number) => void): Promise<MediaDto> {
  const form = new FormData()
  form.append('file', file)
  const res = await http.post<MediaDto>(`/organisations/${orgId}/media`, form, {
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })
  return res.data
}

/** 409 MEDIA_IN_USE while any experience still uses it. */
export async function deleteMedia(orgId: string, mediaId: string): Promise<void> {
  await http.delete(`/organisations/${orgId}/media/${mediaId}`)
}

/**
 * The file itself, as a Blob. The content endpoint needs the bearer token, so the browser can't
 * load it straight from an <img src>; callers turn the Blob into an object URL.
 */
export async function getMediaContent(orgId: string, mediaId: string): Promise<Blob> {
  const res = await http.get<Blob>(`/organisations/${orgId}/media/${mediaId}/content`, { responseType: 'blob' })
  return res.data
}

// ─────────────────────────── Comments ───────────────────────────
//
// Comments left on an experience, in threads with one level of replies. A thread's first comment
// carries what it is about (a screen and a step of the flow, stored as given) and whether it is
// resolved; replies hang under it.

/** A reply, as shown under its thread. */
export interface CommentDto {
  id: string
  body: string
  authorName: string
  createdAt: string
}

/** A thread: its first comment, what it is about, whether it is resolved, and its replies. */
export interface CommentThreadDto extends CommentDto {
  sceneKey: string | null
  stepKey: string | null
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  replies: CommentDto[]
}

/** Open threads first, then resolved, each oldest first. */
export async function listComments(projectId: string): Promise<CommentThreadDto[]> {
  const res = await http.get<CommentThreadDto[]>(`/projects/${projectId}/comments`, { params: { status: 'all' } })
  return res.data
}

/** Start a thread about a screen and a step. Body up to 2000 characters. */
export async function addComment(
  projectId: string,
  body: { body: string; sceneKey: string | null; stepKey: string | null },
): Promise<CommentThreadDto> {
  const res = await http.post<CommentThreadDto>(`/projects/${projectId}/comments`, body)
  return res.data
}

/** Reply to a thread's first comment. */
export async function replyToComment(projectId: string, commentId: string, body: string): Promise<CommentDto> {
  const res = await http.post<CommentDto>(`/projects/${projectId}/comments/${commentId}/replies`, { body })
  return res.data
}

/** Resolve a thread, or reopen it with `false`. */
export async function setCommentResolved(projectId: string, commentId: string, resolved: boolean): Promise<CommentThreadDto> {
  const res = await http.patch<CommentThreadDto>(`/projects/${projectId}/comments/${commentId}`, { resolved })
  return res.data
}
