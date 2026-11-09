export function useSearch<T extends { id: string; name: string; code: string }>(items: () => T[]) {
 const query = ref('')
 const index = ref(0)
 const results = computed(() => items().filter(item => (item.name + ' ' + item.code).toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
 watch([query, results], () => { index.value = 0 })
 function move(delta: number) { if (results.value.length) index.value = (index.value + delta + results.value.length) % results.value.length }
 return { query, index, results, move }
}

