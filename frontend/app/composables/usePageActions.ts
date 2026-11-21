import type { InjectionKey, ShallowRef, Slots } from 'vue'

// The active page supplies its actions while the workspace owns their position.
export const pageActionsKey: InjectionKey<ShallowRef<Slots | null>> = Symbol('page-actions')
