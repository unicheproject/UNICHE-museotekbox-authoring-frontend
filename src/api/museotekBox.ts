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
