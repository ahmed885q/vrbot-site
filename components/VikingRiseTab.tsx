import React, { useState, useEffect } from 'react';
import { VikingRiseSystem } from './VikingRiseSystem';
import { Card, Button, Badge, Row } from './ui';

const VikingRiseTab: React.FC = () => {
  const [system] = useState(new VikingRiseSystem());
  const [stats, setStats] = useState<any>(null);
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  
  useEffect(() => {
    loadSystemData();
  }, []);
  
  const loadSystemData = async () => {
    const systemStats = system.getSystemStats();
    setStats(systemStats);
    
    // محاكاة بيانات البوتات
    const mockBots = [
      {
        id: 'bot_001',
        name: 'مزارع المدينة',
        type: 'farming',
        status: 'running',
        stats: { tasksCompleted: 45, successRate: 95 }
      },
      {
        id: 'bot_002',
        name: 'مدرب الجيش',
        type: 'training',
        status: 'running',
        stats: { tasksCompleted: 32, successRate: 88 }
      },
      {
        id: 'bot_003',
        name: 'باني الحصون',
        type: 'building',
        status: 'idle',
        stats: { tasksCompleted: 28, successRate: 92 }
      }
    ];
    
    setBots(mockBots);
  };
  
  const handleStartBot = async (botId: string) => {
    await system.startBot(botId);
    loadSystemData();
  };
  
  const handleStopBot = async (botId: string) => {
    await system.stopBot(botId);
    loadSystemData();
  };
  
  const handleViewDetails = (botId: string) => {
    setSelectedBot(botId);
    // هنا يمكن الانتقال إلى صفحة تفصيلية للبوت
  };
  
  return (
    <div className="viking-rise-tab">
      {/* لوحة الإحصائيات الرئيسية */}
      <Card title="🛡️ Viking Rise Dashboard" className="mb-4">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
            <div style={{ fontWeight: 900, marginBottom: '8px' }}>🤖 البوتات النشطة</div>
            <h3 style={{ margin: 0, color: '#1890ff', fontSize: '24px', fontWeight: 900 }}>
              {stats?.activeBots || 0}/{stats?.totalBots || 0}
            </h3>
          </div>
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
            <div style={{ fontWeight: 900, marginBottom: '8px' }}>📊 المهام النشطة</div>
            <h3 style={{ margin: 0, color: '#52c41a', fontSize: '24px', fontWeight: 900 }}>
              {stats?.activeTasks || 0}
            </h3>
          </div>
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
            <div style={{ fontWeight: 900, marginBottom: '8px' }}>💰 الموارد المجمعة</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              ذهب: {stats?.totalResources?.gold || 0}
            </div>
          </div>
          
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
            <div style={{ fontWeight: 900, marginBottom: '8px' }}>🛡️ أمان النظام</div>
            <Badge
              label={stats?.detectionRisk < 30 ? 'آمن' : 'تحذير'}
              bg={stats?.detectionRisk < 30 ? '#dcfce7' : '#fef3c7'}
              color={stats?.detectionRisk < 30 ? '#166534' : '#92400e'}
            />
          </div>
        </div>
      </Card>
      
      {/* قائمة البوتات */}
      <Card title="🤖 البوتات المتاحة" className="mb-4">
        {bots.map((bot) => (
          <Row
            key={bot.id}
            left={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{bot.name}</span>
                <Badge
                  label={bot.type}
                  bg="#e0f2fe"
                  color="#0369a1"
                />
              </div>
            }
            right={
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant={bot.status === 'running' ? 'danger' : 'primary'}
                  onClick={() => 
                    bot.status === 'running' 
                      ? handleStopBot(bot.id)
                      : handleStartBot(bot.id)
                  }
                >
                  {bot.status === 'running' ? '⏹️ إيقاف' : '🚀 تشغيل'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleViewDetails(bot.id)}
                >
                  📊 تفاصيل
                </Button>
              </div>
            }
          />
        ))}
        
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button variant="primary" onClick={() => {/* تسجيل بوت جديد */}}>
            ➕ إضافة بوت جديد
          </Button>
        </div>
      </Card>
      
      {/* البث المباشر */}
      <Card title="📺 البث المباشر" className="mb-4">
        <div style={{ 
          background: '#1a1a1a', 
          borderRadius: '8px', 
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
            <p>جاري الاتصال بخادم البث...</p>
            <Button variant="primary" style={{ marginTop: '16px' }}>
              ▶️ تشغيل البث
            </Button>
          </div>
        </div>
      </Card>
      
      {/* التقارير السريعة */}
      <Card title="📈 تقرير الأداء">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700 }}>نسبة النجاح</div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: '#e5e7eb', 
              borderRadius: '4px',
              margin: '8px 0'
            }}>
              <div style={{ 
                width: `${bots.reduce((acc, b) => acc + b.stats.successRate, 0) / bots.length || 0}%`, 
                height: '100%', 
                background: '#10b981' 
              }} />
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              متوسط: {Math.round(bots.reduce((acc, b) => acc + b.stats.successRate, 0) / bots.length || 0)}%
            </div>
          </div>
          
          <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 700 }}>وقت التشغيل</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#1890ff' }}>
              {stats?.uptime ? Math.round(stats.uptime / 3600000) : 0} ساعة
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VikingRiseTab;