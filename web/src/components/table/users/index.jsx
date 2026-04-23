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

import React from 'react';
import CardPro from '../../common/ui/CardPro';
import UsersTable from './UsersTable';
import UsersActions from './UsersActions';
import UsersFilters from './UsersFilters';
import UsersDescription from './UsersDescription';
import AddUserModal from './modals/AddUserModal';
import EditUserModal from './modals/EditUserModal';
import { Modal, InputNumber, Typography } from '@douyinfe/semi-ui';
import { useUsersData } from '../../../hooks/users/useUsersData';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

const { Title, Text } = Typography;

const UsersPage = () => {
  const usersData = useUsersData();
  const isMobile = useIsMobile();

  const {
    // Modal state
    showAddUser,
    showEditUser,
    editingUser,
    setShowAddUser,
    closeAddUser,
    closeEditUser,
    refresh,

    // Form state
    formInitValues,
    setFormApi,
    searchUsers,
    loadUsers,
    activePage,
    pageSize,
    groupOptions,
    loading,
    searching,

    // Description state
    compactMode,
    setCompactMode,

    // 代理商分成
    showCommissionModal,
    commissionUser,
    commissionRate,
    setCommissionRate,
    closeCommissionModal,
    updateCommissionRate,

    // Translation
    t,
  } = usersData;

  return (
    <>
      <AddUserModal
        refresh={refresh}
        visible={showAddUser}
        handleClose={closeAddUser}
      />

      <EditUserModal
        refresh={refresh}
        visible={showEditUser}
        handleClose={closeEditUser}
        editingUser={editingUser}
      />

      {/* 代理商分成比例调整弹窗 */}
      <Modal
        title={t('调整分成比例')}
        visible={showCommissionModal}
        onCancel={closeCommissionModal}
        onOk={updateCommissionRate}
        okText={t('确认')}
        cancelText={t('取消')}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text>{t('用户')}: {commissionUser?.username} (ID: {commissionUser?.id})</Text>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Text>{t('分成比例（百分比）')}:</Text>
          <InputNumber
            value={commissionRate}
            onChange={(value) => setCommissionRate(value)}
            min={0}
            max={100}
            style={{ width: '120px', marginLeft: '8px' }}
            suffix="%"
          />
        </div>
        <Text type="tertiary">{t('用户充值时，该代理商可获得的分成比例')}</Text>
      </Modal>

      <CardPro
        type='type1'
        descriptionArea={
          <UsersDescription
            compactMode={compactMode}
            setCompactMode={setCompactMode}
            t={t}
          />
        }
        actionsArea={
          <div className='flex flex-col md:flex-row justify-between items-center gap-2 w-full'>
            <UsersActions setShowAddUser={setShowAddUser} t={t} />

            <UsersFilters
              formInitValues={formInitValues}
              setFormApi={setFormApi}
              searchUsers={searchUsers}
              loadUsers={loadUsers}
              activePage={activePage}
              pageSize={pageSize}
              groupOptions={groupOptions}
              loading={loading}
              searching={searching}
              t={t}
            />
          </div>
        }
        paginationArea={createCardProPagination({
          currentPage: usersData.activePage,
          pageSize: usersData.pageSize,
          total: usersData.userCount,
          onPageChange: usersData.handlePageChange,
          onPageSizeChange: usersData.handlePageSizeChange,
          isMobile: isMobile,
          t: usersData.t,
        })}
        t={usersData.t}
      >
        <UsersTable {...usersData} />
      </CardPro>
    </>
  );
};

export default UsersPage;
