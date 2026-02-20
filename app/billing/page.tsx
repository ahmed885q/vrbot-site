'use client';

import { useState } from 'react';
import {
  Card,
  Button,
  InputNumber,
  Space,
  Statistic,
  Alert,
  Spin,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const FARM_PRICE = 2;

export default function BillingPage() {
  const [farmCount, setFarmCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL params for success/cancel
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const action = params?.get('action');
  const checkoutSuccess = params?.get('checkout');

  const totalPrice = (farmCount * FARM_PRICE).toFixed(2);

  const handlePayPalCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farms: farmCount,
          email: '', // Will be filled by PayPal
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'فشل في بدء عملية الدفع');
      }
    } catch {
      setError('حدث خطأ في الاتصال. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        💳 الدفع والاشتراك
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        أضف مزارع جديدة لحسابك عبر PayPal
      </p>

      {checkoutSuccess === 'success' && (
        <Alert
          message="✅ تم الدفع بنجاح!"
          description="تم تفعيل المزارع الجديدة في حسابك. يمكنك الآن إدارتها من صفحة المزارع."
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button type="primary" href="/farms">
              إدارة المزارع
            </Button>
          }
        />
      )}

      {action === 'add-farm' && (
        <Alert
          message="تحتاج دفع لإضافة مزارع جديدة"
          description="اختر عدد المزارع وادفع عبر PayPal"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Pricing Calculator */}
      <Card>
        <h2 style={{ marginBottom: 16 }}>🌾 شراء مزارع</h2>

        <Row gutter={24} align="middle">
          <Col xs={24} sm={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                عدد المزارع:
              </label>
              <InputNumber
                min={1}
                max={500}
                value={farmCount}
                onChange={(val) => setFarmCount(val || 1)}
                size="large"
                style={{ width: '100%' }}
                addonAfter="مزرعة"
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <Space>
                {[1, 5, 10, 25, 50, 100].map((num) => (
                  <Button
                    key={num}
                    size="small"
                    type={farmCount === num ? 'primary' : 'default'}
                    onClick={() => setFarmCount(num)}
                  >
                    {num}
                  </Button>
                ))}
              </Space>
            </div>
          </Col>

          <Col xs={24} sm={12}>
            <Card
              style={{
                background: '#f6ffed',
                border: '2px solid #52c41a',
                textAlign: 'center',
              }}
            >
              <Statistic
                title="المبلغ الإجمالي"
                value={totalPrice}
                prefix={<DollarOutlined />}
                valueStyle={{ fontSize: 36, color: '#52c41a', fontWeight: 700 }}
              />
              <p style={{ color: '#888', fontSize: 12, margin: '8px 0 0' }}>
                {farmCount} مزرعة × ${FARM_PRICE} = ${totalPrice} / شهر
              </p>
            </Card>
          </Col>
        </Row>

        <Divider />

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError('')}
          />
        )}

        <Button
          type="primary"
          size="large"
          icon={<ShoppingCartOutlined />}
          onClick={handlePayPalCheckout}
          loading={loading}
          block
          style={{
            height: 56,
            fontSize: 18,
            background: '#0070ba',
            borderColor: '#0070ba',
          }}
        >
          {loading ? 'جاري التحويل إلى PayPal...' : `ادفع $${totalPrice} عبر PayPal`}
        </Button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#888', fontSize: 12 }}>دفع آمن عبر PayPal</span>
          </Space>
        </div>
      </Card>

      {/* What you get */}
      <Card style={{ marginTop: 16 }}>
        <h3>✅ ماذا تحصل مع كل مزرعة:</h3>
        <Row gutter={16}>
          {[
            'زراعة تلقائية 24/7',
            'جمع الموارد',
            'بناء وترقية المباني',
            'تدريب القوات',
            'إرسال وجمع الهدايا',
            'قراءة البريد',
            'علاج الجرحى',
            'المشاركة في التجمعات',
          ].map((feature) => (
            <Col xs={12} sm={8} key={feature} style={{ marginBottom: 8 }}>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>{feature}</span>
              </Space>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
