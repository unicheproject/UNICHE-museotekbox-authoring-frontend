import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authorizationCache, can as evaluate } from '@/platform/authz'
import type { AuthorizationContext, ResourceRef } from '@/platform/authz/types'

export const useAuthzStore = defineStore('authz', () => {
  const context = ref<AuthorizationContext | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(force = false): Promise<void> {
    loading.value = true
    error.value = null
    try {
      context.value = await authorizationCache.get(force)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load authorization'
    } finally {
      loading.value = false
    }
  }

  /** Invalidate the cache and reload — e.g. after creating/restoring an experience. */
  async function refresh(): Promise<void> {
    authorizationCache.invalidate()
    await load(true)
  }

  function can(action: string, ref?: ResourceRef): boolean {
    return evaluate(context.value, action, ref)
  }

  return { context, loading, error, load, refresh, can }
})
