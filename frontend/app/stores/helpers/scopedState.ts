import { reactive, shallowRef } from 'vue'

// 기존 탭/작업 공간 객체의 수명에 맞춰 상태를 보존하고 서로 다른 범위를 격리한다.
export function createScopedState<T extends object>(create: () => T) {
  const sessions = new WeakMap<object, T>()
  const state = shallowRef(reactive(create()) as T)
  function forScope(scope: object): T {
    let value = sessions.get(scope)
    if (!value) {
      value = reactive(create()) as T
      sessions.set(scope, value)
    }
    state.value = value
    return value
  }
  return { state, forScope }
}
