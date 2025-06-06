import { computed } from "vue";

export function usePagination(totalPages, currentPage) {
  const visiblePages = computed(() => {
    const range = 2;
    let start = Math.max(1, currentPage.value - range);
    let end = Math.min(totalPages.value, currentPage.value + range);

    if (end - start < range * 2) {
      start = Math.max(1, end - range * 2);
      end = Math.min(totalPages.value, start + range * 2);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  return {
    visiblePages,
  };
}
