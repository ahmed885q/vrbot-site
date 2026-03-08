'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ─── Chat Admin Controls ──────────────────────────────────────────
// This component provides admin moderation for the VRBOT Chat system.
// Admin abilities:
//   - Delete any individual message
//   - Delete ALL messages from a specific user
//   - Ban/unban a user from chat
//   - View list of banned users
//
// To use: Import and render this component alongside the chat UI.
// It checks if the current user is an admin before showing controls.

type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  adminPanel:    { ar: 'تحكم الأدمن بالشات', en: 'Chat Admin Controls', ru: 'Админ чата', zh: '聊天管理' },
  deleteMsg:     { ar: 'حذف', en: 'Delete', ru: 'Удалить', zh: '删除' },
  deleteAll:     { ar: 'حذف كل رسائل هذا المستخدم', en: 'Delete all messages from this user', ru: 'Удалить все сообщения', zh: '删除该用户所有消息' },
  ban:           { ar: 'حظر', en: 'Ban', ru: 'Бан', zh: '封禁' },
  unban:         { ar: 'إلغاء الحظر', en: 'Unban', ru: 'Разбан', zh: '解封' },
  banned:        { ar: 'محظور', en: 'Banned', ru: 'Забанен', zh: '已封禁' },
  bannedUsers:   { ar: 'المحظورون', en: 'Banned Users', ru: 'Забаненные', zh: '已封禁用户' },
  noBanned:      { ar: 'لا يوجد محظورون', en: 'No banned users', ru: 'Нет забаненных', zh: '没有被封禁的用户' },
  confirmDelete: { ar: 'هل تريد حذف هذه الرسالة؟', en: 'Delete this message?', ru: 'Удалить сообщение?', zh: '删除此消息？' },
  confirmDelAll: { ar: 'هل تريد حذف كل رسائل هذا المستخدم؟', en: 'Delete ALL messages from this user?', ru: 'Удалить все сообщения?', zh: '删除该用户所有消息？' },
  confirmBan:    { ar: 'هل تريد حظر هذا المستخدم من الشات؟', en: 'Ban this user from chat?', ru: 'Забанить пользователя?', zh: '封禁该用户？' },
  reason:        { ar: 'سبب الحظر (اختياري)', en: 'Ban reason (optional)', ru: 'Причина (опц.)', zh: '封禁原因(可选)' },
  user:          { ar: 'المستخدم', en: 'User', ru: 'Пользователь', zh: '用户' },
  date:          { ar: 'التاريخ', en: 'Date', ru: 'Дата', zh: '日期' },
  reasonCol:     { ar: 'السبب', en: 'Reason', ru: 'Причина', zh: '原因' },
  actions:       { ar: 'الإجراءات', en: 'Actions', ru: 'Действия', zh: '操作' },
  msgDeleted:    { ar: 'تم حذف الرسالة', en: 'Message deleted', ru: 'Удалено', zh: '消息已删除' },
  userBanned:    { ar: 'تم حظر المستخدم', en: 'User banned', ru: 'Пользователь забанен', zh: '用户已封禁' },
  userUnbanned:  { ar: 'تم إلغاء حظر المستخدم', en: 'User unbanned', ru: 'Разбанен', zh: '已解封' },
}

interface ChatAdminControlsProps {
  isAdmin: boolean
  lang: Lang
  channelId?: string
  onMessageDeleted?: () => void
}

interface BannedUser {
  id: string
  user_id: string
  user_email: string
  reason: string
  banned_at: string
  banned_by: string
}

