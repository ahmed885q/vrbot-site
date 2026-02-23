import { useState, useMemo } from 'react'

const PAGE_SIZE = 20

export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safeP = Math.min(page, totalPages)
  const paged = useMemo(() => items.slice((safeP - 1) * pageSize, safeP * pageSize), [items, safeP, pageSize])
  return { paged, page: safeP, totalPages, setPage, total: items.length, pageSize }
}

export function Pager({ page, totalPages, total, pageSize, setPage }: { page: number; totalPages: number; total: number; pageSize: number; setPage: (n: number) => void }) {
  if (totalPages <= 1) return null
  const S = {
    wrap: { display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', padding: '12px 0' } as React.CSSProperties,
    btn: (active: boolean, disabled: boolean) => ({ padding: '4px 10px', border: active ? '1px solid #3b82f6' : '1px solid #2a2a3a', borderRadius: '4px', cursor: disabled ? 'default' : 'pointer', fontSize: '12px', fontWeight: active ? 700 : 400, background: active ? '#3b82f620' : 'transparent', color: active ? '#3b82f6' : disabled ? '#444' : '#888', opacity: disabled ? 0.5 : 1 }) as React.CSSProperties,
    info: { fontSize: '12px', color: '#666', margin: '0 8px' } as React.CSSProperties,
  }
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div style={S.wrap}>
      <button style={S.btn(false, page <= 1)} onClick={() => page > 1 && setPage(page - 1)} disabled={page <= 1}>&laquo;</button>
      {pages.map((p, i) => typeof p === 'number' ? (
        <button key={i} style={S.btn(p === page, false)} onClick={() => setPage(p)}>{p}</button>
      ) : (
        <span key={i} style={{ color: '#666', fontSize: '12px' }}>...</span>
      ))}
      <button style={S.btn(false, page >= totalPages)} onClick={() => page < totalPages && setPage(page + 1)} disabled={page >= totalPages}>&raquo;</button>
      <span style={S.info}>{start}-{end} of {total}</span>
    </div>
  )
}
