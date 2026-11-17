// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // 1. 공통 JavaScript / TypeScript 규칙
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    rules: {
      // console.log 사용 시 경고
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      // debugger 사용 금지
      'no-debugger': 'error',

      // 변경하지 않는 변수는 const 사용
      'prefer-const': 'error',

      // == 대신 === 사용
      eqeqeq: ['error', 'always'],

      // 조건문 중괄호 필수
      curly: ['error', 'all'],

      // 중복 import 방지
      'no-duplicate-imports': 'error',

      // 빈 catch 블록 방지
      'no-empty': [
        'error',
        {
          allowEmptyCatch: false,
        },
      ],
    },
  },

  // 2. TypeScript 규칙
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // any 사용 시 경고
      '@typescript-eslint/no-explicit-any': 'warn',

      // 사용하지 않는 변수 방지
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // @ts-ignore 사용 금지
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
        },
      ],
    },
  },

  // 3. Vue 컴포넌트 규칙
  {
    files: ['**/*.vue'],
    rules: {
      // Props 직접 수정 금지
      'vue/no-mutating-props': 'error',

      // v-for에는 key 필수
      'vue/require-v-for-key': 'error',

      // 계산 속성에서 부작용 금지
      'vue/no-side-effects-in-computed-properties': 'error',

      // 템플릿 미사용 변수 경고
      'vue/no-unused-vars': 'warn',

      // 단일 단어 컴포넌트명 허용
      'vue/multi-word-component-names': 'off',
    },
  },

  // 4. 테스트 파일 예외
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
