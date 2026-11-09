export function useMobileWorkspace() {
  const mobileOpen = ref(false)
  const narrow = ref(false)
  const sidebar = ref<HTMLElement>()
  let media: MediaQueryList | undefined
  let mobileMedia: MediaQueryList | undefined
  function updateNarrow() { narrow.value = media?.matches ?? false }
  function updateMobile() { if (!mobileMedia?.matches) mobileOpen.value = false }
  function keydown(event: KeyboardEvent) {
    if (!mobileOpen.value || document.querySelector('dialog[open]')) return
    if (event.key === 'Escape') mobileOpen.value = false
    if (event.key !== 'Tab') return
    const items = [...(sidebar.value?.querySelectorAll<HTMLElement>('a, button') ?? [])]
      .filter(item => item.getClientRects().length > 0)
    const first = items[0], last = items.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
  watch(mobileOpen, async value => {
    await nextTick()
    if (value) sidebar.value?.querySelector<HTMLElement>('.brand')?.focus()
    else document.querySelector<HTMLElement>('.mobile-toggle')?.focus()
  })
  onMounted(() => {
    media = matchMedia('(max-width: 1023px)')
    mobileMedia = matchMedia('(max-width: 767px)')
    updateNarrow()
    media.addEventListener('change', updateNarrow)
    mobileMedia.addEventListener('change', updateMobile)
    document.addEventListener('keydown', keydown)
  })
  onBeforeUnmount(() => {
    media?.removeEventListener('change', updateNarrow)
    mobileMedia?.removeEventListener('change', updateMobile)
    document.removeEventListener('keydown', keydown)
  })
  return { mobileOpen, narrow, sidebar }
}
