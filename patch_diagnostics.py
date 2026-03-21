"""
patch_diagnostics.py
شغّله من مجلد vrbot-site:
  python patch_diagnostics.py
"""
from pathlib import Path

FILE = Path("app/admin/diagnostics/page.tsx")
if not FILE.exists():
    print("❌ شغّله من مجلد vrbot-site")
    exit(1)

content = FILE.read_text(encoding="utf-8")

# ══════════════════════════════════════════════
# 1. أضف state للـ Agent في أول useState block
# ══════════════════════════════════════════════
OLD_STATE = "  const [retryData, setRetryData]     = useState<any>(null)\n  const [retryLoading, setRetryLoading] = useState(false)"
NEW_STATE = """  const [retryData, setRetryData]     = useState<any>(null)
  const [retryLoading, setRetryLoading] = useState(false)
  const [agentData, setAgentData]     = useState<any>(null)
  const [agentLoading, setAgentLoading] = useState(false)
  const [discordOnline, setDiscordOnline] = useState<number>(0)"""

content = content.replace(OLD_STATE, NEW_STATE, 1)

# ══════════════════════════════════════════════
# 2. أضف fetch للـ Agent بعد fetchRetryData
# ══════════════════════════════════════════════
OLD_FETCH = "  useEffect(() => {\n    if (tab === 'smart_retry') fetchRetryData()\n  }, [tab, fetchRetryData])"
NEW_FETCH = """  useEffect(() => {
    if (tab === 'smart_retry') fetchRetryData()
  }, [tab, fetchRetryData])

  const fetchAgentData = useCallback(async () => {
    setAgentLoading(true)
    try {
      const [farmsRes, batchRes, tasksRes] = await Promise.all([
        fetch('https://cloud.vrbot.me/api/farms/status', { headers: { 'X-API-Key': 'vrbot_admin_2026' } }),
        fetch('http://88.99.64.19:8888/api/batch/status',  { headers: { 'X-API-Key': 'vrbot_admin_2026' } }),
        fetch('http://88.99.64.19:8888/api/tasks/today',   { headers: { 'X-API-Key': 'vrbot_admin_2026' } }),
      ])
      const farms = farmsRes.ok ? await farmsRes.json() : {}
      const batch = batchRes.ok ? await batchRes.json() : {}
      const tasks = tasksRes.ok ? await tasksRes.json() : {}
      setAgentData({ farms, batch, tasks, ts: new Date().toLocaleTimeString('ar') })
    } catch(e) { console.error(e) }
    finally { setAgentLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'agent' || tab === 'discord') fetchAgentData()
  }, [tab, fetchAgentData])"""

content = content.replace(OLD_FETCH, NEW_FETCH, 1)

# ══════════════════════════════════════════════
# 3. أضف تابين في القائمة
# ══════════════════════════════════════════════
OLD_TABS = "{ k: 'smart_retry', l: '🧠 Smart Retry', n: retryData?.total_solutions ?? null },"
NEW_TABS = """{ k: 'smart_retry', l: '🧠 Smart Retry', n: retryData?.total_solutions ?? null },
          { k: 'agent',       l: '🤖 Ultra Agent', n: null },
          { k: 'discord',     l: '🎮 Discord',     n: null },"""

content = content.replace(OLD_TABS, NEW_TABS, 1)

