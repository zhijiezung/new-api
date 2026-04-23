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

import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Descriptions,
  Banner,
  Tabs,
  TabPane,
  InputNumber,
  Input,
  Row,
  Col,
} from '@douyinfe/semi-ui';
import {
  IconUser,
  IconLink,
  IconCheckCircleStroked,
  IconCrossCircleStroked,
  IconClock,
  IconDelete,
  IconServer,
  IconCoinMoneyStroked,
  IconCreditCard
} from '@douyinfe/semi-icons';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';
import { UserContext } from '../../context/User';
import AgentStatsPanel from '../../components/dashboard/AgentStatsPanel';

const { Title, Text } = Typography;

// 申请状态
const APPLICATION_STATUS = {
  0: { text: '待审核', color: 'orange', icon: <IconClock /> },
  1: { text: '已通过', color: 'green', icon: <IconCheckCircleStroked /> },
  2: { text: '已拒绝', color: 'red', icon: <IconCrossCircleStroked /> },
};

// 域名状态
const DOMAIN_STATUS = {
  0: { text: '待验证', color: 'orange' },
  1: { text: '已生效', color: 'green' },
  2: { text: '已禁用', color: 'grey' },
};

// 域名类型
const DOMAIN_TYPE = {
  0: '自定义域名',
  1: '系统分配',
};

