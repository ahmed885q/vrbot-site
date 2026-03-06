'use client'
import { useState, useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { getChannels } from '@/lib/chat'
const EMOJIS = ['⚔️','🔥','👍','🎉','🏰','✅','🤔','😂']
export default function ChatPage() {
  const [channels, setChannels]           = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [input, setInput]                 = useState('')
  const [hoveredMsg, setHoveredMsg]       = useState(null)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const { messages, reactions, loading, sending, currentUser, sendMessage, toggleReaction } = useChat(activeChannel?.id)
  const { isSubscribed, permission, requestPermission } = usePushNotifications()
  useEffect(() => { getChannels().then(d => { setChannels(d); setActiveChannel(d[0] || null) }) }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const handleSend = async () => { if (!input.trim() || sending) return; const t = input; setInput(''); await sendMessage(t); inputRef.current?.focus() }
  const getName  = m => m.username || m.email?.split('@')[0] || 'مستخدم'
  const getInit  = m => (getName(m)[0] || 'U').toUpperCase()
  const getColor = id => ['#f59e0b','#60a5fa','#34d399','#a78bfa','#fb7185'][id?.charCodeAt(0) % 5 || 0]
  const isMe     = m => m.user_id === currentUser?.id
  return (
    <div style={{ fontFamily:"'Tajawal',sans-serif", background:'#0a0c10', color:'#e2d9c8', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', direction:'rtl' }}>
      <style suppressHydrationWarning>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2d35;border-radius:2px}input{outline:none}button{font-family:'Tajawal',sans-serif}`}</style>
      <div style={{ height:52,background:'#0f1117',borderBottom:'1px solid #1e2130',display:'flex',alignItems:'center',padding:'0 20px',justifyContent:'space-between',flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:28,height:28,background:'linear-gradient(135deg,#f59e0b,#d97706)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#000',fontSize:14 }}>V</div>
          <span style={{ fontSize:15,fontWeight:700,letterSpacing:2,color:'#f59e0b' }}>VRBOT Chat</span>
        </div>
        {permission !== 'denied' && (
          <button onClick={requestPermission} style={{ background:isSubscribed?'rgba(52,211,153,0.1)':'rgba(245,158,11,0.1)',border:'1px solid '+(isSubscribed?'#34d39944':'#f59e0b44'),borderRadius:8,padding:'5px 12px',cursor:'pointer',color:isSubscribed?'#34d399':'#f59e0b',fontSize:12 }}>
            {isSubscribed ? '🔔 الإشعارات مفعلة' : '🔕 تفعيل الإشعارات'}
          </button>
        )}
      </div>
      <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
        <div style={{ width:220,background:'#0d0f16',borderLeft:'1px solid #1a1d27',display:'flex',flexDirection:'column',flexShrink:0 }}>
          <div style={{ padding:'14px 14px 8px',fontSize:11,color:'#4b5263',letterSpacing:1 }}>القنوات</div>
          <div style={{ height:1,background:'linear-gradient(90deg,transparent,#f59e0b44,transparent)',margin:'0 14px 8px' }}/>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)} style={{ background:activeChannel?.id===ch.id?'rgba(245,158,11,0.1)':'transparent',border:'none',borderRight:'2px solid '+(activeChannel?.id===ch.id?'#f59e0b':'transparent'),padding:'9px 14px',display:'flex',alignItems:'center',gap:9,cursor:'pointer',width:'100%',textAlign:'right' }}>
              <span style={{ fontSize:15 }}>{ch.icon}</span>
              <span style={{ fontSize:13,color:activeChannel?.id===ch.id?'#f0e6d3':'#6b7a90' }}># {ch.name}</span>
            </button>
          ))}
          {currentUser && (
            <div style={{ marginTop:'auto',padding:12,borderTop:'1px solid #1a1d27' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:getColor(currentUser.id)+'22',border:'1.5px solid '+getColor(currentUser.id)+'66',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:getColor(currentUser.id) }}>
                  {(currentUser.user_metadata?.username || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:12,color:'#c9d1e0' }}>{currentUser.user_metadata?.username || currentUser.email?.split('@')[0]}</div>
                  <div style={{ fontSize:10,color:'#34d399' }}>● متصل</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          <div style={{ height:48,background:'#0f1117',borderBottom:'1px solid #1a1d27',display:'flex',alignItems:'center',padding:'0 20px',gap:10,flexShrink:0 }}>
            <span style={{ fontSize:18 }}>{activeChannel?.icon}</span>
            <span style={{ fontSize:15,color:'#e2d9c8',fontWeight:500 }}># {activeChannel?.name}</span>
            {activeChannel?.description && <><div style={{ width:1,height:16,background:'#2a2d35' }}/><span style={{ fontSize:12,color:'#4b5263' }}>{activeChannel.description}</span></>}
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'16px 20px',background:'#0a0c10',display:'flex',flexDirection:'column',gap:2 }}>
            {loading ? (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'#4b5263',gap:10 }}><span>⚔️</span><span style={{ fontSize:14 }}>جاري التحميل...</span></div>
            ) : messages.length === 0 ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:12,opacity:0.4 }}>
                <span style={{ fontSize:48 }}>⚔️</span><span style={{ color:'#6b7280',fontSize:14 }}>لا توجد رسائل. ابدأ المحادثة!</span>
              </div>
            ) : messages.map((msg, i) => {
              const me = isMe(msg); const sh = i === 0 || messages[i-1]?.user_id !== msg.user_id
              const color = getColor(msg.user_id); const rx = reactions[msg.id] || {}
              return (
                <div key={msg.id} style={{ display:'flex',flexDirection:me?'row-reverse':'row',alignItems:'flex-end',gap:8,marginTop:sh?12:2,position:'relative' }}
                  onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
                  <div style={{ width:32,flexShrink:0 }}>
                    {sh && <div style={{ width:32,height:32,borderRadius:'50%',background:color+'22',border:'1.5px solid '+color+'55',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color }}>{getInit(msg)}</div>}
                  </div>
                  <div style={{ maxWidth:'70%',display:'flex',flexDirection:'column',alignItems:me?'flex-end':'flex-start' }}>
                    {sh && <div style={{ display:'flex',alignItems:'baseline',gap:6,flexDirection:me?'row-reverse':'row',marginBottom:3 }}>
                      <span style={{ fontSize:13,fontWeight:600,color }}>{getName(msg)}</span>
                      <span style={{ fontSize:11,color:'#3d4259' }}>{new Date(msg.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>}
                    <div style={{ padding:'9px 13px',borderRadius:me?'14px 4px 14px 14px':'4px 14px 14px 14px',background:me?'linear-gradient(135deg,#1a1200,#231800)':'rgba(255,255,255,0.04)',border:'1px solid '+(me?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)'),fontSize:14,lineHeight:1.6,color:'#d4cbbf',wordBreak:'break-word' }}>
                      {msg.content}
                    </div>
                    {Object.keys(rx).length > 0 && (
                      <div style={{ display:'flex',gap:4,marginTop:4,flexWrap:'wrap' }}>
                        {Object.entries(rx).map(([e,c]) => c > 0 && <button key={e} onClick={() => toggleReaction(msg.id,e)} style={{ background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:20,padding:'2px 8px',fontSize:12,cursor:'pointer',color:'#d4cbbf' }}>{e} {c}</button>)}
                      </div>
                    )}
                  </div>
                  {hoveredMsg === msg.id && (
                    <div style={{ position:'absolute',top:-36,[me?'left':'right']:42,background:'#1a1d27',border:'1px solid #2a2d3a',borderRadius:20,padding:'4px 8px',display:'flex',gap:4,boxShadow:'0 4px 20px rgba(0,0,0,0.5)',zIndex:10 }}>
                      {EMOJIS.map(e => <button key={e} onClick={() => toggleReaction(msg.id,e)} style={{ background:'transparent',border:'none',fontSize:16,cursor:'pointer',padding:'2px 3px' }}>{e}</button>)}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={endRef}/>
          </div>
          <div style={{ padding:'12px 20px 16px',background:'#0f1117',borderTop:'1px solid #1a1d27',flexShrink:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.04)',border:'1px solid #1e2130',borderRadius:12,padding:'8px 8px 8px 14px' }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={'رسالة في #' + (activeChannel?.name || '...')} disabled={sending || !activeChannel}
                style={{ flex:1,background:'transparent',border:'none',fontSize:14,color:'#d4cbbf',direction:'rtl' }}/>
              <button onClick={handleSend} disabled={!input.trim() || sending}
                style={{ background:input.trim()?'#f59e0b':'#2a2d35',border:'none',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'not-allowed',fontSize:16,flexShrink:0,color:input.trim()?'#000':'#4b5263' }}>
                {sending ? '...' : '↵'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