const s = {
  panel: { background: '#1e293b', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #334155' },
  title: { fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
  btn: (bg: string, small = false) => ({
    padding: small ? '2px 8px' : '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: small ? '10px' : '12px', color: '#fff', background: bg, whiteSpace: 'nowrap' as const,
  }),
  msgAction: { display: 'flex', gap: '4px', position: 'absolute' as const, top: '-8px', left: '4px', opacity: 0, transition: 'opacity 0.2s' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' },
  th: { padding: '8px', textAlign: 'right' as const, borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600 },
  td: { padding: '8px', textAlign: 'right' as const, borderBottom: '1px solid #1e293b' },
  toast: (show: boolean) => ({
    position: 'fixed' as const, bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    background: '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 600,
    fontSize: '14px', opacity: show ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none' as const, zIndex: 9999,
  }),
}

// ─── Message Action Buttons (to be rendered next to each chat message) ───
export function MessageAdminActions({
  isAdmin, messageId, userId, userEmail, lang, onDelete, onDeleteAllFromUser, onBan
}: {
  isAdmin: boolean; messageId: string; userId: string; userEmail: string; lang: Lang;
  onDelete: (msgId: string) => void; onDeleteAllFromUser: (userId: string) => void; onBan: (userId: string, email: string) => void;
}) {
  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k
  if (!isAdmin) return null

  return (
    <div className="chat-admin-actions" style={{ display: 'inline-flex', gap: '4px', marginRight: '8px' }}>
      <button style={s.btn('#ef4444', true)} onClick={() => {
        if (confirm(L('confirmDelete'))) onDelete(messageId)
      }} title={L('deleteMsg')}>✕</button>
      <button style={s.btn('#f59e0b', true)} onClick={() => {
        if (confirm(L('confirmDelAll'))) onDeleteAllFromUser(userId)
      }} title={L('deleteAll')}>🗑</button>
      <button style={s.btn('#dc2626', true)} onClick={() => onBan(userId, userEmail)} title={L('ban')}>🚫</button>
    </div>
  )
}

// ─── Banned Users Panel ──────────────────────────────────────────────
export function BannedUsersPanel({ isAdmin, lang }: { isAdmin: boolean; lang: Lang }) {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k

  const fetchBanned = useCallback(async () => {
    const { data } = await supabase.from('chat_bans').select('*').eq('active', true).order('banned_at', { ascending: false })
    setBannedUsers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { if (isAdmin) fetchBanned() }, [isAdmin, fetchBanned])

  const handleUnban = async (banId: string) => {
    await supabase.from('chat_bans').update({ active: false }).eq('id', banId)
    fetchBanned()
  }

  if (!isAdmin) return null

  return (
    <div style={s.panel}>
      <div style={s.title}>🚫 {L('bannedUsers')} ({bannedUsers.length})</div>
      {bannedUsers.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '12px' }}>{L('noBanned')}</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>{L('user')}</th>
              <th style={s.th}>{L('reasonCol')}</th>
              <th style={s.th}>{L('date')}</th>
              <th style={s.th}>{L('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {bannedUsers.map(bu => (
              <tr key={bu.id}>
                <td style={s.td}>{bu.user_email}</td>
                <td style={s.td}>{bu.reason || '—'}</td>
                <td style={s.td}>{new Date(bu.banned_at).toLocaleDateString('ar-SA')}</td>
                <td style={s.td}>
                  <button style={s.btn('#22c55e', true)} onClick={() => handleUnban(bu.id)}>{L('unban')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Main Admin Controls Hook ────────────────────────────────────────
export function useChatAdmin() {
  const supabase = createClientComponentClient()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const deleteMessage = async (messageId: string) => {
    await supabase.from('chat_messages').delete().eq('id', messageId)
    showToast(t.msgDeleted['ar'])
  }

  const deleteAllFromUser = async (userId: string) => {
    await supabase.from('chat_messages').delete().eq('user_id', userId)
    showToast(t.msgDeleted['ar'])
  }

  const banUser = async (userId: string, userEmail: string) => {
    const reason = prompt(t.reason['ar'])
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('chat_bans').insert({
      user_id: userId,
      user_email: userEmail,
      reason: reason || '',
      banned_by: user?.id || '',
      active: true,
    })
    showToast(t.userBanned['ar'])
  }

  const isUserBanned = async (userId: string): Promise<boolean> => {
    const { data } = await supabase.from('chat_bans').select('id').eq('user_id', userId).eq('active', true).limit(1)
    return (data?.length || 0) > 0
  }

  const ToastComponent = () => <div style={s.toast(!!toast)}>{toast}</div>

  return { deleteMessage, deleteAllFromUser, banUser, isUserBanned, ToastComponent }
}

// ─── Default Export: Full Admin Panel ────────────────────────────────
export default function ChatAdminControls({ isAdmin, lang, channelId, onMessageDeleted }: ChatAdminControlsProps) {
  const { deleteMessage, deleteAllFromUser, banUser, ToastComponent } = useChatAdmin()
  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k

  if (!isAdmin) return null

  return (
    <>
      <div style={s.panel}>
        <div style={s.title}>🛡 {L('adminPanel')}</div>
        <BannedUsersPanel isAdmin={isAdmin} lang={lang} />
      </div>
      <ToastComponent />
    </>
  )
}
