'use client';

import { useState } from 'react';
import { Card, Button, InputNumber, Space, Statistic, Alert, Row, Col, Divider } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, SafetyCertificateOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useLanguage, Language } from '@/lib/i18n';

const FARM_PRICE = 2;

const t: Record<Language, Record<string, string>> = {
  ar: {
    title: '\uD83D\uDCB3 \u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643',
    subtitle: '\u0623\u0636\u0641 \u0645\u0632\u0627\u0631\u0639 \u062c\u062f\u064a\u062f\u0629 \u0644\u062d\u0633\u0627\u0628\u0643 \u0639\u0628\u0631 PayPal',
    success_title: '\u2705 \u062a\u0645 \u0627\u0644\u062f\u0641\u0639 \u0628\u0646\u062c\u0627\u062d!',
    success_desc: '\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0645\u0632\u0627\u0631\u0639 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0641\u064a \u062d\u0633\u0627\u0628\u0643. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0625\u062f\u0627\u0631\u062a\u0647\u0627 \u0645\u0646 \u0635\u0641\u062d\u0629 \u0627\u0644\u0645\u0632\u0627\u0631\u0639.',
    manage_farms: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0632\u0627\u0631\u0639',
    need_pay: '\u062a\u062d\u062a\u0627\u062c \u062f\u0641\u0639 \u0644\u0625\u0636\u0627\u0641\u0629 \u0645\u0632\u0627\u0631\u0639 \u062c\u062f\u064a\u062f\u0629',
    choose_pay: '\u0627\u062e\u062a\u0631 \u0639\u062f\u062f \u0627\u0644\u0645\u0632\u0627\u0631\u0639 \u0648\u0627\u062f\u0641\u0639 \u0639\u0628\u0631 PayPal',
    buy_farms: '\uD83C\uDF3E \u0634\u0631\u0627\u0621 \u0645\u0632\u0627\u0631\u0639',
    farm_count: '\u0639\u062f\u062f \u0627\u0644\u0645\u0632\u0627\u0631\u0639:',
    farm_unit: '\u0645\u0632\u0631\u0639\u0629',
    total: '\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a',
    per_month: '/ \u0634\u0647\u0631',
    loading_paypal: '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0625\u0644\u0649 PayPal...',
    pay_via: '\u0627\u062f\u0641\u0639 \u0639\u0628\u0631 PayPal',
    secure: '\u062f\u0641\u0639 \u0622\u0645\u0646 \u0639\u0628\u0631 PayPal',
    what_you_get: '\u2705 \u0645\u0627\u0630\u0627 \u062a\u062d\u0635\u0644 \u0645\u0639 \u0643\u0644 \u0645\u0632\u0631\u0639\u0629:',
    f1: '\u0632\u0631\u0627\u0639\u0629 \u062a\u0644\u0642\u0627\u0626\u064a\u0629 24/7', f2: '\u062c\u0645\u0639 \u0627\u0644\u0645\u0648\u0627\u0631\u062f',
    f3: '\u0628\u0646\u0627\u0621 \u0648\u062a\u0631\u0642\u064a\u0629 \u0627\u0644\u0645\u0628\u0627\u0646\u064a', f4: '\u062a\u062f\u0631\u064a\u0628 \u0627\u0644\u0642\u0648\u0627\u062a',
    f5: '\u0625\u0631\u0633\u0627\u0644 \u0648\u062c\u0645\u0639 \u0627\u0644\u0647\u062f\u0627\u064a\u0627', f6: '\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0628\u0631\u064a\u062f',
    f7: '\u0639\u0644\u0627\u062c \u0627\u0644\u062c\u0631\u062d\u0649', f8: '\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0641\u064a \u0627\u0644\u062a\u062c\u0645\u0639\u0627\u062a',
    err_checkout: '\u0641\u0634\u0644 \u0641\u064a \u0628\u062f\u0621 \u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u062f\u0641\u0639',
    err_connection: '\u062d\u062f\u062b \u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
  },
  en: {
    title: '\uD83D\uDCB3 Billing & Subscription',
    subtitle: 'Add new farms to your account via PayPal',
    success_title: '\u2705 Payment Successful!',
    success_desc: 'Your new farms have been activated. You can manage them from the farms page.',
    manage_farms: 'Manage Farms',
    need_pay: 'Payment required to add new farms',
    choose_pay: 'Choose the number of farms and pay via PayPal',
    buy_farms: '\uD83C\uDF3E Buy Farms',
    farm_count: 'Number of farms:',
    farm_unit: 'farm',
    total: 'Total Amount',
    per_month: '/ month',
    loading_paypal: 'Redirecting to PayPal...',
    pay_via: 'Pay via PayPal',
    secure: 'Secure payment via PayPal',
    what_you_get: '\u2705 What you get with each farm:',
    f1: 'Auto farming 24/7', f2: 'Resource collection',
    f3: 'Building & upgrading', f4: 'Troop training',
    f5: 'Send & collect gifts', f6: 'Read mail',
    f7: 'Heal wounded', f8: 'Rally participation',
    err_checkout: 'Failed to start checkout',
    err_connection: 'Connection error. Try again.',
  },
  ru: {
    title: '\uD83D\uDCB3 \u041e\u043f\u043b\u0430\u0442\u0430 \u0438 \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430',
    subtitle: '\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043d\u043e\u0432\u044b\u0435 \u0444\u0435\u0440\u043c\u044b \u0447\u0435\u0440\u0435\u0437 PayPal',
    success_title: '\u2705 \u041e\u043f\u043b\u0430\u0442\u0430 \u0443\u0441\u043f\u0435\u0448\u043d\u0430!',
    success_desc: '\u041d\u043e\u0432\u044b\u0435 \u0444\u0435\u0440\u043c\u044b \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d\u044b. \u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0438\u043c\u0438 \u0441\u043e \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b \u0444\u0435\u0440\u043c.',
    manage_farms: '\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0444\u0435\u0440\u043c\u0430\u043c\u0438',
    need_pay: '\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u043e\u043f\u043b\u0430\u0442\u0430 \u0434\u043b\u044f \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0444\u0435\u0440\u043c',
    choose_pay: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0444\u0435\u0440\u043c \u0438 \u043e\u043f\u043b\u0430\u0442\u0438\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 PayPal',
    buy_farms: '\uD83C\uDF3E \u041a\u0443\u043f\u0438\u0442\u044c \u0444\u0435\u0440\u043c\u044b',
    farm_count: '\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0444\u0435\u0440\u043c:',
    farm_unit: '\u0444\u0435\u0440\u043c\u0430',
    total: '\u0418\u0442\u043e\u0433\u043e',
    per_month: '/ \u043c\u0435\u0441\u044f\u0446',
    loading_paypal: '\u041f\u0435\u0440\u0435\u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0432 PayPal...',
    pay_via: '\u041e\u043f\u043b\u0430\u0442\u0438\u0442\u044c \u0447\u0435\u0440\u0435\u0437 PayPal',
    secure: '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u0430\u044f \u043e\u043f\u043b\u0430\u0442\u0430 \u0447\u0435\u0440\u0435\u0437 PayPal',
    what_you_get: '\u2705 \u0427\u0442\u043e \u0432\u0445\u043e\u0434\u0438\u0442 \u0432 \u043a\u0430\u0436\u0434\u0443\u044e \u0444\u0435\u0440\u043c\u0443:',
    f1: '\u0410\u0432\u0442\u043e-\u0444\u0435\u0440\u043c\u0430 24/7', f2: '\u0421\u0431\u043e\u0440 \u0440\u0435\u0441\u0443\u0440\u0441\u043e\u0432',
    f3: '\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u0438 \u0443\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u0435', f4: '\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430 \u0432\u043e\u0439\u0441\u043a',
    f5: '\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430 \u0438 \u0441\u0431\u043e\u0440 \u043f\u043e\u0434\u0430\u0440\u043a\u043e\u0432', f6: '\u0427\u0442\u0435\u043d\u0438\u0435 \u043f\u043e\u0447\u0442\u044b',
    f7: '\u041b\u0435\u0447\u0435\u043d\u0438\u0435 \u0440\u0430\u043d\u0435\u043d\u044b\u0445', f8: '\u0423\u0447\u0430\u0441\u0442\u0438\u0435 \u0432 \u0440\u0430\u043b\u043b\u0438',
    err_checkout: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043d\u0430\u0447\u0430\u0442\u044c \u043e\u043f\u043b\u0430\u0442\u0443',
    err_connection: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.',
  },
  zh: {
    title: '\uD83D\uDCB3 \u4ed8\u6b3e\u4e0e\u8ba2\u9605',
    subtitle: '\u901a\u8fc7 PayPal \u6dfb\u52a0\u65b0\u519c\u573a',
    success_title: '\u2705 \u4ed8\u6b3e\u6210\u529f\uff01',
    success_desc: '\u65b0\u519c\u573a\u5df2\u6fc0\u6d3b\u3002\u60a8\u53ef\u4ee5\u5728\u519c\u573a\u9875\u9762\u7ba1\u7406\u5b83\u4eec\u3002',
    manage_farms: '\u7ba1\u7406\u519c\u573a',
    need_pay: '\u6dfb\u52a0\u65b0\u519c\u573a\u9700\u8981\u4ed8\u6b3e',
    choose_pay: '\u9009\u62e9\u519c\u573a\u6570\u91cf\u5e76\u901a\u8fc7 PayPal \u4ed8\u6b3e',
    buy_farms: '\uD83C\uDF3E \u8d2d\u4e70\u519c\u573a',
    farm_count: '\u519c\u573a\u6570\u91cf:',
    farm_unit: '\u519c\u573a',
    total: '\u603b\u91d1\u989d',
    per_month: '/ \u6708',
    loading_paypal: '\u6b63\u5728\u8df3\u8f6c\u5230 PayPal...',
    pay_via: '\u901a\u8fc7 PayPal \u4ed8\u6b3e',
    secure: '\u901a\u8fc7 PayPal \u5b89\u5168\u4ed8\u6b3e',
    what_you_get: '\u2705 \u6bcf\u4e2a\u519c\u573a\u5305\u542b:',
    f1: '24/7 \u81ea\u52a8\u79cd\u690d', f2: '\u8d44\u6e90\u6536\u96c6',
    f3: '\u5efa\u7b51\u5347\u7ea7', f4: '\u8bad\u7ec3\u58eb\u5175',
    f5: '\u53d1\u9001\u548c\u6536\u96c6\u793c\u7269', f6: '\u9605\u8bfb\u90ae\u4ef6',
    f7: '\u6cbb\u7597\u4f24\u5458', f8: '\u53c2\u4e0e\u96c6\u7ed3',
    err_checkout: '\u65e0\u6cd5\u5f00\u59cb\u7ed3\u8d26',
    err_connection: '\u8fde\u63a5\u9519\u8bef\u3002\u8bf7\u91cd\u8bd5\u3002',
  },
};

