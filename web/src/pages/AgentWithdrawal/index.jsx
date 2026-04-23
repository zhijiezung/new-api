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
  Typography,
  Descriptions,
  Banner,
} from '@douyinfe/semi-ui';
import {
  IconCheckCircleStroked,
  IconCrossCircleStroked,
  IconClock,
} from '@douyinfe/semi-icons';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';

const { Title, Text } = Typography;

// 提现状态
const WITHDRAWAL_STATUS = {
  0: { text: '待审核', color: 'orange', icon: <IconClock /> },
  1: { text: '已通过', color: 'green', icon: <IconCheckCircleStroked /> },
  2: { text: '已拒绝', color: 'red', icon: <IconCrossCircleStroked /> },
};

const AgentWithdrawalManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState(0); // 默认显示待审核
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);

  // 加载提现申请列表
  const loadWithdrawals = async (page = 1, pageSize = 10, status = 0) => {
    setLoading(true);
    try {
      const statusParam = status >= 0 ? `&status=${status}` : '';
      const res = await API.get(
        `/api/admin/agent/withdrawals?page=${page}&page_size=${pageSize}${statusParam}`
      );
      if (res.data.success) {
        setWithdrawals(res.data.data.list || []);
        setPagination({
          currentPage: page,
          pageSize: pageSize,
          total: res.data.data.total,
        });
      }
    } catch (error) {
      showError('加载提现申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  // 批准提现申请
  const approveWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    try {
      const res = await API.post(
        `/api/admin/agent/withdrawal/${selectedWithdrawal.id}/approve`
      );
      if (res.data.success) {
        showSuccess('提现申请已批准');
        setSelectedWithdrawal(null);
        loadWithdrawals(pagination.currentPage, pagination.pageSize, statusFilter);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('批准提现申请失败');
    }
  };

  // 拒绝提现申请
  const rejectWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectReason.trim()) {
      showError('请输入拒绝原因');
      return;
    }
    try {
      const res = await API.post(
        `/api/admin/agent/withdrawal/${selectedWithdrawal.id}/reject`,
        { reason: rejectReason }
      );
      if (res.data.success) {
        showSuccess('提现申请已拒绝');
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedWithdrawal(null);
        loadWithdrawals(pagination.currentPage, pagination.pageSize, statusFilter);
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('拒绝提现申请失败');
    }
  };

  // 打开拒绝弹窗
  const openRejectModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowRejectModal(true);
  };

  // 打开批准确认弹窗
  const openApproveModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    Modal.confirm({
      title: '确认批准提现',
      content: (
        <div>
          <p>代理商: {withdrawal.agent_username}</p>
          <p>提现金额: {(withdrawal.amount / 500000).toFixed(2)} $</p>
          <p>确定要批准此提现申请吗？</p>
        </div>
      ),
      onOk: approveWithdrawal,
      onCancel: () => setSelectedWithdrawal(null),
    });
  };

  // 状态筛选
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    loadWithdrawals(1, pagination.pageSize, status);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '代理商',
      dataIndex: 'agent_username',
      key: 'agent_username',
      width: 120,
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => <Text type="success">{(amount / 500000).toFixed(2)} $</Text>,
    },
    {
      title: '银行名称',
      dataIndex: 'bank_name',
      key: 'bank_name',
      width: 120,
    },
    {
      title: '银行账号',
      dataIndex: 'bank_account',
      key: 'bank_account',
      width: 180,
    },
    {
      title: '账户名',
      dataIndex: 'account_name',
      key: 'account_name',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={WITHDRAWAL_STATUS[status].color}>
          {WITHDRAWAL_STATUS[status].text}
        </Tag>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time) => timestamp2string(time),
    },
    {
      title: '审核时间',
      dataIndex: 'reviewed_at',
      key: 'reviewed_at',
      width: 160,
      render: (time) => (time ? timestamp2string(time) : '-'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (text, record) => (
        <Space>
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
          {record.status !== 0 && (
            <Text type="tertiary">已处理</Text>
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
            提现申请管理
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
          dataSource={withdrawals}
          loading={loading}
          pagination={{
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: (page) =>
              loadWithdrawals(page, pagination.pageSize, statusFilter),
          }}
          rowKey="id"
        />
      </Card>

      {/* 拒绝弹窗 */}
      <Modal
        title="拒绝提现申请"
        visible={showRejectModal}
        onCancel={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedWithdrawal(null);
        }}
        onOk={rejectWithdrawal}
        okText="确认拒绝"
        cancelText="取消"
      >
        <Banner
          type="warning"
          description="拒绝后，提现金额将退回代理商的可提现余额。请填写拒绝原因。"
          style={{ marginBottom: '16px' }}
        />
        {selectedWithdrawal && (
          <Descriptions style={{ marginBottom: '16px' }}>
            <Descriptions.Item itemKey="代理商">
              {selectedWithdrawal.agent_username}
            </Descriptions.Item>
            <Descriptions.Item itemKey="提现金额">
              {(selectedWithdrawal.amount / 500000).toFixed(2)} $
            </Descriptions.Item>
          </Descriptions>
        )}
        <Input.TextArea
          placeholder="请输入拒绝原因"
          value={rejectReason}
          onChange={(value) => setRejectReason(value)}
          rows={4}
        />
      </Modal>
    </div>
  );
};

export default AgentWithdrawalManagement;
