// 공개 미리보기 · 스크래핑 서버 연결 전 — 브라우저 안에서 홈택스 자료수집을 흉내 낸다.
// 회사는 수임업체관리 샘플(수임 중)과 같다. 실제 홈택스에는 접속하지 않는다.
//
// 팀장님 스크랩 서버 규칙을 그대로 흉내 낸다:
//   · 로그인이 필요 없는 사업자 상태조회는 먼저, 홈택스 로그인이 실패하면 남은 종류는 건너뛴다
//   · 응답에 warning 이 붙은 0건은 「자료 없음」이 아니라 건너뜀이다
//   · 같은 회사를 동시에 두 번 수집하지 않는다
import { clients } from '../../management/data.ts'
import { COLLECTION_KINDS, type CellStatus, type CollectedRow, type CollectionCompany, type CollectionHistoryItem, type CollectionRun, type CollectionRunItem, type RowsQuery, type StartRunInput } from '../types.ts'
import { inPeriod, isoDay } from '../logic.ts'
import { sampleRows } from './sampleRows.ts'

export interface PreviewOptions {
  /** 한 종류를 수집하는 데 걸리는 시간 (테스트는 0) */
  stepMs?: (item: CollectionRunItem) => number
  today?: () => Date
  /** 동시에 수집하는 회사 수 */
  parallel?: number
  /** 이력에 남는 요청자 이름 */
  requester?: string
}

/** 회사마다 다른 결과를 보이려는 샘플 시나리오 */
const NO_CREDENTIALS = new Set(['C003'])
/** 샘플 홈택스 아이디 — 가상의 값이다 */
const sampleHometaxId = (clientId: string) => NO_CREDENTIALS.has(clientId) ? null : 'sample_' + clientId.toLowerCase()
const WARNING_KINDS: Record<string, string[]> = { C008: ['invoice'] }

type Seed = Partial<Record<string, [CellStatus, string]>>
const SEEDS: Record<string, Seed> = {
  C001: Object.fromEntries(COLLECTION_KINDS.map(kind => [kind.type, ['done', '2026-11-13']])),
  C002: Object.fromEntries(COLLECTION_KINDS.map(kind => [kind.type, ['done', '2026-11-13']])),
  C004: Object.fromEntries(COLLECTION_KINDS.map(kind => [kind.type, ['done', kind.flow === 'purchase' ? '2026-11-12' : '2026-11-13']])),
  C006: { bizinfo: ['done', '2026-11-10'], tax: ['done', '2026-11-10'], ptax: ['done', '2026-11-10'], pcard: ['failed', '2026-11-10'] },
  C008: { ...Object.fromEntries(COLLECTION_KINDS.map(kind => [kind.type, ['done', '2026-11-12']])), invoice: ['skipped', '2026-11-12'] },
}

const LOGIN_FREE = new Set(['bizinfo'])
const copy = <T>(value: T): T => structuredClone(value)

function companyRows(index: number) {
  return sampleRows.filter((_, i) => (i + index) % 4 !== 0)
}

