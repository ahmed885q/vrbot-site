'use client'

import React, { useState, useEffect } from 'react'
import { Badge, Card, Button, Row } from '@/components/bot/ui'
import { windowsAgentService, VikingBot } from '@/modules/viking-rise/services/windowsAgentService'
interface VikingRiseDashboardProps {
  email: string
  userId: string
  plan?: string
  status?: string
}

export default function VikingRiseDashboard({ email, userId, plan, status }: VikingRiseDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'bots' | 'tasks' | 'protection' | 'streams'>('overview')
  const [agentStatus, setAgentStatus] = useState<any>(null)
  const [bots, setBots] = useState<VikingBot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBot, setSelectedBot] = useState<string | null>(null)

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: '📊' },
    { key: 'bots', label: 'البوتات النشطة', icon: '🤖' },
    { key: 'tasks', label: 'المهام المجدولة', icon: '📅' },
    { key: 'protection', label: 'الحماية', icon: '🛡️' },
    { key: 'streams', label: 'البث المباشر', icon: '🎥' },
  ]

  // تحميل حالة الوكيل والبوتات
  useEffect(() => {
    loadAgentStatus()
    loadBots()
    
    // تحديث كل 10 ثواني
    const interval = setInterval(() => {
      if (agentStatus?.isRunning) {
        loadAgentStatus()
        loadBots()
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const loadAgentStatus = async () => {
    setLoading(true)
    try {
      const status = await windowsAgentService.getAgentStatus()
      setAgentStatus(status)
    } catch (error) {
      console.error('فشل تحميل حالة الوكيل:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBots = async () => {
    try {
      const botsData = await windowsAgentService.getBots()
      setBots(botsData)
    } catch (error) {
      console.error('فشل تحميل البوتات:', error)
    }
  }

  const startAgent = async () => {
    setLoading(true)
    try {
      await windowsAgentService.startAgent()
      await loadAgentStatus()
      await loadBots()
    } catch (error) {
      console.error('فشل تشغيل الوكيل:', error)
    } finally {
      setLoading(false)
    }
  }

  const stopAgent = async () => {
    setLoading(true)
    try {
      await windowsAgentService.stopAgent()
      await loadAgentStatus()
    } catch (error) {
      console.error('فشل إيقاف الوكيل:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeTask = async (botId: string, taskType: 'shield' | 'helps' | 'collection') => {
    try {
      await windowsAgentService.executeBotTask(botId, taskType)
      await loadBots()
    } catch (error) {
      console.error(`فشل تنفيذ المهمة ${taskType}:`, error)
    }
  }

  // إحصائيات سريعة
  const quickStats = {
    activeBots: bots.filter(b => b.status === 'active').length,
    totalShields: agentStatus?.statistics?.totalShieldsApplied || 0,
    totalHelps: agentStatus?.statistics?.totalHelpsSent || 0,
    totalResources: agentStatus?.statistics?.totalResourcesCollected || 0,
    successRate: bots.length > 0 
      ? (bots.reduce((sum, b) => sum + (b.successRate || 0), 0) / bots.length) * 100 
      : 0
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* رأس الصفحة */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        padding: 20,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>🎮 Viking Rise Manager</h1>
          <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
            نظام إدارة متكامل لبوتات Viking Rise على Windows
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Badge 
            label={agentStatus?.isRunning ? 'نشط' : 'متوقف'} 
            icon={agentStatus?.isRunning ? '✅' : '⏸️'}
            bg={agentStatus?.isRunning ? '#dcfce7' : '#fee2e2'}
            color={agentStatus?.isRunning ? '#166534' : '#991b1b'}
          />
          <Badge 
            label={`${quickStats.activeBots} بوت نشط`}
            icon="🤖"
            bg="#dbeafe"
            color="#1e40af"
          />
          <Badge 
            label={plan || 'تجريبي'}
            icon="⚡"
            bg="#fef3c7"
            color="#92400e"
          />
        </div>
      </div>

      {/* شريط التحكم */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 20,
        padding: 15,
        borderRadius: 16,
        background: '#fff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ flex: 1 }}>
          <Button
            onClick={startAgent}
            disabled={loading || agentStatus?.isRunning}
          >
            ▶️ تشغيل الوكيل
          </Button>
        </div>
        
        <div style={{ flex: 1 }}>
          <Button
            onClick={stopAgent}
            disabled={loading || !agentStatus?.isRunning}
            variant="danger"
          >
            ⏹️ إيقاف الوكيل
          </Button>
        </div>
        
        <div style={{ flex: 1 }}>
          <Button
            onClick={loadAgentStatus}
            disabled={loading}
            variant="ghost"
          >
            🔄 تحديث
          </Button>
        </div>
        
        <div style={{ flex: 1 }}>
          <Button
            onClick={() => window.open('/api/viking/export', '_blank')}
            variant="ghost"
          >
            📥 تصدير البيانات
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 15,
        marginBottom: 20
      }}>
        <StatCard
          title="البوتات النشطة"
          value={quickStats.activeBots}
          icon="🤖"
          color="#3b82f6"
          subtitle={`من إجمالي ${bots.length}`}
        />
        
        <StatCard
          title="الدروع المطبقة"
          value={quickStats.totalShields}
          icon="🛡️"
          color="#10b981"
          subtitle="حتى الآن"
        />
        
        <StatCard
          title="المساعدات المرسلة"
          value={quickStats.totalHelps}
          icon="🤝"
          color="#f59e0b"
          subtitle="إجمالي المساعدات"
        />
        
        <StatCard
          title="معدل النجاح"
          value={`${quickStats.successRate.toFixed(1)}%`}
          icon="📈"
          color="#8b5cf6"
          subtitle="متوسط النجاح"
        />
      </div>

      {/* التبويبات */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 10
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: `2px solid ${activeTab === tab.key ? '#111827' : '#e5e7eb'}`,
              background: activeTab === tab.key ? '#111827' : 'white',
              color: activeTab === tab.key ? 'white' : '#111827',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      <div style={{ minHeight: 400 }}>
        {activeTab === 'overview' && (
          <OverviewTab 
            agentStatus={agentStatus}
            bots={bots}
            onExecuteTask={executeTask}
            onRefresh={() => {
              loadAgentStatus()
              loadBots()
            }}
          />
        )}
        
        {activeTab === 'bots' && (
          <BotsTab 
            bots={bots}
            selectedBot={selectedBot}
            onSelectBot={setSelectedBot}
            onExecuteTask={executeTask}
          />
        )}
        
        {activeTab === 'tasks' && (
          <TasksTab 
            bots={bots}
            onScheduleTask={executeTask}
          />
        )}
        
        {activeTab === 'protection' && (
          <ProtectionTab 
            agentStatus={agentStatus}
          />
        )}
        
        {activeTab === 'streams' && (
          <StreamsTab 
            bots={bots}
          />
        )}
      </div>

      {/* تذييل الصفحة */}
      <div style={{
        marginTop: 30,
        padding: 15,
        borderRadius: 12,
        background: '#f8fafc',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 13
      }}>
        <p style={{ margin: 0 }}>
          <strong>VRBOT Viking Rise Manager</strong> • الإصدار 2.0.0 • 
          يعمل مع Windows 10/11 • 
          آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
        </p>
        <p style={{ margin: '8px 0 0 0' }}>
          للحصول على الدعم الفني: contact@vrbot.com | 
          <a href="/docs" style={{ marginLeft: 10, color: '#3b82f6', textDecoration: 'none' }}>
            📚 الوثائق
          </a>
        </p>
      </div>
    </div>
  )
}

// مكونات التبويبات الفرعية

function OverviewTab({ agentStatus, bots, onExecuteTask, onRefresh }: any) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card title="حالة النظام" subtitle="معلومات عن الوكيل والنوافذ المكتشفة">
        <div style={{ display: 'grid', gap: 10 }}>
          <Row 
            left="حالة الوكيل" 
            right={
              <Badge 
                label={agentStatus?.isRunning ? 'يعمل بنشاط' : 'متوقف'}
                icon={agentStatus?.isRunning ? '✅' : '⏸️'}
                bg={agentStatus?.isRunning ? '#dcfce7' : '#f3f4f6'}
                color={agentStatus?.isRunning ? '#166534' : '#6b7280'}
              />
            }
          />
          
          <Row 
            left="النوافذ المكتشفة" 
            right={agentStatus?.detectedWindows?.length || 0}
          />
          
          <Row 
            left="وقت التشغيل" 
            right={agentStatus?.statistics?.totalRuntimeHours ? 
              `${agentStatus.statistics.totalRuntimeHours.toFixed(1)} ساعة` : 
              'غير متوفر'
            }
          />
          
          <Row 
            left="آخر تحديث" 
            right={new Date(agentStatus?.lastUpdate || Date.now()).toLocaleTimeString('ar-SA')}
          />
        </div>
        
        <div style={{ marginTop: 15 }}>
          <Button onClick={onRefresh} variant="ghost">
            🔄 تحديث البيانات
          </Button>
        </div>
      </Card>
      
      <Card title="إجراءات سريعة" subtitle="تنفيذ مهام على جميع البوتات النشطة">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <Button 
            onClick={() => {
              bots.forEach((bot: any) => {
                if (bot.status === 'active') {
                  onExecuteTask(bot.id, 'shield')
                }
              })
            }}
            disabled={!agentStatus?.isRunning}
          >
            🛡️ تطبيق درع للجميع
          </Button>
          
          <Button 
            onClick={() => {
              bots.forEach((bot: any) => {
                if (bot.status === 'active') {
                  onExecuteTask(bot.id, 'helps')
                }
              })
            }}
            disabled={!agentStatus?.isRunning}
          >
            🤝 إرسال مساعدات
          </Button>
          
          <Button 
            onClick={() => {
              bots.forEach((bot: any) => {
                if (bot.status === 'active') {
                  onExecuteTask(bot.id, 'collection')
                }
              })
            }}
            disabled={!agentStatus?.isRunning}
          >
            📦 جمع الموارد
          </Button>
          
          <Button 
            onClick={() => window.open('/viking-rise/settings', '_blank')}
            variant="ghost"
          >
            ⚙️ الإعدادات
          </Button>
        </div>
      </Card>
    </div>
  )
}

function BotsTab({ bots, selectedBot, onSelectBot, onExecuteTask }: any) {
  return (
    <Card title="إدارة البوتات" subtitle="البوتات النشطة والمكتشفة تلقائياً">
      {bots.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#6b7280',
          borderRadius: 12,
          background: '#f8fafc',
          border: '2px dashed #e5e7eb'
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
          <h3 style={{ margin: '0 0 10px 0' }}>لا توجد بوتات نشطة</h3>
          <p>قم بتشغيل الوكيل وسيتم اكتشاف نوافذ Viking Rise تلقائياً</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {bots.map((bot: any) => (
            <div 
              key={bot.id}
              style={{
                padding: 15,
                borderRadius: 12,
                border: `2px solid ${selectedBot === bot.id ? '#3b82f6' : '#e5e7eb'}`,
                background: bot.status === 'active' ? '#f0f9ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => onSelectBot(bot.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: bot.status === 'active' ? '#10b981' : '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 18
                  }}>
                    {bot.name.charAt(0)}
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{bot.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>
                      {bot.gameAccount} • {bot.windowTitle?.substring(0, 30)}...
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge 
                    label={bot.status === 'active' ? 'نشط' : 'غير نشط'}
                    bg={bot.status === 'active' ? '#dcfce7' : '#f3f4f6'}
                    color={bot.status === 'active' ? '#166534' : '#6b7280'}
                  />
                  
                  <Badge 
                    label={`${bot.totalActions} إجراء`}
                    bg="#f3f4f6"
                    color="#374151"
                  />
                </div>
              </div>
              
              {selectedBot === bot.id && (
                <div style={{ marginTop: 15, paddingTop: 15, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                    <Button 
                      onClick={() => {
                        onExecuteTask(bot.id, 'shield')
                      }}
                      disabled={bot.status !== 'active'}
                    >
                      🛡️ تطبيق درع
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        onExecuteTask(bot.id, 'helps')
                      }}
                      disabled={bot.status !== 'active'}
                    >
                      🤝 إرسال مساعدات
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        onExecuteTask(bot.id, 'collection')
                      }}
                      disabled={bot.status !== 'active'}
                    >
                      📦 جمع موارد
                    </Button>
                    
                    <Button 
                      onClick={() => window.open(`/viking-rise/bots/${bot.id}`, '_blank')}
                      variant="ghost"
                    >
                      📊 تفاصيل
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function TasksTab({ bots, onScheduleTask }: any) {
  const [scheduledTasks, setScheduledTasks] = useState([
    { id: 1, name: 'تطبيق الدرع', type: 'shield', interval: 'كل 6 ساعات', nextRun: '14:30', enabled: true },
    { id: 2, name: 'إرسال المساعدات', type: 'helps', interval: 'كل ساعتين', nextRun: '13:45', enabled: true },
    { id: 3, name: 'جمع الموارد', type: 'collection', interval: 'كل ساعة', nextRun: '13:15', enabled: false },
  ])

  return (
    <Card title="المهام المجدولة" subtitle="المهام الأوتوماتيكية والمبرمجة">
      <div style={{ display: 'grid', gap: 12 }}>
        {scheduledTasks.map(task => (
          <div key={task.id} style={{
            padding: 15,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: task.enabled ? '#fff' : '#f8fafc',
            opacity: task.enabled ? 1 : 0.7
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{task.name}</div>
                  <Badge 
                    label={task.enabled ? 'مفعل' : 'معطل'}
                    bg={task.enabled ? '#dcfce7' : '#f3f4f6'}
                    color={task.enabled ? '#166534' : '#6b7280'}
                  />
                </div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
                  {task.interval} • التشغيل التالي: {task.nextRun}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <Button 
                  onClick={() => {
                    // تشغيل المهمة فوراً
                    bots.forEach((bot: any) => {
                      if (bot.status === 'active') {
                        onScheduleTask(bot.id, task.type as any)
                      }
                    })
                  }}
                  disabled={!task.enabled}
                >
                  تشغيل الآن
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setScheduledTasks(tasks =>
                      tasks.map(t =>
                        t.id === task.id ? { ...t, enabled: !t.enabled } : t
                      )
                    )
                  }}
                >
                  {task.enabled ? 'تعطيل' : 'تفعيل'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 20 }}>
        <Button 
          onClick={() => {
            setScheduledTasks([
              ...scheduledTasks,
              {
                id: scheduledTasks.length + 1,
                name: 'مهمة جديدة',
                type: 'shield',
                interval: 'كل يوم',
                nextRun: '--:--',
                enabled: true
              }
            ])
          }}
          variant="ghost"
        >
          + إضافة مهمة جديدة
        </Button>
      </div>
    </Card>
  )
}

function ProtectionTab({ agentStatus }: any) {
  const protectionLevels = [
    { name: 'محاكاة السلوك البشري', level: 85, description: 'تأخيرات عشوائية وحركات طبيعية' },
    { name: 'منع اكتشاف الأنماط', level: 90, description: 'تجنب التكرارات المنتظمة' },
    { name: 'تغطية النشاط', level: 70, description: 'إضافة نشاط عشوائي للتمويه' },
    { name: 'حماية البان', level: 95, description: 'مراقبة وإجراءات وقائية' },
  ]

  return (
    <Card title="نظام الحماية" subtitle="حماية ضد اكتشاف البوتات والحظر">
      <div style={{ display: 'grid', gap: 15 }}>
        {protectionLevels.map((item, index) => (
          <div key={index} style={{
            padding: 15,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 900 }}>{item.name}</div>
              <Badge 
                label={`${item.level}%`}
                bg={item.level > 80 ? '#dcfce7' : item.level > 60 ? '#fef3c7' : '#fee2e2'}
                color={item.level > 80 ? '#166534' : item.level > 60 ? '#92400e' : '#991b1b'}
              />
            </div>
            
            <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 10 }}>
              {item.description}
            </div>
            
            <div style={{
              height: 8,
              background: '#e5e7eb',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${item.level}%`,
                height: '100%',
                background: item.level > 80 ? '#10b981' : item.level > 60 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 20, padding: 15, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>نصائح أمان إضافية:</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280' }}>
          <li>استخدم تأخيرات عشوائية بين 1-3 ثواني بين الإجراءات</li>
          <li>غير نمط النقر باستمرار (أعلى/أسفل/يسار/يمين)</li>
          <li>أضف حركات عشوائية بين المهام الرئيسية</li>
          <li>تجنب النقر في نفس الإحداثيات بدقة متناهية</li>
        </ul>
      </div>
    </Card>
  )
}

function StreamsTab({ bots }: any) {
  return (
    <Card title="البث المباشر" subtitle="مشاهدة نوافذ اللعبة مباشرة">
      {bots.filter((b: any) => b.status === 'active').length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: '#6b7280',
          borderRadius: 12,
          background: '#f8fafc',
          border: '2px dashed #e5e7eb'
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🎥</div>
          <h3 style={{ margin: '0 0 10px 0' }}>لا توجد نوافذ نشطة للبث</h3>
          <p>يجب أن يكون الوكيل نشطاً ويكتشف نوافذ Viking Rise</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 15
        }}>
          {bots.filter((b: any) => b.status === 'active').map((bot: any) => (
            <div key={bot.id} style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              background: '#0f172a'
            }}>
              <div style={{
                padding: 12,
                background: '#1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontWeight: 900, color: 'white' }}>{bot.name}</div>
                <Badge 
                  label="مباشر"
                  icon="🔴"
                  bg="#ef4444"
                  color="white"
                />
              </div>
              
              <div style={{
                height: 200,
                background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🎮</div>
                  <div>بث مباشر من {bot.windowTitle}</div>
                  <div style={{ fontSize: 12, marginTop: 5 }}>الدقة: 1080×2400</div>
                </div>
              </div>
              
              <div style={{
                padding: 12,
                background: '#1e293b',
                display: 'flex',
                gap: 8
              }}>
                <Button variant="ghost">
                  ⏸️ إيقاف مؤقت
                </Button>
                <Button variant="ghost">
                  📸 لقطة شاشة
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function StatCard({ title, value, icon, color, subtitle }: any) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      background: '#fff',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#6b7280', fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 32, fontWeight: 900, margin: '8px 0 4px 0' }}>{value}</div>
          {subtitle && (
            <div style={{ color: '#9ca3af', fontSize: 12 }}>{subtitle}</div>
          )}
        </div>
        
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          background: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}