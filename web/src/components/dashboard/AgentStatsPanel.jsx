/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Select,
  TabPane,
  Tabs,
  Empty,
  Space,
} from '@douyinfe/semi-ui';
import {
  IconUser,
  IconCreditCard,
  IconAscend,
  IconLink,
  IconServer,
  IconClock,
} from '@douyinfe/semi-icons';
import { VChart } from '@visactor/react-vchart';
import { API, showError, getCurrencyConfig } from '../../helpers';

const { Title, Text } = Typography;

// 统计卡片组件
const StatCard = ({ icon, title, value, color, suffix, prefix }) => (
  <Card className="h-full">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mr-3"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        <div>
          <Text type="tertiary" size="small">
            {title}
          </Text>
          <Title heading={4} style={{ margin: 0, color }}>
            {prefix && <Text size="small">{prefix}</Text>}
            {value}
            {suffix && <Text size="small" type="tertiary"> {suffix}</Text>}
          </Title>
        </div>
      </div>
    </div>
  </Card>
);

// 空图表配置 - 显示空坐标系
const getEmptyChartSpec = (color = '#4F46E5') => ({
  type: 'line',
  data: [
    {
      id: 'data',
      values: [],
    },
  ],
  xField: 'date',
  yField: 'value',
  axes: [
    {
      orient: 'bottom',
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    {
      orient: 'left',
      label: {
        autoHide: true,
      },
    },
  ],
  height: 250,
  padding: { left: 10, right: 10, top: 10, bottom: 10 },
});

// 图表配置
const getLineChartSpec = (data, title, color = '#4F46E5') => {
  if (!data || data.length === 0) {
    return getEmptyChartSpec(color);
  }
  return {
    type: 'line',
    data: [
      {
        id: 'data',
        values: data.map((item) => ({
          date: item.date,
          value: item.quota || item.count || 0,
        })),
      },
    ],
    xField: 'date',
    yField: 'value',
    point: {
      visible: false,
    },
    line: {
      style: {
        stroke: color,
        lineWidth: 2,
      },
    },
    axes: [
      {
        orient: 'bottom',
        label: {
          autoHide: true,
          autoRotate: false,
        },
      },
      {
        orient: 'left',
        label: {
          autoHide: true,
        },
      },
    ],
    tooltip: {
      mark: {
        visible: true,
      },
    },
    height: 250,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
  };
};

const getBarChartSpec = (data, title, color = '#10B981') => {
  if (!data || data.length === 0) {
    return getEmptyChartSpec(color);
  }
  return {
    type: 'bar',
    data: [
      {
        id: 'data',
        values: data.map((item) => ({
          date: item.date,
          value: item.quota || item.count || 0,
        })),
      },
    ],
    xField: 'date',
    yField: 'value',
    bar: {
      style: {
        fill: color,
      },
    },
    axes: [
      {
        orient: 'bottom',
        label: {
          autoHide: true,
          autoRotate: false,
        },
      },
      {
        orient: 'left',
        label: {
          autoHide: true,
        },
      },
    ],
    tooltip: {
      mark: {
        visible: true,
      },
    },
    height: 250,
    padding: { left: 10, right: 10, top: 10, bottom: 10 },
  };
};

// 格式化金额（返回数值和货币符号）
const formatQuotaWithSymbol = (quota) => {
  const { symbol, rate } = getCurrencyConfig();
  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit')) || 500000;
  
  if (!quota && quota !== 0) {
    return { value: '0.00', symbol };
  }
  
  const usdValue = quota / quotaPerUnit;
  const convertedValue = usdValue * rate;
  return { value: convertedValue.toFixed(2), symbol };
};

// 格式化金额（仅返回数值字符串，向后兼容）
const formatQuota = (quota) => {
  const { value } = formatQuotaWithSymbol(quota);
  return value;
};

// AgentStatsPanel 组件
const AgentStatsPanel = ({ isAdmin = false, agentId = null }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [trendData, setTrendData] = useState({});
  const [timeRange, setTimeRange] = useState(7);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(agentId);

  // 加载代理商列表（仅超管）
  const loadAgents = async () => {
    if (!isAdmin) return;
    try {
      const res = await API.get('/api/admin/agent/applications?status=1&page=1&page_size=100');
      if (res.data.success) {
        const agentList = res.data.data.list.map(app => ({
          value: app.user_id,
          label: app.username || `用户${app.user_id}`,
        }));
        setAgents([{ value: null, label: t('全部代理商') }, ...agentList]);
      }
    } catch (error) {
      console.error('加载代理商列表失败', error);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      let res;
      if (isAdmin) {
        let url = '/api/admin/agent/dashboard/stats';
        if (selectedAgentId) {
          url += `?agent_id=${selectedAgentId}`;
        }
        res = await API.get(url);
      } else {
        res = await API.get('/api/agent/dashboard/enhanced/stats');
      }
      if (res.data.success) {
        setStats(res.data.data);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载趋势数据
  const loadTrendData = async () => {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - timeRange * 24 * 3600;

      let res;
      if (isAdmin) {
        let url = `/api/admin/agent/dashboard/trend?start_timestamp=${startTime}&end_timestamp=${endTime}`;
        if (selectedAgentId) {
          url += `&agent_id=${selectedAgentId}`;
        }
        res = await API.get(url);
      } else {
        res = await API.get(
          `/api/agent/dashboard/enhanced/trend?start_timestamp=${startTime}&end_timestamp=${endTime}`
        );
      }
      if (res.data.success) {
        setTrendData(res.data.data);
      }
    } catch (error) {
      console.error('加载趋势数据失败', error);
    }
  };

  useEffect(() => {
    loadStats();
    if (isAdmin) {
      loadAgents();
    }
  }, [isAdmin, selectedAgentId]);

  useEffect(() => {
    loadTrendData();
  }, [timeRange, isAdmin, selectedAgentId]);

  // 时间范围选项
  const timeRangeOptions = [
    { value: 7, label: t('最近7天') },
    { value: 30, label: t('最近30天') },
    { value: 90, label: t('最近90天') },
  ];

  // 渲染超管统计卡片
  const renderAdminStats = () => {
    const topupData = formatQuotaWithSymbol(stats.total_referral_topup);
    const quotaData = formatQuotaWithSymbol(stats.total_referral_quota);
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatCard
            icon={<IconServer style={{ fontSize: 24, color: '#4F46E5' }} />}
            title="代理商总数"
            value={stats.total_agents || 0}
            color="#4F46E5"
          />
        </Col>
        <Col span={6}>
          <StatCard
            icon={<IconUser style={{ fontSize: 24, color: '#10B981' }} />}
            title="代理推广用户"
            value={stats.total_referral_users || 0}
            color="#10B981"
          />
        </Col>
        <Col span={6}>
          <StatCard
            icon={<IconCreditCard style={{ fontSize: 24, color: '#F59E0B' }} />}
            title="用户总充值"
            value={topupData.value}
            color="#F59E0B"
            prefix={topupData.symbol}
          />
        </Col>
        <Col span={6}>
          <StatCard
            icon={<IconAscend style={{ fontSize: 24, color: '#EF4444' }} />}
            title="用户总消费"
            value={quotaData.value}
            color="#EF4444"
            prefix={quotaData.symbol}
          />
        </Col>
      </Row>
    );
  };

  // 渲染代理商统计卡片
  const renderAgentStats = () => {
    const topupData = formatQuotaWithSymbol(stats.total_topup);
    const quotaData = formatQuotaWithSymbol(stats.total_quota);
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatCard
            icon={<IconUser style={{ fontSize: 24, color: '#4F46E5' }} />}
            title="推广用户数"
            value={stats.total_users || 0}
            color="#4F46E5"
          />
        </Col>
        <Col span={6}>
          <StatCard
            icon={<IconClock style={{ fontSize: 24, color: '#10B981' }} />}
            title="今日新增"
            value={stats.today_users || 0}
            color="#10B981"
          />
        </Col>
        <Col span={6}>
          <StatCard
            icon={<IconCreditCard style={{ fontSize: 24, color: '#F59E0B' }} />}
            title="用户总充值"
            value={topupData.value}
            color="#F59E0B"
            prefix={topupData.symbol}
          />
        </Col>
        <Col span={6}>
          <StatCard
            icon={<IconAscend style={{ fontSize: 24, color: '#EF4444' }} />}
            title="用户总消费"
            value={quotaData.value}
            color="#EF4444"
            prefix={quotaData.symbol}
          />
        </Col>
      </Row>
    );
  };

  // 渲染图表区域
  const renderCharts = () => (
    <Card
      title={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Text strong>{t('数据趋势')}</Text>
          <Space>
            {isAdmin && agents.length > 0 && (
              <Select
                value={selectedAgentId}
                onChange={(value) => setSelectedAgentId(value)}
                style={{ width: 150 }}
                optionList={agents}
                placeholder={t('选择代理商')}
              />
            )}
            <Select
              value={timeRange}
              onChange={(value) => {
                setTimeRange(value);
              }}
              style={{ width: 120 }}
              optionList={timeRangeOptions}
              placeholder={t('快速选择')}
            />
          </Space>
        </div>
      }
      className="mt-4"
    >
      <Tabs type="line">
        <TabPane tab={t('消费趋势')} itemKey="quota">
          <VChart
            spec={getLineChartSpec(trendData.quota_trend, t('消费趋势'), '#EF4444')}
            option={{ autoFit: true }}
          />
        </TabPane>
        <TabPane tab={t('充值趋势')} itemKey="topup">
          <VChart
            spec={getBarChartSpec(trendData.topup_trend, t('充值趋势'), '#10B981')}
            option={{ autoFit: true }}
          />
        </TabPane>
        {!isAdmin && (
          <TabPane tab={t('新用户趋势')} itemKey="newuser">
            <VChart
              spec={getLineChartSpec(trendData.new_user_trend, t('新用户趋势'), '#4F46E5')}
              option={{ autoFit: true }}
            />
          </TabPane>
        )}
      </Tabs>
    </Card>
  );

  // 渲染超管额外信息
  const renderAdminExtraInfo = () => {
    if (!isAdmin) return null;

    return (
      <Row gutter={[16, 16]} className="mt-4">
        <Col span={12}>
          <Card title={t('代理域名统计')}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div className="text-center">
                  <Title heading={3} style={{ margin: 0, color: '#4F46E5' }}>
                    {stats.total_domains || 0}
                  </Title>
                  <Text type="tertiary">{t('总域名数')}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <Title heading={3} style={{ margin: 0, color: '#10B981' }}>
                    {stats.active_domains || 0}
                  </Title>
                  <Text type="tertiary">{t('有效域名')}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <Title heading={3} style={{ margin: 0, color: '#F59E0B' }}>
                    {stats.pending_applications || 0}
                  </Title>
                  <Text type="tertiary">{t('待审核申请')}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('代理商排名（前10）')}>
            {stats.top_agents && stats.top_agents.length > 0 ? (
              <div className="space-y-2">
                {stats.top_agents.slice(0, 5).map((agent, idx) => (
                  <div key={agent.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm mr-2"
                        style={{ backgroundColor: idx < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][idx] : '#6B7280' }}
                      >
                        {idx + 1}
                      </span>
                      <Text>{agent.display_name || agent.username}</Text>
                    </div>
                    <div className="text-right">
                      <Text type="tertiary" size="small">
                        {agent.referral_count} {t('用户')}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description={t('暂无代理商数据')} />
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染代理商额外信息
  const renderAgentExtraInfo = () => {
    if (isAdmin) return null;

    const balanceData = formatQuotaWithSymbol(stats.total_balance);
    const agentQuotaData = formatQuotaWithSymbol(stats.agent_quota);

    return (
      <Row gutter={[16, 16]} className="mt-4">
        <Col span={8}>
          <Card title={t('用户余额统计')}>
            <div className="text-center">
              <Title heading={3} style={{ margin: 0, color: '#4F46E5' }}>
                {balanceData.symbol} {balanceData.value}
              </Title>
              <Text type="tertiary">{t('下级用户总余额')}</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t('域名统计')}>
            <div className="text-center">
              <Title heading={3} style={{ margin: 0, color: '#10B981' }}>
                {stats.active_domains_count || 0} / {stats.domains_count || 0}
              </Title>
              <Text type="tertiary">{t('有效域名 / 总域名')}</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t('我的账户')}>
            <div className="text-center">
              <Title heading={3} style={{ margin: 0, color: '#F59E0B' }}>
                {agentQuotaData.symbol} {agentQuotaData.value}
              </Title>
              <Text type="tertiary">{t('我的余额')}</Text>
            </div>
          </Card>
        </Col>
      </Row>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 统计卡片 */}
      {isAdmin ? renderAdminStats() : renderAgentStats()}

      {/* 图表 */}
      {renderCharts()}

      {/* 额外信息 */}
      {isAdmin ? renderAdminExtraInfo() : renderAgentExtraInfo()}
    </div>
  );
};

export default AgentStatsPanel;
