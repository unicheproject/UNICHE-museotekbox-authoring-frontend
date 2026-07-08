import { fetchAuthorization } from '@/api/museotekBox'
import { AuthorizationCache } from './cache'

export * from './types'
export { can } from './can'
export { AuthorizationCache } from './cache'
export type { AuthorizationFetcher, AuthorizationFetchResult } from './cache'

/** Shared, app-wide authorization cache wired to the Museotek Box Backend. */
export const authorizationCache = new AuthorizationCache(fetchAuthorization)
