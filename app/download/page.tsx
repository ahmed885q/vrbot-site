'use client';

import {
  Card,
  Button,
  Steps,
  Row,
  Col,
  Alert,
  Space,
  Tag,
  Divider,
} from 'antd';
import {
  DownloadOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  WindowsOutlined,
  MobileOutlined,
  SettingOutlined,
  RocketOutlined,
} from '@ant-design/icons';

const LDPLAYER_URL = 'https://www.ldplayer.net/';
const LDPLAYER_DOWNLOAD = 'https://enl.ldplayer.net/download/en';

export default function DownloadPage() {
  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          📥 تحميل وإعداد المحاكي
        </h1>
        <p style={{ color: '#666', fontSize: 16 }}>
          حمّل LDPlayer وربطه بـ VRBOT لإدارة مزارعك تلقائياً
        </p>
      </div>

      {/* Requirements */}
      <Alert
        message="متطلبات النظام"
        description={
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <strong>النظام:</strong> Windows 7+
            </Col>
            <Col xs={12} sm={6}>
              <strong>المعالج:</strong> Intel/AMD
            </Col>
            <Col xs={12} sm={6}>
              <strong>الرام:</strong> 4 GB+
            </Col>
            <Col xs={12} sm={6}>
              <strong>المساحة:</strong> 10 GB+
            </Col>
          </Row>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Download Button */}
      <Card style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/en/thumb/5/51/LDPlayer_Logo.png/220px-LDPlayer_Logo.png"
            alt="LDPlayer"
            style={{ height: 60, marginBottom: 12 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h2 style={{ margin: '8px 0' }}>LDPlayer 9</h2>
          <p style={{ color: '#888' }}>أفضل محاكي أندرويد لتشغيل Viking Rise</p>
          <Space>
            <Tag color="green">مجاني</Tag>
            <Tag color="blue">Windows</Tag>
            <Tag color="purple">Android 9+</Tag>
          </Space>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 400 }}>
          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            href={LDPLAYER_DOWNLOAD}
            target="_blank"
            block
            style={{ height: 56, fontSize: 18 }}
          >
            تحميل LDPlayer
          </Button>
          <Button
            size="large"
            icon={<LinkOutlined />}
            href={LDPLAYER_URL}
            target="_blank"
            block
          >
            زيارة الموقع الرسمي
          </Button>
        </Space>
      </Card>

      {/* Setup Steps */}
      <Card title="🛠️ خطوات الإعداد" style={{ marginBottom: 24 }}>
        <Steps
          direction="vertical"
          current={-1}
          items={[
            {
              title: 'تحميل وتثبيت LDPlayer',
              description: (
                <div>
                  <p>حمّل LDPlayer من الرابط أعلاه وثبّته على جهازك.</p>
                  <Tag icon={<WindowsOutlined />} color="blue">Windows فقط</Tag>
                </div>
              ),
              icon: <DownloadOutlined />,
            },
            {
              title: 'إعداد المحاكي',
              description: (
                <div>
                  <p>افتح LDPlayer واضبط الإعدادات التالية:</p>
                  <ul style={{ paddingRight: 20, margin: '8px 0' }}>
                    <li>الرام: 2-4 GB لكل محاكي</li>
                    <li>المعالج: 2-4 أنوية</li>
                    <li>الدقة: 1280×720 (لأفضل أداء)</li>
                    <li>فعّل VT (Virtualization Technology) من BIOS</li>
                  </ul>
                </div>
              ),
              icon: <SettingOutlined />,
            },
            {
              title: 'تثبيت Viking Rise',
              description: (
                <div>
                  <p>افتح Google Play داخل المحاكي وحمّل لعبة Viking Rise.</p>
                  <p>سجّل دخول بحساب Google الخاص بالمزرعة.</p>
                </div>
              ),
              icon: <MobileOutlined />,
            },
            {
              title: 'ربط المحاكي بـ VRBOT',
              description: (
                <div>
                  <p>بعد تثبيت اللعبة:</p>
                  <ol style={{ paddingRight: 20, margin: '8px 0' }}>
                    <li>سجّل دخول في <a href="/login">VRBOT</a></li>
                    <li>اذهب لصفحة <a href="/farms">المزارع</a> وأضف مزرعة جديدة</li>
                    <li>انسخ التوكن الخاص بمزرعتك</li>
                    <li>شغّل البوت من صفحة <a href="/bot">التحكم</a></li>
                  </ol>
                </div>
              ),
              icon: <LinkOutlined />,
            },
            {
              title: 'تشغيل البوت',
              description: (
                <div>
                  <p>اضغط <strong>Start Bot</strong> من الداشبورد وسيبدأ البوت بإدارة مزرعتك تلقائياً!</p>
                  <Tag icon={<CheckCircleOutlined />} color="green">جاهز للعمل</Tag>
                </div>
              ),
              icon: <RocketOutlined />,
            },
          ]}
        />
      </Card>

      {/* Multi-Instance */}
      <Card title="📱 تشغيل عدة مزارع" style={{ marginBottom: 24 }}>
        <p>لتشغيل أكثر من مزرعة، استخدم ميزة <strong>Multi-Instance</strong> في LDPlayer:</p>
        <Steps
          direction="vertical"
          size="small"
          current={-1}
          items={[
            {
              title: 'افتح LDMultiPlayer',
              description: 'من قائمة البرامج → LDMultiPlayer (يأتي مع LDPlayer)',
            },
            {
              title: 'أنشئ محاكيات جديدة',
              description: 'اضغط Add / Clone لإنشاء محاكي لكل مزرعة',
            },
            {
              title: 'ثبّت Viking Rise في كل محاكي',
              description: 'سجّل بحساب مختلف لكل مزرعة',
            },
            {
              title: 'ربط كل محاكي بـ VRBOT',
              description: 'كل مزرعة لها توكن خاص — أضفها من صفحة المزارع',
            },
          ]}
        />

        <Divider />

        <Alert
          message="💡 نصيحة"
          description="لكل مزرعة تحتاج محاكي منفصل. تأكد أن جهازك يتحمل العدد المطلوب (كل محاكي يحتاج ~2GB رام)."
          type="warning"
          showIcon
        />
      </Card>

      {/* Pricing Reminder */}
      <Card style={{ textAlign: 'center' }}>
        <h3>💰 التسعير</h3>
        <Row gutter={16} justify="center">
          <Col>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              مزرعة واحدة مجانية لمدة أسبوع
            </Tag>
          </Col>
          <Col>
            <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
              $2 / مزرعة / شهر
            </Tag>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" href="/farms" icon={<PlayCircleOutlined />}>
              إدارة المزارع
            </Button>
            <Button href="/billing" icon={<DownloadOutlined />}>
              شراء مزارع
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