export function createPreviewCollectionService(options: PreviewOptions = {}) {
  const stepMs = options.stepMs ?? ((item: CollectionRunItem) => 380 + ((item.id.length * 7 + item.kind.length * 53) % 5) * 140)
  const today = () => isoDay(options.today?.() ?? new Date())
  const parallel = options.parallel ?? 2
  const active = clients.filter(client => client.status === '수임 중')

  const companies: CollectionCompany[] = active.map((client, index) => {
    const seed = SEEDS[client.id] ?? {}
    const rows = companyRows(index)
    return {
      clientId: client.id,
      name: client.name,
      bizNo: client.biz,
      ceo: client.ceo,
      manager: client.primary,
      hometaxReady: !NO_CREDENTIALS.has(client.id),
      hometaxId: sampleHometaxId(client.id),
      cells: Object.fromEntries(COLLECTION_KINDS.map((kind) => {
        const [status, collectedAt] = seed[kind.type] ?? ['none', '']
        const count = kind.type === 'bizinfo' ? null : rows.filter(row => row.kind === kind.type).length
        const message = status === 'failed' ? '홈택스 응답 시간이 초과되었습니다.' : status === 'skipped' ? '권한 부족으로 건너뜀 (자료 없음과 다름)' : kind.type === 'bizinfo' && status === 'done' ? '계속사업자' : undefined
        return [kind.type, { kind: kind.type, status, collectedAt: collectedAt || null, count: status === 'done' ? count : null, ...(message ? { message } : {}) }]
      })),
    }
  })

  const requester = options.requester ?? '김원지'
  const stamp = (date: Date) => isoDay(date) + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')

  /* 자료수집 이력 — 씨드 칸마다 지난 요청 1건을 남겨 둔다(가장 최근 것이 위) */
  const history: CollectionHistoryItem[] = []
  for (const company of companies) {
    for (const cell of Object.values(company.cells)) {
      if (cell.status === 'none' || !cell.collectedAt) { continue }
      history.push({
        id: 'seed:' + company.clientId + ':' + cell.kind, clientId: company.clientId, kind: cell.kind,
        from: cell.kind === 'bizinfo' ? cell.collectedAt : cell.collectedAt.slice(0, 4) + '-01-01', to: cell.collectedAt,
        loginType: 'idpw', status: cell.status as CollectionHistoryItem['status'], count: cell.count, requester,
        requestedAt: cell.collectedAt + ' 09:30', finishedAt: cell.status === 'done' ? cell.collectedAt + ' 09:31' : null,
        message: cell.status === 'done' ? '' : cell.message ?? '',
      })
    }
  }
  function record(run: CollectionRun, item: CollectionRunItem) {
    if (item.status === 'waiting' || item.status === 'running') { return }
    const started = new Date(Date.parse(run.startedAt))
    history.unshift({
      id: item.id + ':' + history.length, clientId: item.clientId, kind: item.kind,
      from: item.kind === 'bizinfo' ? today() : run.from, to: item.kind === 'bizinfo' ? today() : run.to,
      loginType: 'idpw', status: item.status, count: item.count, requester,
      requestedAt: stamp(started), finishedAt: item.status === 'done' ? stamp(new Date()) : null,
      message: item.status === 'done' ? '' : item.message,
    })
  }

  const runs = new Map<string, CollectionRun>()
  const busy = new Set<string>()
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let sequence = 0

  const wait = (ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(() => { timers.delete(timer); resolve() }, ms)
    timers.add(timer)
  })

  function finishCell(item: CollectionRunItem) {
    const run = runs.get(item.id.split(':')[0]!)
    if (run) { record(run, item) }
    const company = companies.find(row => row.clientId === item.clientId)
    if (!company) { return }
    const cell = company.cells[item.kind]!
    if (item.status === 'done') { Object.assign(cell, { status: 'done', collectedAt: today(), count: item.count, message: item.kind === 'bizinfo' ? '계속사업자' : undefined }) }
    else { Object.assign(cell, { status: item.status, collectedAt: today(), message: item.message }) }
  }

  /** 한 종류 수집 — 로그인 실패면 true 를 돌려 남은 종류를 건너뛰게 한다 */
  async function collect(item: CollectionRunItem, index: number) {
    item.status = 'running'
    const started = Date.now()
    await wait(stepMs(item))
    item.durationMs = Date.now() - started
    if (!LOGIN_FREE.has(item.kind) && NO_CREDENTIALS.has(item.clientId)) {
      Object.assign(item, { status: 'failed', code: 'NO_CREDENTIALS', message: '홈택스 아이디·비밀번호가 등록되어 있지 않습니다. (회사등록 > 홈택스 정보)' })
      finishCell(item)
      return true
    }
    if (WARNING_KINDS[item.clientId]?.includes(item.kind)) {
      Object.assign(item, { status: 'skipped', message: '권한 부족으로 건너뜀 (자료 없음과 다름)' })
      finishCell(item)
      return false
    }
    const count = item.kind === 'bizinfo' ? null : companyRows(index).filter(row => row.kind === item.kind).length
    Object.assign(item, { status: 'done', count, message: item.kind === 'bizinfo' ? '계속사업자' : count + '건 저장' })
    finishCell(item)
    return false
  }

  async function collectCompany(run: CollectionRun, clientId: string) {
    const index = companies.findIndex(company => company.clientId === clientId)
    const items = run.items.filter(item => item.clientId === clientId && item.status === 'waiting')
    busy.add(clientId)
    try {
      let loginFailed = false
      for (const item of items) {
        if (item.status === 'cancelled') { continue }
        if (loginFailed && !LOGIN_FREE.has(item.kind)) {
          Object.assign(item, { status: 'skipped', message: '이전 작업 인증 실패로 건너뜀' })
          finishCell(item)
          continue
        }
        if (await collect(item, index)) { loginFailed = true }
      }
    }
    finally {
      busy.delete(clientId)
    }
  }

  async function runQueue(run: CollectionRun, clientIds: string[]) {
    const queue = [...clientIds]
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) { await collectCompany(run, next) }
    }
    await Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, worker))
    if (run.items.every(item => item.status !== 'waiting' && item.status !== 'running')) { run.finishedAt ??= new Date().toISOString() }
  }

  return {
    async status(signal?: AbortSignal) {
      signal?.throwIfAborted()
      return { data: { companies: copy(companies), sample: true } }
    },
    async start(input: StartRunInput) {
      const known = input.clientIds.filter(id => companies.some(company => company.clientId === id))
      const kinds = COLLECTION_KINDS.filter(kind => input.kinds.includes(kind.type))
      if (!known.length || !kinds.length) { throw new Error('수집할 사업체와 자료를 하나 이상 골라 주세요.') }
      const run: CollectionRun = { id: 'preview-run-' + ++sequence, from: input.from, to: input.to, startedAt: new Date().toISOString(), finishedAt: null, items: [] }
      for (const clientId of known) {
        const company = companies.find(row => row.clientId === clientId)!
        for (const kind of kinds) {
          run.items.push({
            id: run.id + ':' + clientId + ':' + kind.type, clientId, clientName: company.name, kind: kind.type,
            status: busy.has(clientId) ? 'skipped' : 'waiting',
            message: busy.has(clientId) ? '이미 수집 중인 사업체입니다.' : '', count: null, durationMs: null,
          })
        }
      }
      runs.set(run.id, run)
      void runQueue(run, known.filter(id => !busy.has(id)))
      return { data: copy(run) }
    },
    async run(id: string, signal?: AbortSignal) {
      signal?.throwIfAborted()
      const run = runs.get(id)
      if (!run) { throw new Error('작업을 찾을 수 없습니다.') }
      return { data: copy(run) }
    },
    async retry(runId: string, itemId: string) {
      const run = runs.get(runId)
      const item = run?.items.find(row => row.id === itemId)
      if (!run || !item) { throw new Error('작업을 찾을 수 없습니다.') }
      if (item.status !== 'failed' || item.code === 'ACCOUNT_LOCKED') { throw new Error('다시 시도할 수 없는 작업입니다.') }
      if (busy.has(item.clientId)) { throw new Error('이미 수집 중인 사업체입니다.') }
      Object.assign(item, { status: 'waiting', message: '', code: undefined, durationMs: null })
      run.finishedAt = null
      void runQueue(run, [item.clientId])
      return { data: copy(run) }
    },
    async cancel(runId: string) {
      const run = runs.get(runId)
      if (!run) { throw new Error('작업을 찾을 수 없습니다.') }
      for (const item of run.items) {
        if (item.status !== 'waiting') { continue }
        Object.assign(item, { status: 'cancelled', message: '사용자가 중단했습니다.' })
        record(run, item)
      }
      if (run.items.every(item => item.status !== 'running')) { run.finishedAt = new Date().toISOString() }
      return { data: copy(run) }
    },
    async history(clientId: string, signal?: AbortSignal) {
      signal?.throwIfAborted()
      return { data: copy(history.filter(item => item.clientId === clientId)) }
    },
    async rows(input: RowsQuery, signal?: AbortSignal) {
      signal?.throwIfAborted()
      const index = companies.findIndex(company => company.clientId === input.clientId)
      const company = companies[index]
      if (!company) { return { data: [] as CollectedRow[] } }
      const data: CollectedRow[] = companyRows(index)
        .filter(row => company.cells[row.kind]?.status === 'done' && inPeriod(row.date, input.from, input.to))
        .map((row, i) => ({ ...row, id: company.clientId + '-' + i }))
      return { data }
    },
    dispose() {
      for (const timer of timers) { clearTimeout(timer) }
      timers.clear()
    },
  }
}
