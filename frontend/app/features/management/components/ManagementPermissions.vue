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
        <tr>
          <td>조직 정보 수정</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="cross" aria-label="미허용">—</span></td>
        </tr>
        <tr>
          <td>직원 초대 및 관리</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="cross" aria-label="미허용">—</span></td>
        </tr>
        <tr>
          <td>수임업체 등록</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="check" aria-label="허용">✓</span></td>
        </tr>
        <tr>
          <td>수임업체 정보 수정</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="check" aria-label="허용">✓</span></td>
        </tr>
        <tr>
          <td>담당 수임업체 조회</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="check" aria-label="허용">✓</span></td>
        </tr>
        <tr>
          <td>전표 조회 및 입력</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="check" aria-label="허용">✓</span></td>
        </tr>
        <tr>
          <td>마감 처리</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="cross" aria-label="미허용">—</span></td>
        </tr>
        <tr>
          <td>신고 관련 업무</td>
          <td><span class="check" aria-label="허용">✓</span></td>
          <td><span class="check" aria-label="허용">✓</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
