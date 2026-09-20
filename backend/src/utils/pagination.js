export function parsePagination(query, { defaultPageSize = 20, maxPageSize = 100 } = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(query.pageSize || query.limit) || defaultPageSize));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

export function paginated(items, total, { page, pageSize }) {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
