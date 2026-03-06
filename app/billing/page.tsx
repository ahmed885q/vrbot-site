'use client';

import { useState } from 'react';
import { Card, Button, InputNumber, Space, Statistic, Alert, Row, Col, Divider, Radio } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, SafetyCertificateOutlined, CheckCircleOutlined, CreditCardOutlined, WalletOutlined } from '@ant-design/icons';
import { useLanguage, Language } from '@/lib/i18n';

const FARM_PRICE = 3;

const t: Record<Language, Record<string, string>> = {
  ar: {
    title: '\uD83D\uDCB3 \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643',
    subtitle: '\u0623\u0636\u0641 \u0645\u0632\u0627\u0631\u0639 \u062C\u062F\u064A\u062F\u0629 \u0644\u062D\u0633\u0627\u0628\u0643',
    success_title: '\u2705 \u062A\u0645 \u0627\u0644\u062F\u0641\u0639 \u0628\u0646\u062C\u0627\u062D!',
    success_desc: '\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0645\u0632\u0627\u0631\u0639 \u0627\u0644\u062C\u062D\u064A\u062D\u0629 \u0641\u064A \u062D\u0633\u0627\u0628\u0643. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0622\u0646 \u0625\u062F\u0627\u0631\u062A\u0647\u0627 \u0645\u0646 \u0635\u0641\u062D\u0629 \u0627\u0644\u0645\u0632\u0627\u0631\u0639.',
    manage_farms: '\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0632\u0627\u0631\u0639',
    need_pay: '\u062A\u062D\u062A\u0627\u062C \u062F\u0641\u0639 \u0644\u0625\u0636\u0627\u0641\u0629 \u0645\u0632\u0627\u0631\u0639 \u062C\u062F\u064A\u062F\u0629',
    choose_pay: '\u0627\u062E\u062A\u0631 \u0639\u062F\u062F \u0627\u0644\u0645\u0632\u0627\u0631\u0639 \u0648\u0627\u062F\u0641\u0639',
    buy_farms: '\uD83C\uDF3E \u0634\u0631\u0627\u0621 \u0645\u0632\u0627\u0631\u0639',
    farm_count: '\u0639\u062F\u062F \u0627\u0644\u0645\u0632\u0627\u0631\u0639:',
    farm_unit: '\u0645\u0632\u0631\u0639\u0629',
    total: '\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A',
    per_month: '/ \u0634\u0647\u0631',
    pay_method: '\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639:',
    pay_card: '\u0628\u0637\u0627\u0642\u0629 / Alipay / WeChat',
    pay_paypal: 'PayPal',
    loading: '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0648\u064A\u0644...',
    pay_now: '\u0627\u062F\u0641\u0639 \u0627\u0644\u0622\u0646',
    secure: '\u062F\u0641\u0639 \u0622\u0645\u0646 \u0648\u0645\u0634\u0641\u0631',
    what_you_get: '\u2705 \u0645\u0627\u0630\u0627 \u062A\u062D\u0635\u0644 \u0645\u0639 \u0643\u0644 \u0645\u0632\u0631\u0639\u0629:',
    f1: '\u0632\u0631\u0627\u0639\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 24/7',
    f2: '\u062C\u0645\u0639 \u0627\u0644\u0645\u0648\u0627\u0631\u062F',
    f3: '\u0628\u0646\u0627\u0621 \u0648\u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u0645\u0628\u0627\u0646\u064A',
    f4: '\u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u062A',
    f5: '\u0625\u0631\u0633\u0627\u0644 \u0648\u062C\u0645\u0639 \u0627\u0644\u0647\u062F\u0627\u064A\u0627',
    f6: '\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0628\u0631\u064A\u062F',
    f7: '\u0639\u0644\u0627\u062C \u0627\u0644\u062C\u0631\u062D\u0649',
    f8: '\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0641\u064A \u0627\u0644\u062A\u062C\u0645\u0639\u0627\u062A',
    err_checkout: '\u0641\u0634\u0644 \u0641\u064A \u0628\u062F\u0621 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u0641\u0639',
    err_connection: '\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.',
    methods_supported: '\u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u062D\u0639\u0648\u0645\u0629',
  },
  en: {
    title: '\uD83D\uDCB3 Billing & Subscription',
    subtitle: 'Add new farms to your account',
    success_title: '\u2705 Payment Successful!',
    success_desc: 'Your new farms have been activated. You can manage them from the farms page.',
    manage_farms: 'Manage Farms',
    need_pay: 'Payment required to add new farms',
    choose_pay: 'Choose the number of farms and pay',
    buy_farms: '\uD83C\uDF3E Buy Farms',
    farm_count: 'Number of farms:',
    farm_unit: 'farm',
    total: 'Total Amount',
    per_month: '/ month',
    pay_method: 'Payment method:',
    pay_card: 'Card / Alipay / WeChat',
    pay_paypal: 'PayPal',
    loading: 'Redirecting...',
    pay_now: 'Pay Now',
    secure: 'Secure & encrypted payment',
    what_you_get: '\u2705 What you get with each farm:',
    f1: 'Auto farming 24/7',
    f2: 'Resource collection',
    f3: 'Building & upgrading',
    f4: 'Troop training',
    f5: 'Send & collect gifts',
    f6: 'Read mail',
    f7: 'Heal wounded',
    f8: 'Rally participation',
    err_checkout: 'Failed to start checkout',
    err_connection: 'Connection error. Try again.',
    methods_supported: 'Supported payment methods',
  },
  ru: {
    title: '\uD83D\uDCB3 \u041E\u043F\u043B\u0430\u0442\u0430 \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0430',
    subtitle: '\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043D\u043E\u0432\u044B\u0435 \u0444\u0435\u0440\u043C\u044B \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442',
    success_title: '\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u0430!',
    success_desc: '\u041D\u043E\u0432\u044B\u0435 \u0444\u0435\u0440\u043C\u044B \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u044B. \u0423\u043F\u0440\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u0438\u043C\u0438 \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0444\u0435\u0440\u043C.',
    manage_farms: '\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0444\u0435\u0440\u043C\u0430\u043C\u0438',
    need_pay: '\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043E\u043F\u043B\u0430\u0442\u0430 \u0434\u043B\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0444\u0435\u0440\u043C',
    choose_pay: '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0444\u0435\u0440\u043C \u0438 \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u0435',
    buy_farms: '\uD83C\uDF3E \u041A\u0443\u043F\u0438\u0442\u044C \u0444\u0435\u0440\u043C\u044B',
    farm_count: '\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0444\u0435\u0440\u043C:',
    farm_unit: '\u0444\u0435\u0440\u043C\u0430',
    total: '\u0418\u0442\u043E\u0433\u043E',
    per_month: '/ \u043C\u0435\u0441\u044F\u0446',
    pay_method: '\u0421\u043F\u043E\u0441\u043E\u0431 \u043E\u043F\u043B\u0430\u0442\u044B:',
    pay_card: '\u041A\u0430\u0440\u0442\u0430 / Alipay / WeChat',
    pay_paypal: 'PayPal',
    loading: '\u041F\u0435\u0440\u0435\u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435...',
    pay_now: '\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u044C',
    secure: '\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u0430\u044F \u0438 \u0437\u0430\u0448\u0438\u0444\u0440\u043E\u0432\u0430\u043D\u043D\u0430\u044F \u043E\u043F\u043B\u0430\u0442\u0430',
    what_you_get: '\u2705 \u0427\u0442\u043E \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043A\u0430\u0436\u0434\u0443\u044E \u0444\u0435\u0440\u043C\u0443:',
    f1: '\u0410\u0432\u0442\u043E-\u0444\u0435\u0440\u043C\u0430 24/7',
    f2: '\u0421\u0431\u043E\u0440 \u0440\u0435\u0441\u0443\u0440\u0441\u043E\u0432',
    f3: '\u0421\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E \u0438 \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435',
    f4: '\u0422\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 \u0432\u043E\u0439\u0441\u043A',
    f5: '\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0438 \u0441\u0431\u043E\u0440 \u043F\u043E\u0434\u0430\u0440\u043A\u043E\u0432',
    f6: '\u0427\u0442\u0435\u043D\u0438\u0435 \u043F\u043E\u0447\u0442\u044B',
    f7: '\u041B\u0435\u0447\u0435\u043D\u0438\u0435 \u0440\u0430\u043D\u0435\u043D\u044B\u0445',
    f8: '\u0423\u0447\u0430\u0441\u0442\u0438\u0435 \u0432 \u0440\u0430\u043B\u043B\u0438',
    err_checkout: '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0447\u0430\u0442\u044C \u043E\u043F\u043B\u0430\u0442\u0443',
    err_connection: '\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.',
    methods_supported: '\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0435 \u0441\u043F\u043E\u0441\u043E\u0431\u044B \u043E\u043F\u043B\u0430\u0442\u044B',
  },
  zh: {
    title: '\uD83D\uDCB3 \u4ED8\u6B3E\u4E0E\u8BA2\u9605',
    subtitle: '\u6DFB\u52A0\u65B0\u519C\u573A\u5230\u60A8\u7684\u8D26\u6237',
    success_title: '\u2705 \u4ED8\u6B3E\u6210\u529F\uFF01',
    success_desc: '\u65B0\u519C\u573A\u5DF2\u6FC0\u6D3B\u3002\u60A8\u53EF\u4EE5\u5728\u519C\u573A\u9875\u9762\u7BA1\u7406\u5B83\u4EEC\u3002',
    manage_farms: '\u7BA1\u7406\u519C\u573A',
    need_pay: '\u6DFB\u52A0\u65B0\u519C\u573A\u9700\u8981\u4ED8\u6B3E',
    choose_pay: '\u9009\u62E9\u519C\u573A\u6570\u91CF\u5E76\u4ED8\u6B3E',
    buy_farms: '\uD83C\uDF3E \u8D2E\u4E70\u519C\u573A',
    farm_count: '\u519C\u573A\u6570\u91CF:',
    farm_unit: '\u519C\u573A',
    total: '\u603B\u91D1\u989D',
    per_month: '/ \u6708',
    pay_method: '\u4ED8\u6B3E\u65B9\u5F0F:',
    pay_card: '\u94F6\u884C\u5361 / \u652F\u4ED8\u5B9D / \u5FAE\u4FE1',
    pay_paypal: 'PayPal',
    loading: '\u6B63\u5728\u8DF3\u8F6C...',
    pay_now: '\u7ACB\u5373\u4ED8\u6B3E',
    secure: '\u5B89\u5168\u52A0\u5BC6\u4ED8\u6B3E',
    what_you_get: '\u2705 \u6BCF\u4E2A\u519C\u573A\u5305\u542B:',
    f1: '24/7 \u81EA\u52A8\u79CD\u690D',
    f2: '\u8D44\u6E90\u6536\u96C6',
    f3: '\u5EFA\u7B51\u5347\u7EA7',
    f4: '\u8BAD\u7EC3\u58EB\u5175',
    f5: '\u53D1\u9001\u548C\u6536\u96C6\u793C\u7269',
    f6: '\u9605\u8BFB\u90AE\u4EF6',
    f7: '\u6CBB\u7597\u4F24\u5458',
    f8: '\u53C2\u4E0E\u96C6\u7ED3',
    err_checkout: '\u65E0\u6CD5\u5F00\u59CB\u7ED3\u8D26',
    err_connection: '\u8FDE\u63A5\u9519\u8BEF\u3002\u8BF7\u91CD\u8BD5\u3002',
    methods_supported: '\u652F\u6301\u7684\u4ED8\u6B3E\u65B9\u5F0F',
  },
};

