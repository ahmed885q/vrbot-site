import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import AdminTools from './ui/AdminTools'
import DeliveredGrouped from './ui/DeliveredGrouped'

export const runtime = 'nodejs'

function isAdminEmail(email: string | null | undefined) {
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!email) return false
  return admins.includes(email.toLowerCase())
}

function toInt(v: any, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default async function ProKeysAdminPage({
  searchParams,
}: {
  searchParams: {
    status?: 'all' | 'used' | 'unused' | 'revoked' | 'delivered'
    q?: string
    page?: string
    batch?: string
  }
}) {
  const cookieStore = cookies()

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: userData } = await supabaseAuth.auth.getUser()
  const user = userData?.user
  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/dashboard')

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const status = (searchParams.status || 'all') as any
  const q = (searchParams.q || '').trim()
  const batch = (searchParams.batch || '').trim()

  const page = Math.max(1, toInt(searchParams.page, 1))
  const PAGE_SIZE = 50
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ count: totalCount }, { count: usedCount }, { count: unusedCount }, { count: deliveredCount }, { count: revokedCount }] =
    await Promise.all([
      adminDb.from('pro_keys').select('*', { count: 'exact', head: true }),
      adminDb.from('pro_keys').select('*', { count: 'exact', head: true }).eq('is_used', true).is('revoked_at', null),
      adminDb.from('pro_keys').select('*', { count: 'exact', head: true }).eq('is_used', false).is('revoked_at', null).is('delivered_at', null),
      adminDb.from('pro_keys').select('*', { count: 'exact', head: true }).eq('is_used', false).is('revoked_at', null).not('delivered_at', 'is', null),
      adminDb.from('pro_keys').select('*', { count: 'exact', head: true }).not('revoked_at', 'is', null),
    ])

  let query = adminDb
    .from('pro_keys')
    .select('id, code, batch_tag, note, is_used, used_by, used_at, created_at, created_by, revoked_at, revoked_by, delivered_at, delivered_by, delivered_to, delivered_note')
    .order('created_at', { ascending: false })

  if (batch) query = query.eq('batch_tag', batch)

  if (status === 'revoked') query = query.not('revoked_at', 'is', null)
  if (status === 'used') query = query.eq('is_used', true).is('revoked_at', null)
  if (status === 'delivered') query = query.eq('is_used', false).is('revoked_at', null).not('delivered_at', 'is', null)
  if (status === 'unused') query = query.eq('is_used', false).is('revoked_at', null).is('delivered_at', null)

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(`code.ilike.%${escaped}%,note.ilike.%${escaped}%,batch_tag.ilike.%${escaped}%,delivered_to.ilike.%${escaped}%`)
  }

  const { data: rows, error } = await query.range(from, to)
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Pro Keys (Admin)</h1>
        <div style={{ marginTop: 12, color: 'crimson' }}>DB Error: {error.message}</div>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE))

  const buildLink = (next: Partial<{ status: string; q: string; page: number; batch: string }>) => {
    const sp = new URLSearchParams()
    sp.set('status', next.status ?? status)
    if ((next.q ?? q).trim()) sp.set('q', (next.q ?? q).trim())
    if ((next.batch ?? batch).trim()) sp.set('batch', (next.batch ?? batch).trim())
    sp.set('page', String(next.page ?? page))
    return `/admin/pro-keys?${sp.toString()}`
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Pro Keys (Admin)</h1>
      <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>Logged in as: {user.email}</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        <Stat label="Total" value={totalCount ?? 0} />
        <Stat label="Used" value={usedCount ?? 0} />
        <Stat label="Unused" value={unusedCount ?? 0} />
        <Stat label="Delivered" value={deliveredCount ?? 0} />
        <Stat label="Revoked" value={revokedCount ?? 0} />
      </div>

      {/* Tabs + Search + Batch */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <a href={buildLink({ status: 'all', page: 1 })} style={pillStyle(status === 'all')}>All</a>
        <a href={buildLink({ status: 'used', page: 1 })} style={pillStyle(status === 'used')}>Used</a>
        <a href={buildLink({ status: 'unused', page: 1 })} style={pillStyle(status === 'unused')}>Unused</a>
        <a href={buildLink({ status: 'delivered', page: 1 })} style={pillStyle(status === 'delivered')}>Delivered</a>
        <a href={buildLink({ status: 'revoked', page: 1 })} style={pillStyle(status === 'revoked')}>Revoked</a>

        <form action="/admin/pro-keys" method="GET" style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search (code/batch/note/delivered_to)"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)', minWidth: 280 }}
          />
          <input
            name="batch"
            defaultValue={batch}
            placeholder="batch_tag filter"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)', minWidth: 220 }}
          />
          <button style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)', background: 'white', fontWeight: 800 }}>
            Apply
          </button>
        </form>
      </div>

      {/* Admin Tools */}
      <div style={{ marginTop: 16 }}>
        <AdminTools batch={batch} status={status} />
      </div>

      {/* Grouped Delivered Export */}
      <div style={{ marginTop: 12 }}>
        <DeliveredGrouped batch={batch} />
      </div>

      {/* Table */}
      <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid rgba(0,0,0,.12)', borderRadius: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.04)' }}>
              <Th>Code</Th>
              <Th>Batch</Th>
              <Th>Status</Th>
              <Th>Delivered To</Th>
              <Th>Delivered At</Th>
              <Th>Used At</Th>
              <Th>Created</Th>
              <Th>Note</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(0,0,0,.08)' }}>
                <Td mono>{r.code}</Td>
                <Td mono>{r.batch_tag || '-'}</Td>
                <Td>
                  {r.revoked_at ? (
                    <span style={badgeStyle('revoked')}>REVOKED</span>
                  ) : r.is_used ? (
                    <span style={badgeStyle('used')}>USED</span>
                  ) : r.delivered_at ? (
                    <span style={badgeStyle('delivered')}>DELIVERED</span>
                  ) : (
                    <span style={badgeStyle('unused')}>UNUSED</span>
                  )}
                </Td>
                <Td>{r.delivered_to || '-'}</Td>
                <Td>{r.delivered_at ? new Date(r.delivered_at).toLocaleString() : '-'}</Td>
                <Td>{r.used_at ? new Date(r.used_at).toLocaleString() : '-'}</Td>
                <Td>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</Td>
                <Td>{r.note || '-'}</Td>
                <Td>
                  {/* Client Actions */}
                  {/* revoke/unrevoke based on revoked_at */}
                  {r.revoked_at ? (
                    // client component
                    // @ts-ignore
                    <UnrevokeButton code={r.code} isUsed={r.is_used} />
                  ) : (
                    // @ts-ignore
                    <RevokeButton code={r.code} isUsed={r.is_used} />
                  )}
                </Td>
              </tr>
            ))}

            {(rows || []).length === 0 && (
              <tr>
                <Td colSpan={9} center>No keys found.</Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <a href={buildLink({ page: Math.max(1, page - 1) })} style={{ ...pagerBtnStyle, pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1 }}>
          ← Prev
        </a>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Page {page} / {totalPages}</div>
        <a href={buildLink({ page: Math.min(totalPages, page + 1) })} style={{ ...pagerBtnStyle, pointerEvents: page >= totalPages ? 'none' : 'auto', opacity: page >= totalPages ? 0.5 : 1 }}>
          Next →
        </a>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: 12, border: '1px solid rgba(0,0,0,.12)', borderRadius: 14, minWidth: 140 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function Th({ children }: { children: any }) {
  return <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }}>{children}</th>
}

function Td({ children, mono, colSpan, center }: { children: any; mono?: boolean; colSpan?: number; center?: boolean }) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: '12px 12px',
        fontSize: 13,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' : 'inherit',
        textAlign: center ? 'center' : 'left',
        whiteSpace: mono ? 'nowrap' : 'normal',
      }}
    >
      {children}
    </td>
  )
}

function pillStyle(active: boolean) {
  return {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,.15)',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 800,
    background: active ? 'rgba(0,0,0,.06)' : 'white',
  } as const
}

function badgeStyle(kind: 'used' | 'unused' | 'revoked' | 'delivered') {
  const bg =
    kind === 'used' ? 'rgba(0,128,0,.08)' :
    kind === 'delivered' ? 'rgba(59,130,246,.10)' :
    kind === 'revoked' ? 'rgba(220,38,38,.10)' :
    'rgba(0,0,0,.04)'

  return {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    border: '1px solid rgba(0,0,0,.15)',
    background: bg,
  } as const
}

const pagerBtnStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,.15)',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 800,
  background: 'white',
} as const

// IMPORTANT: actions are client components imported in ui folder
import { RevokeButton, UnrevokeButton } from './ui/KeyActions'
