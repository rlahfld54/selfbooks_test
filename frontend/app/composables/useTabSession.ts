import { reactive } from 'vue'
import type { WorkTab } from '~/types/workspace'

// The tab object owns the lifetime. Unmounting a page does not discard its inputs;
// closing a tab or replacing the company releases the key and its session.
export function defineTabSession<T extends object>(create: () => T) {
  const sessions = new WeakMap<WorkTab, T>()
  return (tab: WorkTab): T => {
    let state = sessions.get(tab)
    if (!state) {
      state = reactive(create()) as T
      sessions.set(tab, state)
    }
    return state
  }
}