type PayMethod = 'card' | 'paypal';

export default function BillingPage() {
  const { lang, mounted, isRtl } = useLanguage();
  const [farmCount, setFarmCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');

  if (!mounted) return null;

  const s = t[lang];
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const action = params?.get('action');
  const checkoutSuccess = params?.get('checkout');
  const totalPrice = (farmCount * FARM_PRICE).toFixed(2);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = payMethod === 'card'
        ? '/api/billing/lemonsqueezy-checkout'
        : '/api/billing/checkout';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farms: farmCount, email: '' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || s.err_checkout);
      }
    } catch {
      setError(s.err_connection);
    } finally {
      setLoading(false);
    }
  };

  const payMethodColor = payMethod === 'card' ? '#7c3aed' : '#0070ba';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{s.title}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{s.subtitle}</p>

      {checkoutSuccess === 'success' && (
        <Alert
          message={s.success_title}
          description={s.success_desc}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button type="primary" href="/dashboard">{s.manage_farms}</Button>}
        />
      )}

      {action === 'add-farm' && (
        <Alert
          message={s.need_pay}
          description={s.choose_pay}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <h2 style={{ marginBottom: 16 }}>{s.buy_farms}</h2>

        <Row gutter={24} align="middle">
          <Col xs={24} sm={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{s.farm_count}</label>
              <InputNumber
                min={1} max={500} value={farmCount}
                onChange={(val) => setFarmCount(val || 1)}
                size="large" style={{ width: '100%' }}
                addonAfter={s.farm_unit}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                {[1, 5, 10, 25, 50, 100].map((num) => (
                  <Button key={num} size="small"
                    type={farmCount === num ? 'primary' : 'default'}
                    onClick={() => setFarmCount(num)}>{num}</Button>
                ))}
              </Space>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <Card style={{ background: '#f6ffed', border: '2px solid #52c41a', textAlign: 'center' }}>
              <Statistic
                title={s.total}
                value={totalPrice}
                prefix={<DollarOutlined />}
                valueStyle={{ fontSize: 36, color: '#52c41a', fontWeight: 700 }}
              />
              <p style={{ color: '#888', fontSize: 12, margin: '8px 0 0' }}>
                {farmCount} {s.farm_unit} &times; ${FARM_PRICE} = ${totalPrice} {s.per_month}
              </p>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Payment Method Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, fontSize: 15 }}>
            {s.pay_method}
          </label>
          <Radio.Group
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            size="large"
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio.Button
                value="card"
                style={{
                  width: '100%', height: 56, display: 'flex', alignItems: 'center',
                  borderColor: payMethod === 'card' ? '#7c3aed' : undefined,
                  background: payMethod === 'card' ? 'rgba(124,58,237,0.05)' : undefined,
                }}
              >
                <CreditCardOutlined style={{ fontSize: 20, marginRight: 10, color: '#7c3aed' }} />
                <span style={{ fontWeight: 600 }}>{s.pay_card}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#888' }}>
                  Visa &bull; Mastercard &bull; Alipay &bull; WeChat Pay &bull; Apple Pay &bull; Google Pay
                </span>
              </Radio.Button>
              <Radio.Button
                value="paypal"
                style={{
                  width: '100%', height: 56, display: 'flex', alignItems: 'center',
                  borderColor: payMethod === 'paypal' ? '#0070ba' : undefined,
                  background: payMethod === 'paypal' ? 'rgba(0,112,186,0.05)' : undefined,
                }}
              >
                <WalletOutlined style={{ fontSize: 20, marginRight: 10, color: '#0070ba' }} />
                <span style={{ fontWeight: 600 }}>{s.pay_paypal}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#888' }}>
                  PayPal &bull; Debit &bull; Credit
                </span>
              </Radio.Button>
            </Space>
          </Radio.Group>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />
        )}

        <Button
          type="primary"
          size="large"
          icon={<ShoppingCartOutlined />}
          onClick={handleCheckout}
          loading={loading}
          block
          style={{
            height: 56, fontSize: 18,
            background: payMethodColor,
            borderColor: payMethodColor,
          }}
        >
          {loading ? s.loading : `${s.pay_now} $${totalPrice}`}
        </Button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#888', fontSize: 12 }}>{s.secure}</span>
          </Space>
        </div>

        {/* Payment methods icons */}
        <div style={{ textAlign: 'center', marginTop: 16, padding: '12px 0', borderTop: '1px solid #f0f0f0' }}>
          <p style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>{s.methods_supported}</p>
          <Space size={12} wrap>
            {['Visa', 'Mastercard', 'Alipay', 'WeChat Pay', 'Apple Pay', 'Google Pay', 'PayPal', 'UnionPay'].map((m) => (
              <span key={m} style={{
                background: '#f5f5f5', padding: '4px 10px', borderRadius: 6,
                fontSize: 11, color: '#666', fontWeight: 500,
              }}>{m}</span>
            ))}
          </Space>
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
