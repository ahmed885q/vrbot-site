'use client';

import { Card, Button, Steps, Row, Col, Alert, Space, Tag, Divider } from 'antd';
import { DownloadOutlined, PlayCircleOutlined, LinkOutlined, CheckCircleOutlined, WindowsOutlined, MobileOutlined, SettingOutlined, RocketOutlined } from '@ant-design/icons';
import { useLanguage, Language } from '@/lib/i18n';

const LDPLAYER_URL = 'https://www.ldplayer.net/';
const LDPLAYER_DOWNLOAD = 'https://enl.ldplayer.net/download/en';

const t: Record<Language, Record<string, string>> = {
  ar: {
    title: '\uD83D\uDCE5 \u062a\u062d\u0645\u064a\u0644 \u0648\u0625\u0639\u062f\u0627\u062f \u0627\u0644\u0645\u062d\u0627\u0643\u064a',
    subtitle: '\u062d\u0645\u0651\u0644 LDPlayer \u0648\u0631\u0628\u0637\u0647 \u0628\u0640 VRBOT \u0644\u0625\u062f\u0627\u0631\u0629 \u0645\u0632\u0627\u0631\u0639\u0643 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b',
    req_title: '\u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645',
    sys: 'Windows 7+', cpu: 'Intel/AMD', ram: '4 GB+', disk: '10 GB+',
    sys_label: '\u0627\u0644\u0646\u0638\u0627\u0645:', cpu_label: '\u0627\u0644\u0645\u0639\u0627\u0644\u062c:', ram_label: '\u0627\u0644\u0631\u0627\u0645:', disk_label: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629:',
    best_emu: '\u0623\u0641\u0636\u0644 \u0645\u062d\u0627\u0643\u064a \u0623\u0646\u062f\u0631\u0648\u064a\u062f \u0644\u062a\u0634\u063a\u064a\u0644 Viking Rise',
    free: '\u0645\u062c\u0627\u0646\u064a', download_btn: '\u062a\u062d\u0645\u064a\u0644 LDPlayer', visit: '\u0632\u064a\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0631\u0633\u0645\u064a',
    setup_title: '\uD83D\uDEE0\uFE0F \u062e\u0637\u0648\u0627\u062a \u0627\u0644\u0625\u0639\u062f\u0627\u062f',
    s1: '\u062a\u062d\u0645\u064a\u0644 \u0648\u062a\u062b\u0628\u064a\u062a LDPlayer', s1d: '\u062d\u0645\u0651\u0644 LDPlayer \u0645\u0646 \u0627\u0644\u0631\u0627\u0628\u0637 \u0623\u0639\u0644\u0627\u0647 \u0648\u062b\u0628\u0651\u062a\u0647 \u0639\u0644\u0649 \u062c\u0647\u0627\u0632\u0643.',
    s2: '\u0625\u0639\u062f\u0627\u062f \u0627\u0644\u0645\u062d\u0627\u0643\u064a', s2d: '\u0627\u0644\u0631\u0627\u0645: 2-4 GB | \u0627\u0644\u0645\u0639\u0627\u0644\u062c: 2-4 \u0623\u0646\u0648\u064a\u0629 | \u0627\u0644\u062f\u0642\u0629: 1280\u00d7720',
    s3: '\u062a\u062b\u0628\u064a\u062a Viking Rise', s3d: '\u0627\u0641\u062a\u062d Google Play \u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u062d\u0627\u0643\u064a \u0648\u062d\u0645\u0651\u0644 \u0627\u0644\u0644\u0639\u0628\u0629.',
    s4: '\u0631\u0628\u0637 \u0627\u0644\u0645\u062d\u0627\u0643\u064a \u0628\u0640 VRBOT', s4d: '\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644 \u0641\u064a VRBOT \u2192 \u0623\u0636\u0641 \u0645\u0632\u0631\u0639\u0629 \u2192 \u0627\u0646\u0633\u062e \u0627\u0644\u062a\u0648\u0643\u0646 \u2192 \u0634\u063a\u0651\u0644 \u0627\u0644\u0628\u0648\u062a',
    s5: '\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0628\u0648\u062a', s5d: '\u0627\u0636\u063a\u0637 Start Bot \u0648\u0633\u064a\u0628\u062f\u0623 \u0627\u0644\u0628\u0648\u062a \u0628\u0625\u062f\u0627\u0631\u0629 \u0645\u0632\u0631\u0639\u062a\u0643 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b!',
    multi_title: '\uD83D\uDCF1 \u062a\u0634\u063a\u064a\u0644 \u0639\u062f\u0629 \u0645\u0632\u0627\u0631\u0639',
    multi_desc: '\u0644\u062a\u0634\u063a\u064a\u0644 \u0623\u0643\u062b\u0631 \u0645\u0646 \u0645\u0632\u0631\u0639\u0629\u060c \u0627\u0633\u062a\u062e\u062f\u0645 Multi-Instance \u0641\u064a LDPlayer:',
    m1: '\u0627\u0641\u062a\u062d LDMultiPlayer', m1d: '\u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0628\u0631\u0627\u0645\u062c',
    m2: '\u0623\u0646\u0634\u0626 \u0645\u062d\u0627\u0643\u064a\u0627\u062a \u062c\u062f\u064a\u062f\u0629', m2d: '\u0627\u0636\u063a\u0637 Add/Clone \u0644\u0643\u0644 \u0645\u0632\u0631\u0639\u0629',
    m3: '\u062b\u0628\u0651\u062a Viking Rise \u0641\u064a \u0643\u0644 \u0645\u062d\u0627\u0643\u064a', m3d: '\u0633\u062c\u0651\u0644 \u0628\u062d\u0633\u0627\u0628 \u0645\u062e\u062a\u0644\u0641',
    m4: '\u0631\u0628\u0637 \u0643\u0644 \u0645\u062d\u0627\u0643\u064a \u0628\u0640 VRBOT', m4d: '\u0643\u0644 \u0645\u0632\u0631\u0639\u0629 \u0644\u0647\u0627 \u062a\u0648\u0643\u0646 \u062e\u0627\u0635',
    tip: '\uD83D\uDCA1 \u0644\u0643\u0644 \u0645\u0632\u0631\u0639\u0629 \u062a\u062d\u062a\u0627\u062c \u0645\u062d\u0627\u0643\u064a \u0645\u0646\u0641\u0635\u0644 (~2GB \u0631\u0627\u0645).',
    pricing: '\uD83D\uDCB0 \u0627\u0644\u062a\u0633\u0639\u064a\u0631',
    free_trial: '\u0645\u0632\u0631\u0639\u0629 \u0648\u0627\u062d\u062f\u0629 \u0645\u062c\u0627\u0646\u064a\u0629 \u0644\u0645\u062f\u0629 \u0623\u0633\u0628\u0648\u0639',
    paid: '$2 / \u0645\u0632\u0631\u0639\u0629 / \u0634\u0647\u0631',
    manage: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0632\u0627\u0631\u0639', buy: '\u0634\u0631\u0627\u0621 \u0645\u0632\u0627\u0631\u0639',
  },
  en: {
    title: '\uD83D\uDCE5 Download & Setup',
    subtitle: 'Download LDPlayer and connect it to VRBOT for automated farm management',
    req_title: 'System Requirements',
    sys: 'Windows 7+', cpu: 'Intel/AMD', ram: '4 GB+', disk: '10 GB+',
    sys_label: 'OS:', cpu_label: 'CPU:', ram_label: 'RAM:', disk_label: 'Storage:',
    best_emu: 'Best Android emulator for Viking Rise',
    free: 'Free', download_btn: 'Download LDPlayer', visit: 'Visit Official Website',
    setup_title: '\uD83D\uDEE0\uFE0F Setup Steps',
    s1: 'Download & Install LDPlayer', s1d: 'Download LDPlayer from the link above and install it.',
    s2: 'Configure Emulator', s2d: 'RAM: 2-4 GB | CPU: 2-4 cores | Resolution: 1280\u00d7720',
    s3: 'Install Viking Rise', s3d: 'Open Google Play inside the emulator and download the game.',
    s4: 'Connect to VRBOT', s4d: 'Login to VRBOT \u2192 Add farm \u2192 Copy token \u2192 Start bot',
    s5: 'Start the Bot', s5d: 'Press Start Bot and it will manage your farm automatically!',
    multi_title: '\uD83D\uDCF1 Running Multiple Farms',
    multi_desc: 'To run more than one farm, use Multi-Instance in LDPlayer:',
    m1: 'Open LDMultiPlayer', m1d: 'From program menu',
    m2: 'Create new instances', m2d: 'Press Add/Clone for each farm',
    m3: 'Install Viking Rise in each', m3d: 'Sign in with different accounts',
    m4: 'Connect each to VRBOT', m4d: 'Each farm has its own token',
    tip: '\uD83D\uDCA1 Each farm needs a separate emulator (~2GB RAM).',
    pricing: '\uD83D\uDCB0 Pricing',
    free_trial: 'One farm free for a week',
    paid: '$2 / farm / month',
    manage: 'Manage Farms', buy: 'Buy Farms',
  },
  ru: {
    title: '\uD83D\uDCE5 \u0421\u043a\u0430\u0447\u0430\u0442\u044c \u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c',
    subtitle: '\u0421\u043a\u0430\u0447\u0430\u0439\u0442\u0435 LDPlayer \u0438 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u043a VRBOT',
    req_title: '\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f',
    sys: 'Windows 7+', cpu: 'Intel/AMD', ram: '4 GB+', disk: '10 GB+',
    sys_label: '\u041e\u0421:', cpu_label: '\u041f\u0440\u043e\u0446\u0435\u0441\u0441\u043e\u0440:', ram_label: '\u041e\u0417\u0423:', disk_label: '\u0414\u0438\u0441\u043a:',
    best_emu: '\u041b\u0443\u0447\u0448\u0438\u0439 \u044d\u043c\u0443\u043b\u044f\u0442\u043e\u0440 \u0434\u043b\u044f Viking Rise',
    free: '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e', download_btn: '\u0421\u043a\u0430\u0447\u0430\u0442\u044c LDPlayer', visit: '\u041e\u0444\u0438\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439 \u0441\u0430\u0439\u0442',
    setup_title: '\uD83D\uDEE0\uFE0F \u0428\u0430\u0433\u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438',
    s1: '\u0421\u043a\u0430\u0447\u0430\u0442\u044c LDPlayer', s1d: '\u0421\u043a\u0430\u0447\u0430\u0439\u0442\u0435 \u0438 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435.',
    s2: '\u041d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c \u044d\u043c\u0443\u043b\u044f\u0442\u043e\u0440', s2d: '\u041e\u0417\u0423: 2-4 GB | \u042f\u0434\u0440\u0430: 2-4 | 1280\u00d7720',
    s3: '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c Viking Rise', s3d: '\u0418\u0437 Google Play \u0432 \u044d\u043c\u0443\u043b\u044f\u0442\u043e\u0440\u0435.',
    s4: '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a VRBOT', s4d: '\u0412\u043e\u0439\u0442\u0438 \u2192 \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0444\u0435\u0440\u043c\u0443 \u2192 \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u043e\u043a\u0435\u043d',
    s5: '\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0431\u043e\u0442\u0430', s5d: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 Start Bot!',
    multi_title: '\uD83D\uDCF1 \u041d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0444\u0435\u0440\u043c',
    multi_desc: '\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 Multi-Instance:',
    m1: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c LDMultiPlayer', m1d: '\u0418\u0437 \u043c\u0435\u043d\u044e',
    m2: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u044d\u043a\u0437\u0435\u043c\u043f\u043b\u044f\u0440\u044b', m2d: 'Add/Clone \u0434\u043b\u044f \u043a\u0430\u0436\u0434\u043e\u0439 \u0444\u0435\u0440\u043c\u044b',
    m3: '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u0432 \u043a\u0430\u0436\u0434\u044b\u0439', m3d: '\u0420\u0430\u0437\u043d\u044b\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u044b',
    m4: '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u0430\u0436\u0434\u044b\u0439', m4d: '\u0423 \u043a\u0430\u0436\u0434\u043e\u0439 \u0444\u0435\u0440\u043c\u044b \u0441\u0432\u043e\u0439 \u0442\u043e\u043a\u0435\u043d',
    tip: '\uD83D\uDCA1 \u041a\u0430\u0436\u0434\u0430\u044f \u0444\u0435\u0440\u043c\u0430 = \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0439 \u044d\u043c\u0443\u043b\u044f\u0442\u043e\u0440 (~2GB).',
    pricing: '\uD83D\uDCB0 \u0426\u0435\u043d\u044b',
    free_trial: '\u041e\u0434\u043d\u0430 \u0444\u0435\u0440\u043c\u0430 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e \u043d\u0430 \u043d\u0435\u0434\u0435\u043b\u044e',
    paid: '$2 / \u0444\u0435\u0440\u043c\u0430 / \u043c\u0435\u0441\u044f\u0446',
    manage: '\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435', buy: '\u041a\u0443\u043f\u0438\u0442\u044c',
  },
  zh: {
    title: '\uD83D\uDCE5 \u4e0b\u8f7d\u4e0e\u8bbe\u7f6e',
    subtitle: '\u4e0b\u8f7d LDPlayer \u5e76\u8fde\u63a5\u5230 VRBOT',
    req_title: '\u7cfb\u7edf\u8981\u6c42',
    sys: 'Windows 7+', cpu: 'Intel/AMD', ram: '4 GB+', disk: '10 GB+',
    sys_label: '\u7cfb\u7edf:', cpu_label: 'CPU:', ram_label: '\u5185\u5b58:', disk_label: '\u5b58\u50a8:',
    best_emu: 'Viking Rise \u6700\u4f73\u5b89\u5353\u6a21\u62df\u5668',
    free: '\u514d\u8d39', download_btn: '\u4e0b\u8f7d LDPlayer', visit: '\u8bbf\u95ee\u5b98\u7f51',
    setup_title: '\uD83D\uDEE0\uFE0F \u8bbe\u7f6e\u6b65\u9aa4',
    s1: '\u4e0b\u8f7d\u5b89\u88c5 LDPlayer', s1d: '\u4ece\u4e0a\u65b9\u94fe\u63a5\u4e0b\u8f7d\u5e76\u5b89\u88c5\u3002',
    s2: '\u914d\u7f6e\u6a21\u62df\u5668', s2d: '\u5185\u5b58: 2-4 GB | \u6838\u5fc3: 2-4 | 1280\u00d7720',
    s3: '\u5b89\u88c5 Viking Rise', s3d: '\u5728\u6a21\u62df\u5668\u4e2d\u6253\u5f00 Google Play \u4e0b\u8f7d\u3002',
    s4: '\u8fde\u63a5\u5230 VRBOT', s4d: '\u767b\u5f55 \u2192 \u6dfb\u52a0\u519c\u573a \u2192 \u590d\u5236\u4ee4\u724c \u2192 \u542f\u52a8',
    s5: '\u542f\u52a8\u673a\u5668\u4eba', s5d: '\u70b9\u51fb Start Bot \u5f00\u59cb\u81ea\u52a8\u7ba1\u7406\uff01',
    multi_title: '\uD83D\uDCF1 \u8fd0\u884c\u591a\u4e2a\u519c\u573a',
    multi_desc: '\u4f7f\u7528 LDPlayer \u591a\u5f00:',
    m1: '\u6253\u5f00 LDMultiPlayer', m1d: '\u4ece\u7a0b\u5e8f\u83dc\u5355',
    m2: '\u521b\u5efa\u65b0\u5b9e\u4f8b', m2d: '\u4e3a\u6bcf\u4e2a\u519c\u573a Add/Clone',
    m3: '\u5728\u6bcf\u4e2a\u4e2d\u5b89\u88c5', m3d: '\u4f7f\u7528\u4e0d\u540c\u8d26\u53f7',
    m4: '\u8fde\u63a5\u6bcf\u4e2a\u5230 VRBOT', m4d: '\u6bcf\u4e2a\u519c\u573a\u6709\u81ea\u5df1\u7684\u4ee4\u724c',
    tip: '\uD83D\uDCA1 \u6bcf\u4e2a\u519c\u573a\u9700\u8981\u4e00\u4e2a\u6a21\u62df\u5668 (~2GB)',
    pricing: '\uD83D\uDCB0 \u4ef7\u683c',
    free_trial: '\u4e00\u4e2a\u519c\u573a\u514d\u8d39\u4e00\u5468',
    paid: '$2 / \u519c\u573a / \u6708',
    manage: '\u7ba1\u7406\u519c\u573a', buy: '\u8d2d\u4e70\u519c\u573a',
  },
};

