export interface TableViewState {
  sortKey: string
  ascending: boolean
  page: number
}

export function createTableViewState(): TableViewState {
  return { sortKey: '', ascending: true, page: 1 }
}
