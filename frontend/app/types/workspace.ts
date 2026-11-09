import type { TabId } from '../utils/workspace-routes'

export type Density = 'normal' | 'compact'
export interface WorkTab {
  id: TabId
  dirty: boolean
  panel: boolean
  panelWidth: number
}
export interface Workspace {
  tabs: WorkTab[]
  active: TabId
}

declare module '#app' {
  interface PageMeta {
    workspaceTab?: TabId
  }
}
declare module 'vue-router' {
  interface RouteMeta {
    workspaceTab?: TabId
  }
}
