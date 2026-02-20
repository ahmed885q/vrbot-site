'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Modal,
  Input,
  Form,
  Statistic,
  Alert,
  Space,
  Tooltip,
  Badge,
  Popconfirm,
  message,
  Select,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseOutlined,
  ReloadOutlined,
  SettingOutlined,
  CloudDownloadOutlined,
  DashboardOutlined,
  TeamOutlined,
  EyeOutlined,
} from '@ant-design/icons';

// ====== Types ======
interface Farm {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'paused' | 'error';
  gameAccount: string;
  server: string;
  power: number;
  level: number;
  lastActivity: string;
  resourcesCollected: number;
  createdAt: string;
  tasks: {
    farming: boolean;
    building: boolean;
    training: boolean;
    gathering: boolean;
    healing: boolean;
    rally: boolean;
    mail: boolean;
    gifts: boolean;
  };
}

interface Subscription {
  status: 'trialing' | 'active' | 'expired' | 'none';
  trialEndsAt: string | null;
  maxFarms: number;
  paidFarms: number;
}

// ====== Main Component ======
export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [subscription, setSubscription] = useState<Subscription>({
    status: 'none',
    trialEndsAt: null,
    maxFarms: 0,
    paidFarms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [form] = Form.useForm();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://88.99.64.19:3001';

  // ====== Fetch Data ======
  useEffect(() => {
    fetchFarms();
    fetchSubscription();
  }, []);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/farms`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFarms(data.farms || []);
      } else {
        // Demo data for development
        setFarms(getDemoFarms());
      }
    } catch {
      setFarms(getDemoFarms());
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/api/subscription`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        // Demo subscription
        setSubscription({
          status: 'trialing',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          maxFarms: 1,
          paidFarms: 0,
        });
      }
    } catch {
      setSubscription({
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxFarms: 1,
        paidFarms: 0,
      });
    }
  };

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vrbot_token') || '';
    }
    return '';
  };

  // ====== Demo Data ======
  const getDemoFarms = (): Farm[] => [
    {
      id: '1',
      name: 'المزرعة الرئيسية',
      status: 'active',
      gameAccount: 'VikingLord_01',
      server: 'S436',
      power: 15420000,
      level: 25,
      lastActivity: new Date().toISOString(),
      resourcesCollected: 45200,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      tasks: {
        farming: true,
        building: true,
        training: true,
        gathering: true,
        healing: true,
        rally: false,
        mail: true,
        gifts: true,
      },
    },
    {
      id: '2',
      name: 'مزرعة الموارد',
      status: 'paused',
      gameAccount: 'FarmBot_02',
      server: 'S436',
      power: 8300000,
      level: 18,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resourcesCollected: 23100,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      tasks: {
        farming: true,
        building: false,
        training: false,
        gathering: true,
        healing: false,
        rally: false,
        mail: true,
        gifts: true,
      },
    },
  ];

  // ====== Actions ======
  const handleAddFarm = async (values: any) => {
    const canAdd = farms.length < subscription.maxFarms;
    const needsPayment = !canAdd && subscription.status !== 'none';

    if (!canAdd && needsPayment) {
      message.warning('تحتاج دفع $2 لإضافة مزرعة جديدة. سيتم تحويلك لصفحة الدفع.');
      window.location.href = '/billing?action=add-farm';
      return;
    }

    if (subscription.status === 'none') {
      message.info('سيتم تفعيل الفترة التجريبية المجانية (أسبوع واحد، مزرعة واحدة)');
    }

    try {
      const res = await fetch(`${API_URL}/api/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success('تم إضافة المزرعة بنجاح!');
        setAddModalOpen(false);
        form.resetFields();
        fetchFarms();
      } else {
        const err = await res.json();
        message.error(err.error || 'فشل في إضافة المزرعة');
      }
    } catch {
      // Demo mode - add locally
      const newFarm: Farm = {
        id: String(farms.length + 1),
        name: values.name,
        status: 'inactive',
        gameAccount: values.gameAccount,
        server: values.server,
        power: 0,
        level: 1,
        lastActivity: new Date().toISOString(),
        resourcesCollected: 0,
        createdAt: new Date().toISOString(),
        tasks: {
          farming: true,
          building: true,
          training: true,
          gathering: true,
          healing: true,
          rally: false,
          mail: true,
          gifts: true,
        },
      };
      setFarms([...farms, newFarm]);
      message.success('تم إضافة المزرعة بنجاح!');
      setAddModalOpen(false);
      form.resetFields();
    }
  };

  const handleDeleteFarm = async (farmId: string) => {
    try {
      await fetch(`${API_URL}/api/farms/${farmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      // Demo mode
    }
    setFarms(farms.filter((f) => f.id !== farmId));
    message.success('تم حذف المزرعة');
  };

  const handleToggleFarm = async (farmId: string, action: 'start' | 'pause' | 'stop') => {
    const statusMap = { start: 'active', pause: 'paused', stop: 'inactive' } as const;
    try {
      await fetch(`${API_URL}/api/farms/${farmId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      // Demo mode
    }
    setFarms(
      farms.map((f) =>
        f.id === farmId ? { ...f, status: statusMap[action] } : f
      )
    );
    message.success(`تم ${action === 'start' ? 'تشغيل' : action === 'pause' ? 'إيقاف مؤقت' : 'إيقاف'} المزرعة`);
  };

  // ====== Helpers ======
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      inactive: 'default',
      paused: 'orange',
      error: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      active: 'نشط',
      inactive: 'متوقف',
      paused: 'مؤقت',
      error: 'خطأ',
    };
    return texts[status] || status;
  };

  const getTrialDaysLeft = () => {
    if (!subscription.trialEndsAt) return 0;
    const diff = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const activeFarmsCount = farms.filter((f) => f.status === 'active').length;
  const totalResources = farms.reduce((sum, f) => sum + f.resourcesCollected, 0);

  // ====== Table Columns ======
  const columns = [
    {
      title: 'المزرعة',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Farm) => (
        <Space>
          <Badge status={record.status === 'active' ? 'processing' : 'default'} />
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{record.gameAccount}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'السيرفر',
      dataIndex: 'server',
      key: 'server',
      render: (server: string) => <Tag color="blue">{server}</Tag>,
    },
    {
      title: 'القوة',
      dataIndex: 'power',
      key: 'power',
      render: (power: number) => <span style={{ fontWeight: 600 }}>{formatNumber(power)}</span>,
    },
    {
      title: 'المستوى',
      dataIndex: 'level',
      key: 'level',
      render: (level: number) => <Tag color="purple">Lv.{level}</Tag>,
    },
    {
      title: 'الموارد المجمعة',
      dataIndex: 'resourcesCollected',
      key: 'resourcesCollected',
      render: (val: number) => formatNumber(val),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, record: Farm) => (
        <Space size="small">
          {record.status !== 'active' ? (
            <Tooltip title="تشغيل">
              <Button
                type="primary"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleToggleFarm(record.id, 'start')}
              />
            </Tooltip>
          ) : (
            <Tooltip title="إيقاف مؤقت">
              <Button
                size="small"
                icon={<PauseOutlined />}
                onClick={() => handleToggleFarm(record.id, 'pause')}
              />
            </Tooltip>
          )}
          <Tooltip title="التفاصيل">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedFarm(record);
                setDetailModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="الإعدادات">
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => (window.location.href = `/bot?farm=${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="حذف المزرعة"
            description="هل أنت متأكد من حذف هذه المزرعة؟"
            onConfirm={() => handleDeleteFarm(record.id)}
            okText="نعم"
            cancelText="لا"
          >
            <Tooltip title="حذف">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ====== Render ======
  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          🌾 إدارة المزارع
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          أضف وأدر مزارعك في Viking Rise
        </p>
      </div>

      {/* Subscription Alert */}
      {subscription.status === 'trialing' && (
        <Alert
          message={`فترة تجريبية مجانية — متبقي ${getTrialDaysLeft()} أيام`}
          description="لديك مزرعة واحدة مجانية. أضف المزيد بـ $2 لكل مزرعة."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" href="/pricing">
              الترقية
            </Button>
          }
        />
      )}

      {subscription.status === 'expired' && (
        <Alert
          message="انتهت الفترة التجريبية"
          description="قم بالترقية للاستمرار في استخدام المزارع. $2 لكل مزرعة."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" href="/pricing">
              الترقية الآن
            </Button>
          }
        />
      )}

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="إجمالي المزارع"
              value={farms.length}
              suffix={`/ ${subscription.maxFarms || '∞'}`}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="مزارع نشطة"
              value={activeFarmsCount}
              valueStyle={{ color: '#3f8600' }}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="الموارد المجمعة"
              value={formatNumber(totalResources)}
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="الاشتراك"
              value={
                subscription.status === 'active'
                  ? 'PRO'
                  : subscription.status === 'trialing'
                  ? 'تجريبي'
                  : 'غير مفعل'
              }
              valueStyle={{
                color:
                  subscription.status === 'active'
                    ? '#3f8600'
                    : subscription.status === 'trialing'
                    ? '#1890ff'
                    : '#cf1322',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Farms Table */}
      <Card
        title="المزارع"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchFarms}>
              تحديث
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              إضافة مزرعة
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={farms}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: 'لا توجد مزارع. أضف مزرعتك الأولى!' }}
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Pricing Info */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>💰 التسعير</h3>
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center', background: '#f0f9ff' }}>
              <h4>مجاني</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>$0</p>
              <p>مزرعة واحدة لمدة أسبوع</p>
              <p style={{ fontSize: 12, color: '#888' }}>جميع الخيارات متاحة</p>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
              <h4>لكل مزرعة</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>$2</p>
              <p>شهرياً لكل مزرعة</p>
              <p style={{ fontSize: 12, color: '#888' }}>بدون حد أقصى</p>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
              <h4>مثال: 100 مزرعة</h4>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>$200</p>
              <p>شهرياً</p>
              <p style={{ fontSize: 12, color: '#888' }}>100 مزرعة × $2</p>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Add Farm Modal */}
      <Modal
        title="➕ إضافة مزرعة جديدة"
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        {farms.length >= subscription.maxFarms && subscription.maxFarms > 0 && (
          <Alert
            message={`لقد وصلت للحد الأقصى (${subscription.maxFarms} مزارع). ادفع $2 لإضافة مزرعة جديدة.`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={handleAddFarm}>
          <Form.Item
            name="name"
            label="اسم المزرعة"
            rules={[{ required: true, message: 'أدخل اسم المزرعة' }]}
          >
            <Input placeholder="مثال: المزرعة الرئيسية" />
          </Form.Item>
          <Form.Item
            name="gameAccount"
            label="اسم الحساب في اللعبة"
            rules={[{ required: true, message: 'أدخل اسم الحساب' }]}
          >
            <Input placeholder="مثال: VikingLord_01" />
          </Form.Item>
          <Form.Item
            name="server"
            label="السيرفر"
            rules={[{ required: true, message: 'اختر السيرفر' }]}
          >
            <Select placeholder="اختر السيرفر">
              {Array.from({ length: 50 }, (_, i) => (
                <Select.Option key={`S${400 + i}`} value={`S${400 + i}`}>
                  S{400 + i}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAddModalOpen(false)}>إلغاء</Button>
              {farms.length >= subscription.maxFarms && subscription.maxFarms > 0 ? (
                <Button type="primary" href="/billing?action=add-farm">
                  ادفع $2 وأضف مزرعة
                </Button>
              ) : (
                <Button type="primary" htmlType="submit">
                  إضافة مزرعة {subscription.status === 'none' ? '(تجريبي مجاني)' : ''}
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Farm Detail Modal */}
      <Modal
        title={`📋 تفاصيل: ${selectedFarm?.name}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            إغلاق
          </Button>,
          <Button
            key="settings"
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => (window.location.href = `/bot?farm=${selectedFarm?.id}`)}
          >
            إعدادات البوت
          </Button>,
        ]}
        width={600}
      >
        {selectedFarm && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic title="القوة" value={formatNumber(selectedFarm.power)} />
              </Col>
              <Col span={12}>
                <Statistic title="المستوى" value={selectedFarm.level} />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Statistic title="الموارد المجمعة" value={formatNumber(selectedFarm.resourcesCollected)} />
              </Col>
              <Col span={12}>
                <Statistic title="السيرفر" value={selectedFarm.server} />
              </Col>
            </Row>

            <h4 style={{ marginTop: 16, marginBottom: 8 }}>المهام المفعلة:</h4>
            <Space wrap>
              {Object.entries(selectedFarm.tasks).map(([task, enabled]) => (
                <Tag
                  key={task}
                  color={enabled ? 'green' : 'default'}
                >
                  {task === 'farming' && '🌾 زراعة'}
                  {task === 'building' && '🏗️ بناء'}
                  {task === 'training' && '⚔️ تدريب'}
                  {task === 'gathering' && '📦 جمع موارد'}
                  {task === 'healing' && '💊 علاج'}
                  {task === 'rally' && '🏴 تجمع'}
                  {task === 'mail' && '📧 بريد'}
                  {task === 'gifts' && '🎁 هدايا'}
                  {enabled ? ' ✓' : ' ✗'}
                </Tag>
              ))}
            </Space>

            <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
              <p>تاريخ الإنشاء: {new Date(selectedFarm.createdAt).toLocaleDateString('ar-SA')}</p>
              <p>آخر نشاط: {new Date(selectedFarm.lastActivity).toLocaleString('ar-SA')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