export default function BillingPage() {
  const { lang, mounted, isRtl } = useLanguage();
  const [farmCount, setFarmCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!mounted) return null;
  const s = t[lang];

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
        body: JSON.stringify({ farms: farmCount, email: '' }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { setError(data.error || s.err_checkout); }
    } catch {
      setError(s.err_connection);
    } finally { setLoading(false); }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{s.title}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{s.subtitle}</p>

      {checkoutSuccess === 'success' && (
        <Alert message={s.success_title} description={s.success_desc} type="success" showIcon style={{ marginBottom: 16 }}
          action={<Button type="primary" href="/farms">{s.manage_farms}</Button>} />
      )}
      {action === 'add-farm' && (
        <Alert message={s.need_pay} description={s.choose_pay} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card>
        <h2 style={{ marginBottom: 16 }}>{s.buy_farms}</h2>
        <Row gutter={24} align="middle">
          <Col xs={24} sm={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{s.farm_count}</label>
              <InputNumber min={1} max={500} value={farmCount} onChange={(val) => setFarmCount(val || 1)} size="large" style={{ width: '100%' }} addonAfter={s.farm_unit} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                {[1, 5, 10, 25, 50, 100].map((num) => (
                  <Button key={num} size="small" type={farmCount === num ? 'primary' : 'default'} onClick={() => setFarmCount(num)}>{num}</Button>
                ))}
              </Space>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <Card style={{ background: '#f6ffed', border: '2px solid #52c41a', textAlign: 'center' }}>
              <Statistic title={s.total} value={totalPrice} prefix={<DollarOutlined />} valueStyle={{ fontSize: 36, color: '#52c41a', fontWeight: 700 }} />
              <p style={{ color: '#888', fontSize: 12, margin: '8px 0 0' }}>
                {farmCount} {s.farm_unit} \u00d7 ${FARM_PRICE} = ${totalPrice} {s.per_month}
              </p>
            </Card>
          </Col>
        </Row>
        <Divider />
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}
        <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={handlePayPalCheckout} loading={loading} block
          style={{ height: 56, fontSize: 18, background: '#0070ba', borderColor: '#0070ba' }}>
          {loading ? s.loading_paypal : `${s.pay_via} $${totalPrice}`}
        </Button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Space><SafetyCertificateOutlined style={{ color: '#52c41a' }} /><span style={{ color: '#888', fontSize: 12 }}>{s.secure}</span></Space>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>{s.what_you_get}</h3>
        <Row gutter={16}>
          {[s.f1, s.f2, s.f3, s.f4, s.f5, s.f6, s.f7, s.f8].map((feature) => (
            <Col xs={12} sm={8} key={feature} style={{ marginBottom: 8 }}>
              <Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><span>{feature}</span></Space>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
