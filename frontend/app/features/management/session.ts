import { reactive } from 'vue'
import type { Client } from './data'
import { staff, clients } from './data'
import type { Workspace } from '~/types/workspace'

export function createManagementData() {
  return {
    staff: staff.map(person => ({ ...person })),
    clients: clients.map<Client>(client => ({ ...client, secondary: [...client.secondary], primaryId: staff.find(person => person.name === client.primary)?.id, secondaryIds: staff.filter(person => client.secondary.includes(person.name)).map(person => person.id) })),
    organization: {
      '회계법인명/사무소명': '회계법인 원지', '사업자등록번호': '000-00-00000',
      '법인등록번호': '000000-0000000', '대표자명': '김원지',
      '사업장 주소': '서울특별시 금천구 디지털로 00', '업태': '전문 서비스업', '종목': '세무·회계 서비스',
      '대표전화': '02-0000-0000', '대표 이메일': 'office@aat-demo.example', '팩스번호': '02-0000-0001',
      '세무대리인 관리번호': 'DEMO-00001', '사무소 구분': '회계법인', '기타 등록정보': '테스트 데이터',
    } as Record<string, string>,
    branches: [
      { id: 'B1', name: '회계법인 원지 본사', address: '서울특별시 금천구 디지털로 00', phone: '02-0000-0000', status: '활성', kind: '본사', count: '6' },
      { id: 'B2', name: '관악지점', address: '서울특별시 관악구 남부순환로 00', phone: '02-0000-0002', status: '활성', kind: '지점', count: '2' },
    ],
  }
}
const sessions = new WeakMap<Workspace, ReturnType<typeof createManagementData>>()
export function managementSession(workspace: Workspace) {
  let session = sessions.get(workspace)
  if (!session) {
    session = reactive(createManagementData())
    sessions.set(workspace, session)
  }
  return session
}
