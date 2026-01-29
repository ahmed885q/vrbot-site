import React from 'react';
import { Card, Row, Badge, Button } from './ui';  // Corrected import path and removed unavailable components

const ProtectionTab: React.FC = () => {
  const protectionStats = {
    humanBehaviorScore: 85,
    detectionRisk: 15,
    activeProtections: 7,
    totalActions: 1245,
    stealthMode: false
  };

  const protectionMethods = [
    { name: 'محاكاة السلوك البشري', status: 'active', level: 'high' },
    { name: 'إخفاء التوقيت', status: 'active', level: 'medium' },
    { name: 'تناوب User Agent', status: 'active', level: 'high' },
    { name: 'حماية البصمة', status: 'active', level: 'critical' },
  ];

  return (
    <div className="protection-tab">
      <div className="mb-4">
        <Card title="🛡️ لوحة الحماية">
          {/* Replaced Row/Col with a flex-based grid using divs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
              <div style={{ fontWeight: 900, marginBottom: '8px' }}>🧠 السلوك البشري</div>
              {/* Replaced Progress with a simple progress bar */}
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${protectionStats.humanBehaviorScore}%`, height: '100%', background: '#10b981' }} />
              </div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{protectionStats.humanBehaviorScore}%</div>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
              <div style={{ fontWeight: 900, marginBottom: '8px' }}>🛡️ خطر الاكتشاف</div>
              {/* Replaced Progress with a simple progress bar */}
              <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${protectionStats.detectionRisk}%`, height: '100%', background: '#52c41a' }} />
              </div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{protectionStats.detectionRisk}%</div>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
              <div style={{ fontWeight: 900, marginBottom: '8px' }}>🔧 الحمايات</div>
              <h3 style={{ margin: 0, color: '#1890ff', fontSize: '24px', fontWeight: 900 }}>{protectionStats.activeProtections}</h3>
            </div>
            
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
              <div style={{ fontWeight: 900, marginBottom: '8px' }}>👻 وضع التخفي</div>
              {/* Adapted Badge to use the custom Badge component */}
              <Badge
                label={protectionStats.stealthMode ? 'مفعل' : 'معطل'}
                bg={protectionStats.stealthMode ? '#dcfce7' : '#f3f4f6'}
                color={protectionStats.stealthMode ? '#166534' : '#374151'}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card title="طرق الحماية النشطة">
        {protectionMethods.map((method, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 700 }}>{method.name}</span>
            {/* Adapted Badge to use the custom Badge component */}
            <Badge
              label={method.status === 'active' ? 'نشط' : 'معطل'}
              bg={method.status === 'active' ? '#dcfce7' : '#fee2e2'}
              color={method.status === 'active' ? '#166534' : '#991b1b'}
            />
          </div>
        ))}
      </Card>
    </div>
  );
};

export default ProtectionTab;