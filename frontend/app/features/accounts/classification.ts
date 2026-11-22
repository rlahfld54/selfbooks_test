// Code ranges from the supplied developer reference, f3.
export const accountRanges = [
  {
    range: '101~145',
    mid: '당좌자산',
    nature: '자산',
  },
  {
    range: '146~175',
    mid: '재고자산',
    nature: '자산',
  },
  {
    range: '176~194',
    mid: '투자자산',
    nature: '자산',
  },
  {
    range: '195~217',
    mid: '유형자산',
    nature: '자산',
  },
  {
    range: '218~230',
    mid: '무형자산',
    nature: '자산',
  },
  {
    range: '231~250',
    mid: '기타비유동자산',
    nature: '자산',
  },
  {
    range: '251~290',
    mid: '유동부채',
    nature: '부채',
  },
  {
    range: '291~330',
    mid: '비유동부채',
    nature: '부채',
  },
  {
    range: '331~340',
    mid: '자본금',
    nature: '자본',
  },
  {
    range: '341~350',
    mid: '자본잉여금',
    nature: '자본',
  },
  {
    range: '351~380',
    mid: '이익잉여금',
    nature: '자본',
  },
  {
    range: '381~391',
    mid: '자본조정',
    nature: '자본',
  },
  {
    range: '392~399',
    mid: '기타포괄손익누계액',
    nature: '자본',
  },
  {
    range: '401~430',
    mid: '매출',
    nature: '수익',
  },
  {
    range: '451~470',
    mid: '매출원가',
    nature: '비용',
  },
  {
    range: '501~600',
    mid: '제조원가',
    nature: '비용',
  },
  {
    range: '601~650',
    mid: '도급원가',
    nature: '비용',
  },
  {
    range: '651~700',
    mid: '보관원가',
    nature: '비용',
  },
  {
    range: '701~750',
    mid: '분양원가',
    nature: '비용',
  },
  {
    range: '751~800',
    mid: '운송원가',
    nature: '비용',
  },
  {
    range: '801~900',
    mid: '판매비및일반관리비',
    nature: '비용',
  },
  {
    range: '901~950',
    mid: '영업외수익',
    nature: '수익',
  },
  {
    range: '951~997',
    mid: '영업외비용',
    nature: '비용',
  },
  {
    range: '998~999',
    mid: '법인(소득)세등',
    nature: '비용',
  },
  {
    range: '1000~1010',
    mid: '특수설정계정과목',
    nature: '자동판단 예외 (사용자 직접 입력)',
  },
]
export function classifyAccount(code: string) {
  if (!/^\d+$/.test(code)) return undefined
  const n = Number(code)
  return accountRanges.find((row) => {
    const [min, max] = row.range.split('~').map(Number)
    return n >= min! && n <= max!
  })
}