# ══════════════════════════════════════════════
# 4. أضف محتوى التابين قبل إغلاق Tab Content
# ══════════════════════════════════════════════
OLD_CLOSE = "      </div>\n\n      {/* ── Timestamp"
NEW_CLOSE = """      </div>

        {/* ══ ULTRA AGENT TAB ══ */}
        {tab === 'agent' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div>
                <h2 style={{ margin:0, fontSize:'20px', fontWeight:800, background:'linear-gradient(135deg,#00d4aa,#0095ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  🤖 VRBOT Ultra Agent v3.0
                </h2>
                <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#666' }}>Phase 1 · Phase 2 · Phase 3 — يعمل على Hetzner كل 6 ساعات</p>
              </div>
              <button onClick={fetchAgentData} style={S.btn('#00d4aa','#000')} disabled={agentLoading}>
                {agentLoading ? '...' : '↻ تحديث'}
              </button>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', marginBottom:'20px' }}>
              {[
                { l:'إجمالي المزارع',  v: agentData?.farms?.farms?.length ?? 20,     c:'#00d4aa' },
                { l:'تعمل الآن',       v: agentData?.farms?.farms?.filter((f:any)=>f.live_status==='running').length ?? 0, c:'#0095ff' },
                { l:'مهام اليوم',      v: agentData?.tasks?.total ?? 0,              c:'#ff9500' },
                { l:'معدل النجاح',     v: agentData?.tasks?.total > 0 ? Math.round(agentData.tasks.ok/agentData.tasks.total*100)+'%' : 'N/A', c:'#22c55e' },
                { l:'Batch الحالي',    v: '#'+(agentData?.batch?.current_batch?.number ?? '?'), c:'#a855f7' },
                { l:'معدل الخطأ',      v: agentData?.batch?.error_rate ?? '0%',       c:'#ef4444' },
              ].map((s,i) => (
                <div key={i} style={S.stat(s.c)}>
                  <div style={{ fontSize:'22px', fontWeight:800, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* المراحل */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'12px', marginBottom:'20px' }}>
              {[
                { phase:'Phase 1', title:'Core Analysis + PRs', color:'#00d4aa', items:['جلب logs من Hetzner API','تحليل المهام الفاشلة','بحث في GitHub + Stack Overflow','إنشاء PR تلقائي بالإصلاح'] },
                { phase:'Phase 2', title:'Self-Eval + Strategy', color:'#0095ff', items:['تقييم ذاتي بـ 5 معايير','8 استراتيجيات + UCB1 Algorithm','جمع بيانات Fine-tuning JSONL','تقرير نقاط الضعف'] },
                { phase:'Phase 3', title:'Multi-Agent + Goals', color:'#a855f7', items:['6 Agents: Research→Code→Test','أهداف مستقلة تلقائية','Specialist Agents للمهام الصعبة','دورة كل 6 ساعات تلقائياً'] },
              ].map((p,i) => (
                <div key={i} style={{ background:'#0d1117', border:`1px solid ${p.color}30`, borderRadius:'12px', overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${p.color}20`, background:`${p.color}10` }}>
                    <span style={{ fontSize:'11px', color:p.color, fontWeight:700, fontFamily:'monospace' }}>{p.phase}</span>
                    <span style={{ fontSize:'14px', fontWeight:700, color:'#fff', marginRight:'8px' }}> {p.title}</span>
                  </div>
                  <div style={{ padding:'12px 16px' }}>
                    {p.items.map((item,j) => (
                      <div key={j} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', borderBottom: j<3 ? '1px solid #1e2630' : 'none' }}>
                        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:p.color, flexShrink:0 }}/>
                        <span style={{ fontSize:'12px', color:'#888' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* المزارع */}
            {agentData?.farms?.farms && (
              <div style={{ background:'#0d1117', border:'1px solid #1e2630', borderRadius:'12px', padding:'16px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'#c8d8e8', marginBottom:'12px' }}>
                  🖥️ حالة المزارع ({agentData.farms.farms.length})
                  <span style={{ marginRight:'8px', fontSize:'11px', color:'#666' }}>آخر تحديث: {agentData.ts}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))', gap:'6px' }}>
                  {agentData.farms.farms.map((f:any) => {
                    const color = f.live_status==='running'?'#00d4aa':f.live_status==='error'?'#ef4444':'#4a5a6a'
                    return (
                      <div key={f.farm_id} style={{ background:`${color}10`, border:`1px solid ${color}30`, borderRadius:'8px', padding:'8px', textAlign:'center' }}>
                        <div style={{ fontSize:'10px', color:color, fontWeight:700 }}>farm_{f.farm_id}</div>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, margin:'4px auto 0', boxShadow:`0 0 6px ${color}` }}/>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ DISCORD TAB ══ */}
        {tab === 'discord' && (
          <div>
            <div style={{ marginBottom:'20px' }}>
              <h2 style={{ margin:0, fontSize:'20px', fontWeight:800, color:'#5865F2' }}>🎮 Discord Integration</h2>
              <p style={{ margin:'4px 0 0', fontSize:'12px', color:'#666' }}>بوت Discord مع 6 أوامر Slash + إشعارات تلقائية</p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'16px' }}>

              {/* Bot Commands */}
              <div style={{ background:'#0d1117', border:'1px solid #5865F230', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #1e2630', background:'#5865F215', display:'flex', alignItems:'center', gap:'10px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.013.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  <span style={{ fontWeight:700, color:'#fff' }}>Slash Commands</span>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  {[
                    ['/status', 'حالة 20 مزرعة مباشرة'],
                    ['/farms',  'تفاصيل كل مزرعة'],
                    ['/agent',  'حالة Ultra Agent'],
                    ['/prs',    'آخر PRs على GitHub'],
                    ['/cycle',  'شغّل دورة يدوياً'],
                    ['/report', 'تقرير اليوم'],
                  ].map(([cmd,desc],i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom: i<5 ? '1px solid #1e2630':'none' }}>
                      <code style={{ background:'#5865F220', color:'#5865F2', padding:'2px 8px', borderRadius:'4px', fontSize:'12px', fontWeight:700, minWidth:'72px', textAlign:'center', flexShrink:0 }}>{cmd}</code>
                      <span style={{ fontSize:'12px', color:'#888' }}>{desc}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:'14px', background:'#0a0a0f', borderRadius:'8px', padding:'12px' }}>
                    <div style={{ fontSize:'11px', color:'#666', marginBottom:'6px' }}>تشغيل البوت:</div>
                    <code style={{ fontSize:'12px', color:'#00d4aa' }}>python discord_bot.py</code>
                  </div>
                </div>
              </div>

              {/* Auto Notifications */}
              <div style={{ background:'#0d1117', border:'1px solid #5865F230', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #1e2630', background:'#5865F215' }}>
                  <span style={{ fontWeight:700, color:'#fff' }}>🔔 الإشعارات التلقائية</span>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  {[
                    ['🔄','بدء كل دورة'],
                    ['✅','اكتمال الدورة + نتائج'],
                    ['🚀','PR جديد على GitHub'],
                    ['⚠️','مهمة فاشلة'],
                    ['❌','خطأ حرج في السيرفر'],
                    ['📅','تقرير كل 6 ساعات'],
                  ].map(([emoji,event],i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom: i<5?'1px solid #1e2630':'none' }}>
                      <span style={{ fontSize:'13px', color:'#c8d8e8' }}>{emoji} {event}</span>
                      <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'50px', background:'#00d4aa15', color:'#00d4aa', border:'1px solid #00d4aa30' }}>✓ نشط</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup */}
              <div style={{ background:'#0d1117', border:'1px solid #5865F230', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #1e2630', background:'#5865F215' }}>
                  <span style={{ fontWeight:700, color:'#fff' }}>⚙️ الإعداد</span>
                </div>
                <div style={{ padding:'14px 18px' }}>
                  {[
                    ['DISCORD_BOT_TOKEN',  'من discord.com/developers'],
                    ['DISCORD_GUILD_ID',   'كليك يمين على السيرفر'],
                    ['DISCORD_CHANNEL_ID', 'كليك يمين على القناة'],
                  ].map(([key,hint],i) => (
                    <div key={i} style={{ marginBottom:'12px' }}>
                      <div style={{ fontSize:'11px', color:'#5865F2', fontFamily:'monospace', fontWeight:700, marginBottom:'4px' }}>{key}</div>
                      <div style={{ fontSize:'11px', color:'#666' }}>{hint}</div>
                    </div>
                  ))}
                  <div style={{ marginTop:'4px', background:'#0a0a0f', borderRadius:'8px', padding:'12px', fontSize:'11px' }}>
                    <div style={{ color:'#666', marginBottom:'8px' }}>أضف في .env ثم:</div>
                    <code style={{ color:'#00d4aa', display:'block', marginBottom:'4px' }}>pip install discord.py</code>
                    <code style={{ color:'#00d4aa' }}>python discord_bot.py</code>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── Timestamp"""

content = content.replace(OLD_CLOSE, NEW_CLOSE, 1)

FILE.write_text(content, encoding="utf-8")
print("✅ تمت الإضافة!")
print("   تابان جديدان: 🤖 Ultra Agent + 🎮 Discord")
print("   شغّل: npm run dev")
