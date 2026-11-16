import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { readPartnerWorkbook, previewPartners, preparePartners } from '../app/features/demo-partners/services/partnerImport.ts'

const headers = ['사업자등록번호(*)', '사업자 구분(*)[1:개인, 2:법인]', '업체 명(*)', '대표자 명(*)', '사용자명(*)', '사용자(담당자) 전화번호(*) ex)010-0000-0000', '우편번호', '거래처 코드', '추가정보', '법인등록번호', '업종코드', '업태', '업종', '기본주소']
const row = ['0123456789', '1', '테스트 거래처', '대표', '담당', '010-1234-5678', '01234', '', '보존', '', '523932', '소매업', '문구', '서울시 테스트로 1']
function workbook(rows: string[][]) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '거래처'); return wb }

for (const bookType of ['xls', 'xlsx'] as const) test(`${bookType} 정상 파일, 원본 헤더, 선행 0 및 추가 컬럼 보존`, () => {
  const buffer = XLSX.write(workbook([headers, row]), { type: 'array', bookType })
  const preview = previewPartners(readPartnerWorkbook(buffer), '거래처', [])
  assert.equal(preview.rows[0]?.errors.length, 0)
  const registered = preparePartners(preview, [{ code: 'IMP00001' } as any])
  assert.equal(registered[0]?.registration, '0123456789')
  assert.equal(registered[0]?.information.postalCode, '01234')
  assert.equal(registered[0]?.information['extra:8:추가정보'], '보존')
  assert.equal(registered[0]?.code, 'IMP00002')
})
test('선택 연락처 누락은 허용, 핵심 정보 오류와 중복은 표시하되 등록 허용', () => {
  const missing = [...row]; missing[4] = ''; missing[5] = ''
  assert.equal(previewPartners(workbook([headers, missing]), '거래처', []).rows[0]?.warnings.length, 0)
  const preview = previewPartners(workbook([headers, row, row]), '거래처', [])
  assert.match(preview.rows[1]!.errors.join(), /중복/)
  assert.equal(preparePartners(preview, []).length, 2)
  assert.equal(preparePartners(preview, [])[1]?.status, '확인요망')
  assert.match(previewPartners(workbook([headers, row]), '거래처', [{ registration: '012-34-56789', code: 'A', information: { industryCode: '523932', businessCategory: '소매업', industry: '문구' } } as any]).rows[0]!.errors.join(), /중복/)
  const invalid = [...row]; invalid[0] = '12'; invalid[1] = '3'; invalid[2] = ''
  assert.equal(previewPartners(workbook([headers, invalid]), '거래처', []).rows[0]?.errors.length, 3)
})
test('빈 파일, 잘못된 헤더, 중복 헤더, 과다 행, 수식을 거부', () => {
  assert.throws(() => readPartnerWorkbook(new ArrayBuffer(8)), /올바른/)
  assert.throws(() => readPartnerWorkbook(new ArrayBuffer(6 * 1024 * 1024)), /5MB/)
  assert.throws(() => previewPartners(workbook([headers]), '거래처', []), /등록할/)
  assert.throws(() => previewPartners(workbook([['이름'], ['업체']]), '거래처', []), /첫 행/)
  assert.throws(() => previewPartners(workbook([[...headers, '거래처명'], row]), '거래처', []), /중복/)
  const wb = workbook([headers, row]); wb.Sheets['거래처']!['C2']!.f = '1+1'
  assert.match(previewPartners(wb, '거래처', []).rows[0]!.errors.join(), /수식/)
  wb.Sheets['거래처']!['!ref'] = 'A1:J5002'
  assert.throws(() => previewPartners(wb, '거래처', []), /5,001/)
})
test('빈 행은 제외하고 실제 엑셀 행 번호 유지, 선택한 시트만 사용', () => {
  const wb = workbook([headers, [], row])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, [...row.slice(0, 2), '다른 업체', ...row.slice(3)]]), '두번째')
  assert.equal(previewPartners(wb, '거래처', []).rows[0]?.line, 3)
  assert.equal(previewPartners(wb, '두번째', []).rows[0]?.values.name, '다른 업체')
})

const requiredIndexes = [0, 1, 9, 2, 3, 10, 11, 12, 6, 13]
test('필수 10개 컬럼만 있으면 선택 컬럼 없이 경고 없이 등록', () => {
  const preview = previewPartners(workbook([requiredIndexes.map(i => headers[i]!), requiredIndexes.map(i => row[i]!)]), '거래처', [])
  assert.deepEqual(preview.rows[0]?.errors, [])
  assert.deepEqual(preview.rows[0]?.warnings, [])
  assert.equal(preparePartners(preview, []).length, 1)
  assert.equal(preparePartners(preview, [])[0]?.information.corporationNumber, '')
})
test('필수 10개 컬럼 각각 누락 시 해당 컬럼 안내', () => {
  for (const index of requiredIndexes) {
    assert.throws(() => previewPartners(workbook([headers.filter((_, i) => i !== index), row.filter((_, i) => i !== index)]), '거래처', []), /필수 컬럼/)
  }
})

test('같은 사업자번호라도 업종코드·업태·업종 중 하나가 다르면 파일 내부와 기존 목록 모두 허용', () => {
  const original = preparePartners(previewPartners(workbook([headers, row]), '거래처', []), [])
  for (const index of [10, 11, 12]) {
    const different = [...row]; different[index] = index === 10 ? '523933' : '다른 업종'
    const batch = previewPartners(workbook([headers, row, different]), '거래처', [])
    assert.deepEqual(batch.rows.map(item => item.errors), [[], []])
    const saved = preparePartners(batch, [])
    assert.equal(saved.length, 2)
    assert.notEqual(saved[0]?.code, saved[1]?.code)
    assert.deepEqual(previewPartners(workbook([headers, different]), '거래처', original).rows[0]?.errors, [])
    assert.match(previewPartners(workbook([headers, different]), '거래처', saved).rows[0]!.errors.join(), /모두 같은/)
  }
})
test('사업자번호 하이픈과 업종 정보 앞뒤 공백 차이는 동일 거래처로 검사', () => {
  const original = preparePartners(previewPartners(workbook([headers, row]), '거래처', []), [])
  const duplicate = [...row]; duplicate[0] = '012-34-56789'; duplicate[10] = ' 523932 '; duplicate[11] = ' 소매업 '; duplicate[12] = ' 문구 '
  assert.match(previewPartners(workbook([headers, duplicate]), '거래처', original).rows[0]!.errors.join(), /모두 같은/)
})

test('오류·경고 행도 전부 보존하고 중복 코드에도 고유 ID로 반복 등록', () => {
  const invalid = [...row]; invalid[0] = '12'; invalid[1] = '3'; invalid[2] = ''; invalid[3] = ''; invalid[7] = 'SAME'
  const preview = previewPartners(workbook([headers, invalid, invalid]), '거래처', [])
  const first = preparePartners(preview, [])
  const second = preparePartners(preview, first)
  assert.equal(first.length, 2)
  assert.equal(new Set([...first, ...second].map(item => item.id)).size, 4)
  assert.ok(first.every(item => item.status === '확인요망' && item.importIssues.length > 0))
  assert.equal(first[0]?.sourceLine, 2)
  assert.equal(first[1]?.sourceLine, 3)
  assert.equal(first[0]?.registration, '12')
  assert.equal(first[0]?.information.name, '')
  assert.equal(first[0]?.code, 'SAME')
  assert.equal(first[1]?.code, 'SAME')
})
