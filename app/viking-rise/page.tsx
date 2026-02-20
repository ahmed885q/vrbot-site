'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Tag, Statistic, Alert, Switch, Space } from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  EyeOutlined, 
  SettingOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  CloudDownloadOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { windowsAgentService, VikingBot } from '../../modules/viking-rise/services/WindowsAgentService';

export default function VikingRisePage() {
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [bots, setBots] = useState<VikingBot[]>([]);
  const [loading, setLoading] = useState({
    agent: false,
    bots: false,
    tasks: false
  });
  const [statistics, setStatistics] = useState<any>({});
  const [autoStart, setAutoStart] = useState(false);

  // Load initial data
  useEffect(() => {
    checkAgentStatus();
    loadBots();
    loadStatistics();
  }, []);

  const checkAgentStatus = async () => {
    setLoading(prev => ({ ...prev, agent: true }));
    try {
      const status = await windowsAgentService.getAgentStatus();
      setAgentStatus(status);
    } catch (error) {
      console.error('Failed to check agent status:', error);
    } finally {
      setLoading(prev => ({ ...prev, agent: false }));
    }
  };

  const loadBots = async () => {
    setLoading(prev => ({ ...prev, bots: true }));
    try {
      const botsData = await windowsAgentService.getBots();
      setBots(botsData);
    } catch (error) {
      console.error('Failed to load bots:', error);
    } finally {
      setLoading(prev => ({ ...prev, bots: false }));
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await windowsAgentService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const startAgent = async () => {
    setLoading(prev => ({ ...prev, agent: true }));
    try {
      const success = await windowsAgentService.startAgent();
      if (success) {
        await checkAgentStatus();
        await loadBots();
        Alert.success('Agent started successfully');
      }
    } catch (error) {
      Alert.error('Failed to start agent');
    } finally {
      setLoading(prev => ({ ...prev, agent: false }));
    }
  };

  const stopAgent = async () => {
    setLoading(prev => ({ ...prev, agent: true }));
    try {
      const success = await windowsAgentService.stopAgent();
      if (success) {
        await checkAgentStatus();
        Alert.success('Agent stopped successfully');
      }
    } catch (error) {
      Alert.error('Failed to stop agent');
    } finally {
      setLoading(prev => ({ ...prev, agent: false }));
    }
  };

  const executeTask = async (botId: string, taskType: 'shield' | 'helps' | 'collection') => {
    setLoading(prev => ({ ...prev, tasks: true }));
    try {
      const result = await windowsAgentService.executeBotTask(botId, taskType);
      if (result.success) {
        Alert.success(`Task executed successfully for bot ${botId}`);
        await loadBots();
        await loadStatistics();
      } else {
        Alert.error(`Task execution failed`);
      }
    } catch (error) {
      Alert.error('Failed to execute task');
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  };

  const columns = [
    {
      title: 'Bot Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: VikingBot) => (
        <Space>
          <Tag color={record.status === 'active' ? 'green' : 'red'}>
            {record.status.toUpperCase()}
          </Tag>
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: 'Game Account',
      dataIndex: 'gameAccount',
      key: 'gameAccount',
    },
    {
      title: 'Window',
      dataIndex: 'windowTitle',
      key: 'windowTitle',
      ellipsis: true,
    },
    {
      title: 'Actions',
      dataIndex: 'totalActions',
      key: 'totalActions',
      render: (count: number) => (
        <Tag color="blue">{count} actions</Tag>
      )
    },
    {
      title: 'Success Rate',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate: number) => (
        <Tag color={rate > 0.8 ? 'green' : rate > 0.6 ? 'orange' : 'red'}>
          {(rate * 100).toFixed(1)}%
        </Tag>
      )
    },
    {
      title: 'Operations',
      key: 'operations',
      render: (_: any, record: VikingBot) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<SafetyCertificateOutlined />}
            onClick={() => executeTask(record.id, 'shield')}
            disabled={record.status !== 'active'}
          >
            Shield
          </Button>
          <Button 
            size="small" 
            icon={<TeamOutlined />}
            onClick={() => executeTask(record.id, 'helps')}
            disabled={record.status !== 'active'}
          >
            Helps
          </Button>
          <Button 
            size="small" 
            icon={<CloudDownloadOutlined />}
            onClick={() => executeTask(record.id, 'collection')}
            disabled={record.status !== 'active'}
          >
            Collect
          </Button>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => window.open(`/viking-rise/bots/${record.id}`, '_blank')}
          >
            View
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <DashboardOutlined className="mr-3" />
        Viking Rise Management Dashboard
      </h1>

      {/* Agent Control Section */}
      <Card className="mb-6" title="Agent Control">
        <Row gutter={16} align="middle">
          <Col span={12}>
            <div className="flex items-center">
              <Statistic
                title="Agent Status"
                value={agentStatus?.status?.isRunning ? 'Running' : 'Stopped'}
                valueStyle={{ 
                  color: agentStatus?.status?.isRunning ? '#3f8600' : '#cf1322' 
                }}
              />
              <div className="ml-8">
                <Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={startAgent}
                    loading={loading.agent}
                    disabled={agentStatus?.status?.isRunning}
                  >
                    Start Agent
                  </Button>
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={stopAgent}
                    loading={loading.agent}
                    disabled={!agentStatus?.status?.isRunning}
                  >
                    Stop Agent
                  </Button>
                </Space>
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div className="flex justify-end">
              <Space>
                <span>Auto-start with Windows</span>
                <Switch checked={autoStart} onChange={setAutoStart} />
                <Button icon={<SettingOutlined />}>
                  Settings
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Statistics Section */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Shields Applied"
              value={statistics.totalShieldsApplied || 0}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Helps Sent"
              value={statistics.totalHelpsSent || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Resources Collected"
              value={statistics.totalResourcesCollected || 0}
              prefix={<CloudDownloadOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Bots"
              value={bots.filter(b => b.status === 'active').length}
              suffix={`/ ${bots.length}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Bots Management Section */}
      <Card 
        title={
          <div className="flex justify-between items-center">
            <span>Managed Bots</span>
            <Button 
              type="primary" 
              onClick={loadBots}
              loading={loading.bots}
            >
              Refresh
            </Button>
          </div>
        }
      >
        {agentStatus?.status?.isRunning ? (
          <Table
            columns={columns}
            dataSource={bots}
            rowKey="id"
            loading={loading.bots}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Alert
            message="Agent is not running"
            description="Start the agent to detect and manage Viking Rise bots"
            type="warning"
            showIcon
            action={
              <Button type="primary" onClick={startAgent}>
                Start Agent
              </Button>
            }
          />
        )}
      </Card>

      {/* Quick Actions Section */}
      <Card title="Quick Actions" className="mt-6">
        <Row gutter={16}>
          <Col span={8}>
            <Card 
              hoverable
              onClick={() => {
                if (bots.length > 0) {
                  executeTask(bots[0].id, 'shield');
                }
              }}
              disabled={bots.length === 0}
            >
              <div className="text-center">
                <SafetyCertificateOutlined className="text-3xl mb-2 text-blue-500" />
                <h3>Apply Shield to All</h3>
                <p className="text-gray-500">Apply shield protection to all active bots</p>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              hoverable
              onClick={() => {
                bots.forEach(bot => {
                  if (bot.status === 'active') {
                    executeTask(bot.id, 'helps');
                  }
                });
              }}
              disabled={bots.filter(b => b.status === 'active').length === 0}
            >
              <div className="text-center">
                <TeamOutlined className="text-3xl mb-2 text-green-500" />
                <h3>Send Helps to All</h3>
                <p className="text-gray-500">Send helps to all alliance members</p>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              hoverable
              onClick={() => {
                bots.forEach(bot => {
                  if (bot.status === 'active') {
                    executeTask(bot.id, 'collection');
                  }
                });
              }}
              disabled={bots.filter(b => b.status === 'active').length === 0}
            >
              <div className="text-center">
                <CloudDownloadOutlined className="text-3xl mb-2 text-orange-500" />
                <h3>Collect All Resources</h3>
                <p className="text-gray-500">Collect resources from all farms</p>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Status Information */}
      <Alert
        className="mt-6"
        message="System Information"
        description={
          <div>
            <p>• Agent running on: {agentStatus?.status?.detectedWindows?.length || 0} detected windows</p>
            <p>• Last update: {new Date().toLocaleString()}</p>
            <p>• Human Behavior Simulation: {agentStatus?.status?.simulatorStats?.currentPattern || 'Normal'}</p>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  );
}