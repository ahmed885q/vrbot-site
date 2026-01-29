// ProtectionTab.tsx
import React, { useState } from 'react';
import { Card, Badge, Button } from '@/components/bot/ui';
import { Row, Col, Progress } from 'antd';

const ProtectionTab: React.FC = () => {
  const [protectionStats, setProtectionStats] = useState({
    humanBehaviorScore: 85,
    detectionRisk: 15,
    activeProtections: 7,
    totalActions: 1245,
    stealthMode: false
  });

  const protectionMethods = [
    { name: 'محاكاة السلوك البشري', status: 'active', level: 'high' },
    { name: 'إخفاء التوقيت', status: 'active', level: 'medium' },
    { name: 'تناوب User Agent', status: 'active', level: 'high' },
    { name: 'حماية البصمة', status: 'active', level: 'critical' },
    { name: 'إنذار مبكر', status: 'active', level: 'high' },
  ];

  const toggleStealthMode = () => {
    setProtectionStats(prev => ({
      ...prev,
      stealthMode: !prev.stealthMode
    }));
  };

  return (
    <div className="protection-tab">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="🛡️ لوحة الحماية المتقدمة">
            <Row gutter={[16, 16]}>
              {/* الإحصائيات الرئيسية */}
              <Col span={6}>
                <Card title="🧠 السلوك البشري">
                  <Progress
                    percent={protectionStats.humanBehaviorScore}
                    status={protectionStats.humanBehaviorScore > 70 ? 'success' : 'exception'}
                  />
                  <p style={{ marginTop: 8, fontSize: 12 }}>
                    {protectionStats.humanBehaviorScore > 70 ? 'ممتاز' : 'بحاجة لتحسين'}
                  </p>
                </Card>
              </Col>

              <Col span={6}>
                <Card title="🛡️ خطر الاكتشاف">
                  <Progress
                    percent={protectionStats.detectionRisk}
                    status={protectionStats.detectionRisk < 30 ? 'success' : 'exception'}
                    strokeColor={protectionStats.detectionRisk < 30 ? '#52c41a' : '#ff4d4f'}
                  />
                  <p style={{ marginTop: 8, fontSize: 12 }}>
                    {protectionStats.detectionRisk < 30 ? 'آمن' : 'خطير'}
                  </p>
                </Card>
              </Col>

              <Col span={6}>
                <Card title="⚡ الإجراءات">
                  <h2 style={{ margin: 0, color: '#1890ff' }}>
                    {protectionStats.totalActions.toLocaleString()}
                  </h2>
                  <p style={{ marginTop: 8, fontSize: 12 }}>إجمالي الإجراءات المحمية</p>
                </Card>
              </Col>

              <Col span={6}>
                <Card title="👻 وضع التخفي">
                  <Badge
                    label={protectionStats.stealthMode ? 'مفعل' : 'معطل'}
                    bg={protectionStats.stealthMode ? 'green' : 'gray'}
                    color="white"
                  />
                  <Button
                    variant={protectionStats.stealthMode ? 'danger' : 'primary'}
                    onClick={toggleStealthMode}
                  >
                    {protectionStats.stealthMode ? 'إيقاف التخفي' : 'تفعيل التخفي'}
                  </Button>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* قائمة طرق الحماية */}
        <Col span={12}>
          <Card title="🔧 طرق الحماية النشطة">
            {protectionMethods.map((method, index) => (
              <div key={index} style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{method.name}</span>
                <div>
                  <Badge
                    color={method.status === 'active' ? 'green' : 'red'}
                    label={method.status === 'active' ? 'نشط' : 'معطل'}
                    bg={method.status === 'active' ? 'green' : 'red'}
                  />
                  <span style={{ marginLeft: 8 }}>
                    <Badge
                      color={
                        method.level === 'critical' ? 'red' :
                        method.level === 'high' ? 'orange' :
                        method.level === 'medium' ? 'blue' : 'green'
                      }
                      label={method.level}
                      bg={
                        method.level === 'critical' ? 'red' :
                        method.level === 'high' ? 'orange' :
                        method.level === 'medium' ? 'blue' : 'green'
                      }
                    />
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </Col>

        {/* سجلات الحماية */}
        <Col span={12}>
          <Card title="📝 سجلات الحماية الحديثة">
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {[
                { time: '10:30', action: 'جمع الموارد', protection: 'محاكاة تأخير بشري', status: 'success' },
                { time: '10:25', action: 'تدريب الجنود', protection: 'إخفاء النمط', status: 'success' },
                { time: '10:20', action: 'ترقية المبنى', protection: 'تناوب السلوك', status: 'success' },
                { time: '10:15', action: 'فحص الكشف', protection: 'إنذار مبكر', status: 'warning' },
                { time: '10:10', action: 'تحديث البصمة', protection: 'حماية الهوية', status: 'success' },
              ].map((log, index) => (
                <div key={index} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ color: '#888', fontSize: 12 }}>[{log.time}]</span>
                    <span style={{ marginLeft: 8 }}>{log.action}</span>
                  </div>
                  <div>
                    <Badge
                      label={log.status === 'success' ? 'نجح' : 'تحذير'}
                      bg={log.status === 'success' ? 'green' : 'orange'}
                      color={log.status === 'success' ? 'green' : 'orange'}
                    />
                    <Badge
                      label={log.protection}
                      bg={log.status === 'success' ? 'green' : 'orange'}
                      color={log.status === 'success' ? 'green' : 'orange'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* أزرار التحكم */}
        <Col span={24}>
          <Card title="🎮 تحكم سريع بالحماية">
            <Row gutter={[8, 8]}>
              <Col>
                <Button variant="primary">🔄 تغيير النمط السلوكي</Button>
              </Col>
              <Col>
                <Button variant="ghost">🎭 محاكاة خطأ بشري</Button>
              </Col>
              <Col>
                <Button variant="ghost">📊 تقرير الحماية</Button>
              </Col>
              <Col>
                <Button variant="ghost">⚠️ فحص الكشف</Button>
              </Col>
              <Col>
                <Button variant="danger">🆘 وضع الطوارئ</Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProtectionTab;