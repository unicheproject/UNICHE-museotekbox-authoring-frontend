import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * True once the element has come near the screen, and stays true. For work a list item only needs
 * when it can be seen — a card in a long grid loads its details as the user scrolls to it.
 */
export function useVisible(el: Ref<unknown>, rootMargin = '200px'): Ref<boolean> {
  const visible = ref(false)
  if (typeof IntersectionObserver === 'undefined') {
    visible.value = true
    return visible
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible.value = true
        observer.disconnect()
      }
    },
    { rootMargin },
  )
  const stop = watch(
    el,
    (now) => {
      observer.disconnect()
      // An element, or a component (a RouterLink) whose root element is `$el`.
      const node = now instanceof Element ? now : (now as { $el?: unknown } | null)?.$el
      if (node instanceof Element && !visible.value) observer.observe(node)
    },
    { immediate: true, flush: 'post' },
  )
  onScopeDispose(() => {
    stop()
    observer.disconnect()
  })
  return visible
}