export default function DownloadPage() {
  const { lang, mounted, isRtl } = useLanguage();
  if (!mounted) return null;
  const s = t[lang];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{s.title}</h1>
        <p style={{ color: '#666', fontSize: 16 }}>{s.subtitle}</p>
      </div>

      <Alert message={s.req_title} description={
        <Row gutter={16}>
          <Col xs={12} sm={6}><strong>{s.sys_label}</strong> {s.sys}</Col>
          <Col xs={12} sm={6}><strong>{s.cpu_label}</strong> {s.cpu}</Col>
          <Col xs={12} sm={6}><strong>{s.ram_label}</strong> {s.ram}</Col>
          <Col xs={12} sm={6}><strong>{s.disk_label}</strong> {s.disk}</Col>
        </Row>
      } type="info" showIcon style={{ marginBottom: 24 }} />

      <Card style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: '8px 0' }}>LDPlayer 9</h2>
        <p style={{ color: '#888' }}>{s.best_emu}</p>
        <Space><Tag color="green">{s.free}</Tag><Tag color="blue">Windows</Tag><Tag color="purple">Android 9+</Tag></Space>
        <div style={{ marginTop: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 400 }}>
            <Button type="primary" size="large" icon={<DownloadOutlined />} href={LDPLAYER_DOWNLOAD} target="_blank" block style={{ height: 56, fontSize: 18 }}>{s.download_btn}</Button>
            <Button size="large" icon={<LinkOutlined />} href={LDPLAYER_URL} target="_blank" block>{s.visit}</Button>
          </Space>
        </div>
      </Card>

      <Card title={s.setup_title} style={{ marginBottom: 24 }}>
        <Steps direction="vertical" current={-1} items={[
          { title: s.s1, description: s.s1d, icon: <DownloadOutlined /> },
          { title: s.s2, description: s.s2d, icon: <SettingOutlined /> },
          { title: s.s3, description: s.s3d, icon: <MobileOutlined /> },
          { title: s.s4, description: s.s4d, icon: <LinkOutlined /> },
          { title: s.s5, description: s.s5d, icon: <RocketOutlined /> },
        ]} />
      </Card>

      <Card title={s.multi_title} style={{ marginBottom: 24 }}>
        <p>{s.multi_desc}</p>
        <Steps direction="vertical" size="small" current={-1} items={[
          { title: s.m1, description: s.m1d },
          { title: s.m2, description: s.m2d },
          { title: s.m3, description: s.m3d },
          { title: s.m4, description: s.m4d },
        ]} />
        <Divider />
        <Alert message={s.tip} type="warning" showIcon />
      </Card>

      <Card style={{ textAlign: 'center' }}>
        <h3>{s.pricing}</h3>
        <Row gutter={16} justify="center">
          <Col><Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{s.free_trial}</Tag></Col>
          <Col><Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>{s.paid}</Tag></Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" href="/farms" icon={<PlayCircleOutlined />}>{s.manage}</Button>
            <Button href="/billing" icon={<DownloadOutlined />}>{s.buy}</Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
