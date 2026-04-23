/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

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
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Input,
  InputNumber,
  Typography,
  Descriptions,
  Banner,
  Tooltip
} from '@douyinfe/semi-ui';
import {
  IconCheckCircleStroked,
  IconCrossCircleStroked,
  IconClock,
  IconLockStroked,
} from '@douyinfe/semi-icons';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';

const { Title, Text } = Typography;

// 申请状态
const APPLICATION_STATUS = {
  0: { text: '待审核', color: 'orange', icon: <IconClock /> },
  1: { text: '已通过', color: 'green', icon: <IconCheckCircleStroked /> },
  2: { text: '已拒绝', color: 'red', icon: <IconCrossCircleStroked /> },
};

const AgentApplicationManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState(0); // 默认显示待审核
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [agentDomains, setAgentDomains] = useState([]); // 代理商域名列表
  const [showApproveModal, setShowApproveModal] = useState(false); // 批准确认弹窗
  const [commissionRate, setCommissionRate] = useState(5); // 分成比例
  const [systemDomains, setSystemDomains] = useState({}); // 存储各代理的系统分配域名映射 user_id -> domain
  const [showSSLCertModal, setShowSSLCertModal] = useState(false); // SSL证书查看弹窗

  // 加载申请列表
  // status: -1 表示查询全部，此时不传 status 参数
  const loadApplications = async (page = 1, pageSize = 10, status = 0) => {
    setLoading(true);
    try {
      const statusParam = status >= 0 ? `&status=${status}` : '';
      const res = await API.get(
        `/api/admin/agent/applications?page=${page}&page_size=${pageSize}${statusParam}`
      );
      if (res.data.success) {
        const apps = res.data.data.list || [];
        setApplications(apps);
        setPagination({
          currentPage: page,
          pageSize: pageSize,
          total: res.data.data.total,
        });
        
        // 获取已通过但没有自定义域名的申请的系统域名
        const approvedWithoutDomain = apps.filter(
          app => app.status === 1 && !app.domain
        );
        if (approvedWithoutDomain.length > 0) {
          loadSystemDomains(approvedWithoutDomain);
        }
      }
    } catch (error) {
      showError('加载申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量获取系统分配的域名
  const loadSystemDomains = async (apps) => {
    const newSystemDomains = { ...systemDomains };
    for (const app of apps) {
      try {
        const res = await API.get(`/api/admin/agent/domains?agent_id=${app.user_id}`);
        if (res.data.success && res.data.data) {
          const systemDomain = res.data.data.find(d => d.domain_type === 1);
          if (systemDomain) {
            newSystemDomains[app.user_id] = systemDomain.domain;
          }
        }
      } catch (error) {
        console.error('加载系统域名失败', error);
      }
    }
    setSystemDomains(newSystemDomains);
  };

  // 加载代理商域名
  const loadAgentDomains = async (agentId) => {
    try {
      const res = await API.get(`/api/admin/agent/domains?agent_id=${agentId}`);
      if (res.data.success) {
        setAgentDomains(res.data.data || []);
      }
    } catch (error) {
      console.error('加载域名失败', error);
      setAgentDomains([]);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // 批准申请
  const approveApplication = async () => {
    if (!selectedApplication) return;
    try {
      const res = await API.post(
        `/api/admin/agent/applications/${selectedApplication.id}/approve`,
        { commission_rate: commissionRate }
      );
      if (res.data.success) {
        showSuccess('申请已批准');
        setShowApproveModal(false);
        setSelectedApplication(null);
        loadApplications(pagination.currentPage, pagination.pageSize, statusFilter);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('批准申请失败');
    }
  };

  // 打开批准确认弹窗
  const openApproveModal = (application) => {
    setSelectedApplication(application);
    setCommissionRate(5); // 默认分成比例 5%
    setShowApproveModal(true);
  };

  // 拒绝申请
  const rejectApplication = async () => {
    if (!rejectReason.trim()) {
      showError('请输入拒绝原因');
      return;
    }
    try {
      const res = await API.post(
        `/api/admin/agent/applications/${selectedApplication.id}/reject`,
        { reason: rejectReason }
      );
      if (res.data.success) {
        showSuccess('申请已拒绝');
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedApplication(null);
        loadApplications(pagination.currentPage, pagination.pageSize, statusFilter);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('拒绝申请失败');
    }
  };

  // 打开拒绝弹窗
  const openRejectModal = (application) => {
    setSelectedApplication(application);
    setShowRejectModal(true);
  };

  // 状态筛选
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    loadApplications(1, pagination.pageSize, status);
  };

  // 查看详情
  const viewDetail = async (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
    // 如果申请已通过，加载代理商的域名列表
    if (application.status === 1) {
      await loadAgentDomains(application.user_id);
    } else {
      setAgentDomains([]);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '申请人',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '联系邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      width: 260,
      render: (text, record) => {
        // 如果用户申请时填写了自定义域名
        if (text) {
          const hasSSL = record.ssl_certificate && record.ssl_certificate.length > 0;
          return (
            <Space spacing={4}>
              <Text>{text}</Text>
              {hasSSL && (
                <>
                  <Tooltip content="已提供SSL证书">
                    <IconLockStroked style={{ color: 'var(--semi-color-success)' }} />
                  </Tooltip>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApplication(record);
                      setShowSSLCertModal(true);
                    }}
                  >
                    查看SSL
                  </Button>
                </>
              )}
            </Space>
          );
        }
        // 如果没有填写域名，显示系统分配的域名（仅已通过的申请）
        if (record.status === 1) {
          const systemDomain = systemDomains[record.user_id];
          if (systemDomain) {
            return (
              <Tooltip content="系统分配">
                <Text type="tertiary">{systemDomain}</Text>
              </Tooltip>
            );
          }
          return <Text type="tertiary">待分配</Text>;
        }
        return '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = APPLICATION_STATUS[status];
        return (
          <Tag color={statusInfo.color} prefixIcon={statusInfo.icon}>
            {statusInfo.text}
          </Tag>
        );
      },
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time) => timestamp2string(time),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (text, record) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(record)}>
            详情
          </Button>
          {record.status === 0 && (
            <>
              <Button
                size="small"
                theme="solid"
                type="primary"
                onClick={() => openApproveModal(record)}
              >
                批准
              </Button>
              <Button
                size="small"
                type="danger"
                onClick={() => openRejectModal(record)}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px', paddingTop: '70px' }}>
      <Card
        title={
          <Title heading={3} style={{ margin: 0 }}>
            代理商申请管理
          </Title>
        }
        headerExtraContent={
          <Space>
            <Button
              type={statusFilter === -1 ? 'primary' : 'tertiary'}
              onClick={() => handleStatusFilter(-1)}
            >
              全部
            </Button>
            <Button
              type={statusFilter === 0 ? 'primary' : 'tertiary'}
              onClick={() => handleStatusFilter(0)}
            >
              待审核
            </Button>
            <Button
              type={statusFilter === 1 ? 'primary' : 'tertiary'}
              onClick={() => handleStatusFilter(1)}
            >
              已通过
            </Button>
            <Button
              type={statusFilter === 2 ? 'primary' : 'tertiary'}
              onClick={() => handleStatusFilter(2)}
            >
              已拒绝
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={applications}
          loading={loading}
          pagination={{
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: (page) =>
              loadApplications(page, pagination.pageSize, statusFilter),
          }}
          rowKey="id"
        />
      </Card>

      {/* 批准确认弹窗 */}
      <Modal
        title="批准代理商申请"
        visible={showApproveModal}
        onCancel={() => {
          setShowApproveModal(false);
          setSelectedApplication(null);
        }}
        onOk={approveApplication}
        okText="确认批准"
        cancelText="取消"
      >
        <Banner
          type="info"
          description="批准后，用户将成为代理商，可以绑定域名并发展下级用户。请设置代理商的分成比例。"
          style={{ marginBottom: '16px' }}
        />
        {selectedApplication && (
          <Descriptions style={{ marginBottom: '16px' }}>
            <Descriptions.Item itemKey="申请人">
              {selectedApplication.username} (ID: {selectedApplication.user_id})
            </Descriptions.Item>
            <Descriptions.Item itemKey="域名">
              {selectedApplication.domain ? (
                <Space spacing={4}>
                  <Text>{selectedApplication.domain}</Text>
                  {selectedApplication.ssl_certificate && selectedApplication.ssl_certificate.length > 0 && (
                    <Tag color="green" size="small">
                      <IconLockStroked style={{ marginRight: 4 }} />
                      已提供SSL证书
                    </Tag>
                  )}
                </Space>
              ) : (
                <Text type="tertiary">将自动生成子域名</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
        <div style={{ marginTop: '16px' }}>
          <Text>分成比例（百分比）：</Text>
          <InputNumber
            value={commissionRate}
            onChange={(value) => setCommissionRate(value)}
            min={0}
            max={100}
            style={{ width: '120px', marginLeft: '8px' }}
            suffix="%"
          />
          <Text type="tertiary" style={{ marginLeft: '8px' }}>
            用户充值时，代理商可获得的分成比例
          </Text>
        </div>
      </Modal>

      {/* 拒绝弹窗 */}
      <Modal
        title="拒绝申请"
        visible={showRejectModal}
        onCancel={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedApplication(null);
        }}
        onOk={rejectApplication}
        okText="确认拒绝"
        cancelText="取消"
      >
        <Banner
          type="warning"
          description="拒绝后，申请人可以重新提交申请。请填写拒绝原因。"
          style={{ marginBottom: '16px' }}
        />
        <Input.TextArea
          placeholder="请输入拒绝原因"
          value={rejectReason}
          onChange={(value) => setRejectReason(value)}
          rows={4}
        />
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="申请详情"
        visible={showDetailModal}
        onCancel={() => {
          setShowDetailModal(false);
          setSelectedApplication(null);
        }}
        footer={null}
        width={600}
      >
        {selectedApplication && (
          <Descriptions>
            <Descriptions.Item itemKey="申请人">
              {selectedApplication.username} (ID: {selectedApplication.user_id})
            </Descriptions.Item>
            <Descriptions.Item itemKey="联系邮箱">
              {selectedApplication.email}
            </Descriptions.Item>
            <Descriptions.Item itemKey="联系电话">
              {selectedApplication.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item itemKey="域名">
              {selectedApplication.domain ? (
                <Space spacing={4}>
                  <Text>{selectedApplication.domain}</Text>
                  {selectedApplication.ssl_certificate && selectedApplication.ssl_certificate.length > 0 && (
                    <Tag color="green" size="small">
                      <IconLockStroked style={{ marginRight: 4 }} />
                      已提供SSL证书
                    </Tag>
                  )}
                </Space>
              ) : (
                selectedApplication.status === 1 ? (
                  systemDomains[selectedApplication.user_id] || '待分配'
                ) : (
                  <Text type="tertiary">将自动分配系统子域名</Text>
                )
              )}
            </Descriptions.Item>
            {selectedApplication.domain && selectedApplication.ssl_certificate && selectedApplication.ssl_certificate.length > 0 && (
              <Descriptions.Item itemKey="SSL证书" span={3}>
                <Space>
                  <Text type="tertiary" size="small">
                    已提供SSL证书（{selectedApplication.ssl_certificate.length} 字符）
                  </Text>
                  <Button 
                    size="small" 
                    onClick={() => setShowSSLCertModal(true)}
                  >
                    查看证书内容
                  </Button>
                </Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item itemKey="业务描述" span={3}>
              {selectedApplication.business_info || '-'}
            </Descriptions.Item>
            <Descriptions.Item itemKey="状态">
              <Tag color={APPLICATION_STATUS[selectedApplication.status].color}>
                {APPLICATION_STATUS[selectedApplication.status].text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item itemKey="申请时间">
              {timestamp2string(selectedApplication.created_at)}
            </Descriptions.Item>
            {selectedApplication.reviewed_at && (
              <Descriptions.Item itemKey="审核时间">
                {timestamp2string(selectedApplication.reviewed_at)}
              </Descriptions.Item>
            )}
            {selectedApplication.reviewer_name && (
              <Descriptions.Item itemKey="审核人">
                {selectedApplication.reviewer_name}
              </Descriptions.Item>
            )}
            {selectedApplication.reject_reason && (
              <Descriptions.Item itemKey="拒绝原因" span={3}>
                <Text type="danger">{selectedApplication.reject_reason}</Text>
              </Descriptions.Item>
            )}
            {/* 已通过的申请显示代理商域名 */}
            {selectedApplication.status === 1 && agentDomains.length > 0 && (
              <Descriptions.Item itemKey="已绑定域名" span={3}>
                <Space spacing={4}>
                  {agentDomains.map((domain) => (
                    <Tag
                      key={domain.id}
                      color={domain.status === 1 ? 'green' : 'orange'}
                      size="small"
                    >
                      {domain.domain}
                      {domain.status === 1 ? ' (已生效)' : ' (待验证)'}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            {selectedApplication.status === 1 && agentDomains.length === 0 && (
              <Descriptions.Item itemKey="已绑定域名" span={3}>
                <Text type="tertiary">暂无绑定域名</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* SSL证书查看弹窗 */}
      <Modal
        title="SSL证书内容"
        visible={showSSLCertModal}
        onCancel={() => setShowSSLCertModal(false)}
        footer={null}
        width={700}
      >
        {selectedApplication && selectedApplication.ssl_certificate && (
          <div>
            <Banner
              type="info"
              description="以下是用户上传的SSL证书内容（PEM格式），可用于部署代理商的自定义域名。"
              style={{ marginBottom: '16px' }}
            />
            <div style={{ marginBottom: '8px' }}>
              <Text strong>域名：</Text>
              <Text>{selectedApplication.domain}</Text>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <Text strong>证书内容：</Text>
              <Button 
                size="small" 
                style={{ marginLeft: '8px' }}
                onClick={() => {
                  navigator.clipboard.writeText(selectedApplication.ssl_certificate);
                  showSuccess('证书内容已复制到剪贴板');
                }}
              >
                复制到剪贴板
              </Button>
            </div>
            <Input.TextArea
              value={selectedApplication.ssl_certificate}
              readOnly
              rows={15}
              style={{ 
                fontFamily: 'monospace',
                fontSize: '12px',
                backgroundColor: 'var(--semi-color-fill-0)'
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AgentApplicationManagement;