// 提现状态
const WITHDRAWAL_STATUS = {
  0: { text: '待审核', color: 'orange' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已拒绝', color: 'red' },
};

const AgentDashboard = () => {
  const { t } = useTranslation();
  const [userState] = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [application, setApplication] = useState(null);
  const [domains, setDomains] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    email: '',
    phone: '',
    domain: '',
    business_info: '',
    ssl_certificate: '',
  });
  const [isAgent, setIsAgent] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPagination, setUsersPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });

  // 分成相关状态
  const [commissionStats, setCommissionStats] = useState({});
  const [commissionLogs, setCommissionLogs] = useState([]);
  const [commissionLogsLoading, setCommissionLogsLoading] = useState(false);
  const [commissionLogsPagination, setCommissionLogsPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });

  // 提现相关状态
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: 0,
    bank_name: '',
    bank_account: '',
    account_name: '',
  });
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });

  // 检查用户是否是代理商
  const checkAgentStatus = async () => {
    try {
      const res = await API.get('/api/agent/application');
      if (res.data.success && res.data.data) {
        setApplication(res.data.data);
        if (res.data.data.status === 1) {
          setIsAgent(true);
          loadDomains();
          loadStats();
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 获取用户信息并预填充邮箱
  useEffect(() => {
    if (userState?.user?.email) {
      setApplyForm(prev => ({
        ...prev,
        email: userState.user.email,
      }));
    }
  }, [userState?.user]);

  // 加载统计数据
  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/agent/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加载域名列表
  const loadDomains = async () => {
    try {
      const res = await API.get('/api/agent/domains');
      if (res.data.success) {
        setDomains(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 加载推广用户列表
  const loadUsers = async (page = 1, pageSize = 10) => {
    setUsersLoading(true);
    try {
      const res = await API.get(`/api/agent/users?page=${page}&page_size=${pageSize}`);
      if (res.data.success) {
        setUsers(res.data.data.list || []);
        setUsersPagination({
          currentPage: page,
          pageSize: pageSize,
          total: res.data.data.total,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUsersLoading(false);
    }
  };

  // 加载分成统计
  const loadCommissionStats = async () => {
    try {
      const res = await API.get('/api/agent/commission/stats');
      if (res.data.success) {
        setCommissionStats(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 加载分成记录
  const loadCommissionLogs = async (page = 1, pageSize = 10) => {
    setCommissionLogsLoading(true);
    try {
      const res = await API.get(`/api/agent/commission/logs?page=${page}&page_size=${pageSize}`);
      if (res.data.success) {
        setCommissionLogs(res.data.data.list || []);
        setCommissionLogsPagination({
          currentPage: page,
          pageSize: pageSize,
          total: res.data.data.total,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCommissionLogsLoading(false);
    }
  };

  // 加载提现记录
  const loadWithdrawals = async (page = 1, pageSize = 10) => {
    setWithdrawalsLoading(true);
    try {
      const res = await API.get(`/api/agent/withdrawals?page=${page}&page_size=${pageSize}`);
      if (res.data.success) {
        setWithdrawals(res.data.data.list || []);
        setWithdrawalsPagination({
          currentPage: page,
          pageSize: pageSize,
          total: res.data.data.total,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  // 提交提现申请
  const submitWithdrawal = async () => {
    if (withdrawalForm.amount <= 0) {
      showError('请输入有效的提现金额');
      return;
    }
    if (!withdrawalForm.bank_name || !withdrawalForm.bank_account || !withdrawalForm.account_name) {
      showError('请填写完整的银行账户信息');
      return;
    }
    try {
      const res = await API.post('/api/agent/withdrawal', withdrawalForm);
      if (res.data.success) {
        showSuccess('提现申请已提交，请等待审核');
        setShowWithdrawalModal(false);
        setWithdrawalForm({ amount: 0, bank_name: '', bank_account: '', account_name: '' });
        loadCommissionStats();
        loadWithdrawals();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('提现申请失败');
    }
  };

  // 提交代理商申请
  const submitApplication = async () => {
    try {
      const res = await API.post('/api/agent/apply', applyForm);
      if (res.data.success) {
        showSuccess('申请提交成功，请等待管理员审核');
        setShowApplyModal(false);
        checkAgentStatus();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('申请提交失败');
    }
  };

  // 验证域名
  const verifyDomain = async (domainId) => {
    try {
      const res = await API.post(`/api/agent/domain/${domainId}/verify`);
      if (res.data.success) {
        showSuccess('域名验证成功');
        loadDomains();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError('域名验证失败');
    }
  };

  // 删除域名
  const deleteDomain = async (domainId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该域名吗？',
      onOk: async () => {
        try {
          const res = await API.delete(`/api/agent/domain/${domainId}`);
          if (res.data.success) {
            showSuccess('域名删除成功');
            loadDomains();
          } else {
            showError(res.data.message);
          }
        } catch (error) {
          showError('域名删除失败');
        }
      },
    });
  };

  useEffect(() => {
    checkAgentStatus();
  }, []);

  useEffect(() => {
    if (isAgent) {
      loadUsers();
      loadCommissionStats();
      loadCommissionLogs();
      loadWithdrawals();
    }
  }, [isAgent]);

  // 如果不是代理商，显示申请页面
  if (!isAgent && !application) {
    return (
      <div style={{ padding: '20px', paddingTop: '70px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title heading={3}>成为代理商</Title>
            <Text>推广用户，获取收益分成</Text>
            <div style={{ marginTop: '20px' }}>
              <Button
                theme="solid"
                type="primary"
                size="large"
                onClick={() => setShowApplyModal(true)}
              >
                申请成为代理商
              </Button>
            </div>
          </div>
        </Card>

        {/* 申请弹窗 */}
        <Modal
          title="代理商申请"
          visible={showApplyModal}
          onCancel={() => setShowApplyModal(false)}
          onOk={submitApplication}
          okText="提交申请"
          cancelText="取消"
        >
          <Form>
            <Form.Input
              field="email"
              label="联系邮箱"
              placeholder="请输入联系邮箱"
              value={applyForm.email}
              onChange={(value) => setApplyForm({ ...applyForm, email: value })}
              rules={[{ required: true, message: '请输入联系邮箱' }]}
            />
            <Form.Input
              field="phone"
              label="联系电话"
              placeholder="请输入联系电话（选填）"
              value={applyForm.phone}
              onChange={(value) => setApplyForm({ ...applyForm, phone: value })}
            />
            <Form.Input
              field="domain"
              label="自定义域名"
              placeholder="请输入您的域名（选填）"
              value={applyForm.domain}
              onChange={(value) => setApplyForm({ ...applyForm, domain: value })}
            />
            <Form.TextArea
              field="business_info"
              label="业务描述"
              placeholder="请简要描述您的推广渠道和预期效果"
              value={applyForm.business_info}
              onChange={(value) => setApplyForm({ ...applyForm, business_info: value })}
              rows={4}
            />
            <Form.TextArea
              field="ssl_certificate"
              label="SSL证书（可选）"
              placeholder="如果使用自定义域名，请粘贴SSL证书内容（PEM格式）"
              value={applyForm.ssl_certificate}
              onChange={(value) => setApplyForm({ ...applyForm, ssl_certificate: value })}
              rows={6}
            />
          </Form>
        </Modal>
      </div>
    );
  }

  // 如果申请待审核或被拒绝
  if (!isAgent && application) {
    const statusInfo = APPLICATION_STATUS[application.status];
    return (
      <div style={{ padding: '20px', paddingTop: '70px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title heading={3}>代理商申请状态</Title>
            <div style={{ marginTop: '20px' }}>
              <Tag color={statusInfo.color} size="large">
                {statusInfo.icon} {statusInfo.text}
              </Tag>
            </div>
            {application.status === 2 && (
              <div style={{ marginTop: '20px' }}>
                <Text type="danger">拒绝原因：{application.reject_reason || '无'}</Text>
              </div>
            )}
            <Descriptions style={{ marginTop: '20px', textAlign: 'left' }}>
              <Descriptions.Item itemKey="申请时间">
                {timestamp2string(application.created_at)}
              </Descriptions.Item>
              {application.reviewed_at && (
                <Descriptions.Item itemKey="审核时间">
                  {timestamp2string(application.reviewed_at)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </Card>
      </div>
    );
  }

  // 代理商Dashboard
  return (
    <div style={{ padding: '20px', paddingTop: '70px' }}>
      <Title heading={3} style={{ marginBottom: '20px' }}>
        代理商中心
      </Title>

      {/* 使用标签页组织内容 */}
      <Tabs type="line" size="large">
        <TabPane tab="数据看板" itemKey="dashboard" icon={<IconServer />}>
          <AgentStatsPanel isAdmin={false} />
        </TabPane>
        
        <TabPane tab="分成收益" itemKey="commission" icon={<IconCoinMoneyStroked />}>
          <Card style={{ marginTop: '16px' }}>
            {/* 分成统计卡片 */}
            <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
              <Col span={6}>
                <Card bodyStyle={{ padding: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="tertiary">可提现余额</Text>
                    <Title heading={3} style={{ margin: '8px 0', color: '#28a745' }}>
                      {((commissionStats.commission_balance || 0) / 500000).toFixed(2)} $
                    </Title>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card bodyStyle={{ padding: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="tertiary">累计分成</Text>
                    <Title heading={3} style={{ margin: '8px 0', color: '#007bff' }}>
                      {((commissionStats.commission_total || 0) / 500000).toFixed(2)} $
                    </Title>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card bodyStyle={{ padding: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="tertiary">已提现</Text>
                    <Title heading={3} style={{ margin: '8px 0', color: '#6c757d' }}>
                      {((commissionStats.commission_withdrawn || 0) / 500000).toFixed(2)} $
                    </Title>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card bodyStyle={{ padding: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="tertiary">分成比例</Text>
                    <Title heading={3} style={{ margin: '8px 0', color: '#17a2b8' }}>
                      {commissionStats.commission_rate || 0} %
                    </Title>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 操作按钮 */}
            <Space style={{ marginBottom: '16px' }}>
              <Button 
                theme="solid" 
                type="primary" 
                onClick={() => {
                  loadCommissionStats();
                  setShowWithdrawalModal(true);
                }}
              >
                申请提现
              </Button>
              <Button onClick={() => { loadCommissionLogs(); loadCommissionStats(); }}>
                刷新
              </Button>
            </Space>

            {/* 分成记录 */}
            <Title heading={5} style={{ marginBottom: '16px' }}>分成记录</Title>
            <Table
              dataSource={commissionLogs}
              loading={commissionLogsLoading}
              pagination={{
                currentPage: commissionLogsPagination.currentPage,
                pageSize: commissionLogsPagination.pageSize,
                total: commissionLogsPagination.total,
                onPageChange: (page) => loadCommissionLogs(page, commissionLogsPagination.pageSize),
              }}
            >
              <Table.Column title="ID" dataIndex="id" key="id" width={80} />
              <Table.Column 
                title="充值金额" 
                dataIndex="topup_amount" 
                key="topup_amount"
                render={(amount) => `${(amount / 500000).toFixed(2)} $`}
              />
              <Table.Column 
                title="分成比例" 
                dataIndex="commission_rate" 
                key="commission_rate"
                render={(rate) => `${rate}%`}
              />
              <Table.Column 
                title="分成金额" 
                dataIndex="commission_amount" 
                key="commission_amount"
                render={(amount) => <Text type="success">${(amount / 500000).toFixed(2)}</Text>}
              />
              <Table.Column 
                title="时间" 
                dataIndex="created_at" 
                key="created_at"
                render={(time) => timestamp2string(time)}
              />
            </Table>
          </Card>
        </TabPane>

        <TabPane tab="提现管理" itemKey="withdrawal" icon={<IconCreditCard />}>
          <Card style={{ marginTop: '16px' }}>
            <Space style={{ marginBottom: '16px' }}>
              <Button 
                theme="solid" 
                type="primary"
                onClick={() => {
                  loadCommissionStats();
                  setShowWithdrawalModal(true);
                }}
              >
                申请提现
              </Button>
              <Button onClick={() => loadWithdrawals()}>刷新</Button>
            </Space>
            
            <Table
              dataSource={withdrawals}
              loading={withdrawalsLoading}
              pagination={{
                currentPage: withdrawalsPagination.currentPage,
                pageSize: withdrawalsPagination.pageSize,
                total: withdrawalsPagination.total,
                onPageChange: (page) => loadWithdrawals(page, withdrawalsPagination.pageSize),
              }}
            >
              <Table.Column title="ID" dataIndex="id" key="id" width={80} />
              <Table.Column 
                title="提现金额" 
                dataIndex="amount" 
                key="amount"
                render={(amount) => `${(amount / 500000).toFixed(2)} $`}
              />
              <Table.Column 
                title="银行名称" 
                dataIndex="bank_name" 
                key="bank_name"
              />
              <Table.Column 
                title="银行账号" 
                dataIndex="bank_account" 
                key="bank_account"
              />
              <Table.Column 
                title="账户名" 
                dataIndex="account_name" 
                key="account_name"
              />
              <Table.Column 
                title="状态" 
                dataIndex="status" 
                key="status"
                render={(status) => (
                  <Tag color={WITHDRAWAL_STATUS[status].color}>{WITHDRAWAL_STATUS[status].text}</Tag>
                )}
              />
              <Table.Column 
                title="申请时间" 
                dataIndex="created_at" 
                key="created_at"
                render={(time) => timestamp2string(time)}
              />
              <Table.Column 
                title="审核时间" 
                dataIndex="reviewed_at" 
                key="reviewed_at"
                render={(time) => time ? timestamp2string(time) : '-'}
              />
              <Table.Column 
                title="备注" 
                dataIndex="reject_reason" 
                key="reject_reason"
                render={(reason) => reason || '-'}
              />
            </Table>
          </Card>
        </TabPane>
        
        <TabPane tab="域名管理" itemKey="domains" icon={<IconLink />}>
          <Card style={{ marginTop: '16px' }}>
            {domains.length === 0 ? (
              <Banner
                type="info"
                description="您还没有绑定域名，请联系管理员配置推广域名"
              />
            ) : (
              <Table dataSource={domains} pagination={false}>
                <Table.Column title="域名" dataIndex="domain" key="domain" />
                <Table.Column
                  title="类型"
                  dataIndex="domain_type"
                  key="domain_type"
                  render={(type) => DOMAIN_TYPE[type]}
                />
                <Table.Column
                  title="状态"
                  dataIndex="status"
                  key="status"
                  render={(status) => (
                    <Tag color={DOMAIN_STATUS[status].color}>{DOMAIN_STATUS[status].text}</Tag>
                  )}
                />
                <Table.Column title="注册用户数" dataIndex="register_count" key="register_count" />
                <Table.Column
                  title="创建时间"
                  dataIndex="created_at"
                  key="created_at"
                  render={(time) => {
                    if (!time) return '-';
                    const timestamp = time > 10000000000 ? time / 1000 : time;
                    return timestamp2string(timestamp);
                  }}
                />
                <Table.Column
                  title="操作"
                  key="action"
                  render={(text, record) => (
                    <Space>
                      {record.status === 0 && (
                        <Button size="small" onClick={() => verifyDomain(record.id)}>
                          验证
                        </Button>
                      )}
                      <Button size="small" type="danger" onClick={() => deleteDomain(record.id)}>
                        <IconDelete />
                      </Button>
                    </Space>
                  )}
                />
              </Table>
            )}
          </Card>
        </TabPane>

        <TabPane tab="推广用户" itemKey="users" icon={<IconUser />}>
          <Card style={{ marginTop: '16px' }}>
            <Table
              dataSource={users}
              loading={usersLoading}
              pagination={{
                currentPage: usersPagination.currentPage,
                pageSize: usersPagination.pageSize,
                total: usersPagination.total,
                onPageChange: (page) => loadUsers(page, usersPagination.pageSize),
              }}
            >
              <Table.Column title="ID" dataIndex="id" key="id" width={80} />
              <Table.Column title="用户名" dataIndex="username" key="username" />
              <Table.Column title="显示名" dataIndex="display_name" key="display_name" />
              <Table.Column title="邮箱" dataIndex="email" key="email" />
              <Table.Column
                title="余额"
                dataIndex="quota"
                key="quota"
                render={(quota) => `${(quota / 500000).toFixed(2)} $`}
              />
              <Table.Column
                title="消费额"
                dataIndex="used_quota"
                key="used_quota"
                render={(quota) => `${(quota / 500000).toFixed(2)} $`}
              />
              <Table.Column
                title="注册时间"
                dataIndex="created_at"
                key="created_at"
                render={(time) => {
                  if (!time) return '-';
                  const timestamp = time > 10000000000 ? time / 1000 : time;
                  return timestamp2string(timestamp);
                }}
              />
            </Table>
          </Card>
        </TabPane>
      </Tabs>

      {/* 提现申请弹窗 */}
      <Modal
        title="申请提现"
        visible={showWithdrawalModal}
        onCancel={() => {
          setShowWithdrawalModal(false);
          setWithdrawalForm({ amount: 0, bank_name: '', bank_account: '', account_name: '' });
        }}
        onOk={submitWithdrawal}
        okText="提交申请"
        cancelText="取消"
      >
        <Banner
          type="info"
          description={`可提现余额: ${((commissionStats.commission_balance || 0) / 500000).toFixed(2)} $，最低提现金额: ${((commissionStats.min_withdraw_amount || 500000) / 500000).toFixed(2)} $`}
          style={{ marginBottom: '16px' }}
        />
        <Form>
          <Form.InputNumber
            field="amount"
            label="提现金额（$）"
            placeholder="请输入提现金额"
            value={withdrawalForm.amount / 500000}
            onChange={(value) => setWithdrawalForm({ ...withdrawalForm, amount: Math.floor(value * 500000) })}
            min={0}
            style={{ width: '100%', marginBottom: '16px' }}
          />
          <Form.Input
            field="bank_name"
            label="银行名称"
            placeholder="请输入银行名称"
            value={withdrawalForm.bank_name}
            onChange={(value) => setWithdrawalForm({ ...withdrawalForm, bank_name: value })}
            style={{ marginBottom: '16px' }}
          />
          <Form.Input
            field="bank_account"
            label="银行账号"
            placeholder="请输入银行账号"
            value={withdrawalForm.bank_account}
            onChange={(value) => setWithdrawalForm({ ...withdrawalForm, bank_account: value })}
            style={{ marginBottom: '16px' }}
          />
          <Form.Input
            field="account_name"
            label="账户名"
            placeholder="请输入账户名"
            value={withdrawalForm.account_name}
            onChange={(value) => setWithdrawalForm({ ...withdrawalForm, account_name: value })}
            style={{ marginBottom: '16px' }}
          />
        </Form>
      </Modal>

    </div>
  );
};

export default AgentDashboard;
