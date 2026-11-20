<script setup lang="ts">
import { usePermissionStore } from '~/stores/permissionStore'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
const { state } = useWorkspaceContext()
const permissions = usePermissionStore().forScope(state)
</script>

<template>
  <div class="section-heading">
    <div>
      <h3>역할별 권한 매트릭스</h3>
      <p>기본 역할 예시이며 실제 서비스의 권한 정책으로 확정된 내용은 아닙니다.</p>
    </div>
    <span class="badge orange">정책 확정 전</span>
  </div>
  <div class="alert management-notice">
    본 표는 화면 검증용 가상 권한 구성입니다. 실제 권한 부여 및 서버 접근제어는 구현하지
    않았습니다.
  </div>
  <div class="panel table-scroll">
    <table class="management-table perm-table">
      <thead>
        <tr>
          <th scope="col">업무 기능</th>
          <th scope="col">조직 관리자</th>
          <th scope="col">일반 사용자</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in permissions.rows" :key="row.id">
          <td>{{ row.label }}</td>
          <td><span :class="row.admin ? 'check' : 'cross'" :aria-label="row.admin ? '허용' : '미허용'">{{ row.admin ? '✓' : '—' }}</span></td>
          <td><span :class="row.member ? 'check' : 'cross'" :aria-label="row.member ? '허용' : '미허용'">{{ row.member ? '✓' : '—' }}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
