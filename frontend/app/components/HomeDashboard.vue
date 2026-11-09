<script setup lang="ts">
import type { TabId } from '~/utils/workspace'
defineProps<{ company: string }>()
defineEmits<{ open: [id: TabId] }>()
const stats = [
  { label: '오늘의 전표', value: '12', unit: '건', trend: '전일 대비 +2건', icon: 'document' },
  {
    label: '이번 달 매출',
    value: '45,200,000',
    unit: '원',
    trend: '지난달 대비 +5.2%',
    icon: 'chart',
  },
  {
    label: '이번 달 매입',
    value: '32,700,000',
    unit: '원',
    trend: '지난달 대비 +3.1%',
    icon: 'wallet',
  },
  {
    label: '검토 대기 전표',
    value: '3',
    unit: '건',
    trend: '확인이 필요한 샘플',
    icon: 'calendar',
  },
]
const quick: { id: TabId; title: string; icon: string }[] = [
  { id: 'voucher', title: '일반전표입력', icon: 'document' },
  { id: 'ledger', title: '전표조회', icon: 'search' },
  { id: 'partners', title: '거래처관리', icon: 'users' },
  { id: 'reports', title: '보고서', icon: 'chart' },
  { id: 'tax', title: '세무신고', icon: 'calendar' },
]
const recent = [
  { title: '일반전표 입력 샘플', desc: '행복상사 · 상품 매출', time: '13:24', type: '일반전표' },
  { title: '거래처 등록 샘플', desc: '우리상사 · 신규 거래처', time: '12:50', type: '거래처' },
  { title: '매입 내역 조회 샘플', desc: '미래산업 · 사무용품', time: '11:37', type: '매입매출' },
  { title: '전표 검토 샘플', desc: '그린오피스 · 임차료', time: '10:20', type: '검토' },
]
</script>
<template>
  <div class="dashboard">
    <PageToolbar title="홈 대시보드" description="오늘의 업무 현황을 한눈에 확인하세요."
      ><UiBadge tone="neutral">샘플 데이터</UiBadge
      ><span class="date-chip"
        ><UiIcon name="calendar" :size="16" />2026-11-09 월요일</span
      ></PageToolbar
    >
    <section class="welcome-banner">
      <div>
        <div class="eyebrow">YOUR SMART ACCOUNTING PARTNER</div>
        <h2>안녕하세요, 관리자님<span class="greeting-dot">.</span></h2>
        <p>오늘도 정확한 회계, 여유로운 업무를 시작하세요.</p>
        <UiButton variant="primary" @click="$emit('open', 'voucher')"
          ><UiIcon name="plus" :size="16" />전표 입력 시작하기</UiButton
        >
      </div>
      <div class="welcome-art" aria-hidden="true">
        <div class="art-paper">
          <span /><span /><span />
          <div class="art-bars"><i /><i /><i /><i /></div>
        </div>
        <div class="art-calculator">
          <span>12,450</span>
          <div>▪ ▪ ▪<br />▪ ▪ ▪<br />▪ ▪ ▪</div>
        </div>
        <div class="art-check"><UiIcon name="check" :size="25" /></div>
      </div>
    </section>
    <div class="stats-grid">
      <UiCard v-for="(stat, i) in stats" :key="stat.label"
        ><div class="stat-top">
          <span>{{ stat.label }}</span
          ><span class="stat-icon"><UiIcon :name="stat.icon" /></span>
        </div>
        <div class="stat-value">
          {{ company === 'demo-happy' ? stat.value : ['8', '28,500,000', '19,200,000', '2'][i]
          }}<small>{{ stat.unit }}</small>
        </div>
        <div class="stat-trend" :class="{ warning: i === 3 }">
          <span>{{ i === 3 ? '●' : '↗' }}</span
          >{{ stat.trend }}
        </div></UiCard
      >
    </div>
    <div class="dashboard-middle">
      <UiCard title="월별 매출·매입 현황"
        ><template #actions
          ><div class="chart-legend">
            <span><i />매출</span><span><i />매입</span><UiBadge tone="neutral">2026년</UiBadge>
          </div></template
        >
        <div
          class="chart"
          role="img"
          aria-label="2026년 월별 매출과 매입 샘플 차트. 실제 회계 데이터가 아닙니다."
        >
          <div class="chart-labels">
            <span>6천만</span><span>4천만</span><span>2천만</span><span>0</span>
          </div>
          <svg viewBox="0 0 640 190" preserveAspectRatio="none">
            <g stroke="#e8edf4"><path d="M0 15H640M0 65H640M0 115H640M0 165H640" /></g>
            <g fill="#dce7fb">
              <rect
                v-for="(height, i) in [64, 49, 70, 77, 65, 81, 78, 70, 89, 83, 98, 91]"
                :key="i"
                :x="i * 53 + 12"
                :y="165 - height"
                width="24"
                :height="height"
                rx="3"
              />
            </g>
            <path
              d="M24 81 77 102 130 88 183 66 236 75 289 61 342 66 395 78 448 39 501 30 554 32 607 23"
              fill="none"
              stroke="#2457c5"
              stroke-width="3"
            />
            <g fill="white" stroke="#2457c5" stroke-width="2">
              <circle
                v-for="(y, i) in [81, 102, 88, 66, 75, 61, 66, 78, 39, 30, 32, 23]"
                :key="i"
                :cx="i * 53 + 24"
                :cy="y"
                r="4"
              />
            </g>
          </svg>
          <div class="chart-months">
            <span v-for="month in 12" :key="month">{{ month }}월</span>
          </div>
        </div></UiCard
      >
      <UiCard title="최근 처리 내역"
        ><template #actions
          ><UiButton variant="ghost" @click="$emit('open', 'ledger')"
            >전체 보기 <UiIcon name="chevron" :size="13" /></UiButton
        ></template>
        <div v-for="item in recent" :key="item.time" class="activity">
          <span class="activity-icon"><UiIcon name="document" :size="18" /></span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ company === 'demo-happy' ? item.desc : '우리상사 데모 회사 · 예시 내역' }}</p>
          </div>
          <time>{{ item.time }}</time>
        </div></UiCard
      >
    </div>
    <div class="dashboard-bottom">
      <UiCard title="자주 사용하는 메뉴"
        ><div class="quick-grid">
          <button
            v-for="item in quick"
            :key="item.id"
            class="quick-link"
            @click="$emit('open', item.id)"
          >
            <span><UiIcon :name="item.icon" :size="25" /></span>{{ item.title }}
          </button>
        </div></UiCard
      ><UiCard title="공지사항"
        ><div class="notice">
          <UiBadge>안내</UiBadge><span>공통 UI 데모 이용 안내</span><time>11-09</time>
        </div>
        <div class="notice">
          <UiBadge tone="neutral">업데이트</UiBadge><span>업무 탭과 상세 패널을 만나보세요</span
          ><time>11-08</time>
        </div>
        <div class="notice">
          <UiBadge tone="neutral">도움말</UiBadge><span>키보드로 거래처를 검색할 수 있어요</span
          ><time>11-06</time>
        </div></UiCard
      >
    </div>
    <p class="dashboard-footnote">
      모든 지표와 처리 내역은 UI 검증용 예시입니다. 실제 회계 데이터와 연결되어 있지 않습니다.
    </p>
  </div>
</template>
