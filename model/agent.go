package model

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"gorm.io/gorm"
)

// 代理商申请状态常量
const (
	AgentApplicationStatusPending  = 0 // 待审核
	AgentApplicationStatusApproved = 1 // 已通过
	AgentApplicationStatusRejected = 2 // 已拒绝
)

// 域名类型常量
const (
	AgentDomainTypeCustom = 0 // 用户自定义域名
	AgentDomainTypeSystem = 1 // 系统分配子域名
)

// 域名状态常量
const (
	AgentDomainStatusPending  = 0 // 待验证
	AgentDomainStatusActive   = 1 // 已生效
	AgentDomainStatusDisabled = 2 // 已禁用
)

// 提现状态常量
const (
	AgentWithdrawalStatusPending  = 0 // 待审核
	AgentWithdrawalStatusApproved = 1 // 已通过
	AgentWithdrawalStatusRejected = 2 // 已拒绝
)

// AgentApplication 代理商申请表
type AgentApplication struct {
	Id             int            `json:"id" gorm:"primaryKey"`
	UserId         int            `json:"user_id" gorm:"index;not null"`     // 申请人ID
	Username       string         `json:"username" gorm:"size:64"`           // 申请人用户名（冗余）
	Email          string         `json:"email" gorm:"size:128"`             // 联系邮箱
	Phone          string         `json:"phone" gorm:"size:32"`              // 联系电话
	Domain         string         `json:"domain" gorm:"size:255"`            // 申请的自定义域名
	BusinessInfo   string         `json:"business_info" gorm:"type:text"`    // 业务描述
	SSLCertificate string         `json:"ssl_certificate" gorm:"type:text"` // SSL证书内容（PEM格式）
	Status         int            `json:"status" gorm:"type:int;default:0"` // 状态：0待审核 1通过 2拒绝
	RejectReason   string         `json:"reject_reason" gorm:"size:255"`     // 拒绝原因
	ReviewerId     int            `json:"reviewer_id"`                       // 审核人ID
	ReviewerName   string         `json:"reviewer_name" gorm:"size:64"`      // 审核人用户名
	ReviewedAt     *int64         `json:"reviewed_at"`                       // 审核时间
	CreatedAt      int64          `json:"created_at" gorm:"index"`
	UpdatedAt      int64          `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// AgentDomain 代理商域名表
type AgentDomain struct {
	Id            int            `json:"id" gorm:"primaryKey"`
	AgentId       int            `json:"agent_id" gorm:"index;not null"`        // 代理商用户ID
	Domain        string         `json:"domain" gorm:"size:255;uniqueIndex"`    // 绑定的域名
	DomainType    int            `json:"domain_type" gorm:"type:int;default:0"` // 域名类型：0自定义 1系统分配
	Subdomain     string         `json:"subdomain" gorm:"size:64"`              // 系统分配的子域名前缀
	Status        int            `json:"status" gorm:"type:int;default:0"`      // 状态：0待验证 1已生效 2已禁用
	VerifyToken   string         `json:"verify_token" gorm:"size:64"`           // 域名验证令牌
	VerifiedAt    *int64         `json:"verified_at"`                           // 验证时间
	RegisterCount int            `json:"register_count" gorm:"default:0"`       // 通过此域名注册的用户数
	CreatedAt     int64          `json:"created_at" gorm:"index"`
	UpdatedAt     int64          `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

// TableName 指定表名
func (AgentApplication) TableName() string {
	return "agent_applications"
}

func (AgentDomain) TableName() string {
	return "agent_domains"
}

// AgentCommissionLog 代理商分成记录表

type AgentCommissionLog struct {
	Id              int   `json:"id" gorm:"primaryKey"`
	AgentId         int   `json:"agent_id" gorm:"index;not null"`          // 代理商用户ID
	UserId          int   `json:"user_id" gorm:"index"`                   // 充值用户ID
	TopupId         int   `json:"topup_id" gorm:"index"`                  // 关联的充值记录ID
	TopupAmount     int   `json:"topup_amount"`                           // 充值金额（quota）
	CommissionRate  int   `json:"commission_rate"`                        // 分成比例（快照）
	CommissionAmount int  `json:"commission_amount"`                      // 分成金额（quota）
	CreatedAt       int64 `json:"created_at" gorm:"index"`
}

// AgentWithdrawal 代理商提现申请表
type AgentWithdrawal struct {
	Id           int            `json:"id" gorm:"primaryKey"`
	AgentId      int            `json:"agent_id" gorm:"index;not null"`     // 代理商用户ID
	Amount       int            `json:"amount"`                             // 提现金额（quota）
	Status       int            `json:"status" gorm:"type:int;default:0"`  // 状态：0待审核 1已通过 2已拒绝
	BankName     string         `json:"bank_name" gorm:"size:64"`           // 银行名称
	BankAccount  string         `json:"bank_account" gorm:"size:64"`        // 银行账号
	AccountName  string         `json:"account_name" gorm:"size:64"`        // 账户名
	RejectReason string         `json:"reject_reason" gorm:"size:255"`      // 拒绝原因
	ReviewerId   int            `json:"reviewer_id"`                        // 审核人ID
	ReviewerName string         `json:"reviewer_name" gorm:"size:64"`       // 审核人用户名
	ReviewedAt   *int64         `json:"reviewed_at"`                        // 审核时间
	CreatedAt    int64          `json:"created_at" gorm:"index"`
	UpdatedAt    int64          `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

func (AgentCommissionLog) TableName() string {
	return "agent_commission_logs"
}

func (AgentWithdrawal) TableName() string {
	return "agent_withdrawals"
}

// Insert 创建代理商申请
func (app *AgentApplication) Insert() error {
	app.CreatedAt = time.Now().Unix()
	app.UpdatedAt = time.Now().Unix()
	return DB.Create(app).Error
}

// Update 更新代理商申请
func (app *AgentApplication) Update() error {
	app.UpdatedAt = time.Now().Unix()
	return DB.Save(app).Error
}

// GetAgentApplicationById 根据ID获取申请
func GetAgentApplicationById(id int) (*AgentApplication, error) {
	var app AgentApplication
	err := DB.First(&app, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

// GetAgentApplicationByUserId 根据用户ID获取申请
func GetAgentApplicationByUserId(userId int) (*AgentApplication, error) {
	var app AgentApplication
	err := DB.Where("user_id = ?", userId).Order("id desc").First(&app).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

// GetPendingAgentApplications 获取待审核的申请列表
func GetPendingAgentApplications(page, pageSize int) ([]*AgentApplication, int64, error) {
	var apps []*AgentApplication
	var total int64

	query := DB.Model(&AgentApplication{}).Where("status = ?", AgentApplicationStatusPending)
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err = query.Order("id desc").Offset(offset).Limit(pageSize).Find(&apps).Error
	return apps, total, err
}

// GetAllAgentApplications 获取所有申请列表
func GetAllAgentApplications(page, pageSize int, status int) ([]*AgentApplication, int64, error) {
	var apps []*AgentApplication
	var total int64

	query := DB.Model(&AgentApplication{})
	if status >= 0 {
		query = query.Where("status = ?", status)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err = query.Order("id desc").Offset(offset).Limit(pageSize).Find(&apps).Error
	return apps, total, err
}

// ApproveAgentApplication 批准申请
func ApproveAgentApplication(id int, reviewerId int, reviewerName string, commissionRate int) error {
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 获取申请
	var app AgentApplication
	if err := tx.First(&app, "id = ?", id).Error; err != nil {
		tx.Rollback()
		return err
	}

	if app.Status != AgentApplicationStatusPending {
		tx.Rollback()
		return errors.New("该申请已处理")
	}

	// 如果没有指定分成比例，使用系统默认值
	if commissionRate <= 0 {
		commissionRate = GetDefaultAgentCommissionRate()
	}

	// 更新申请状态
	now := time.Now().Unix()
	app.Status = AgentApplicationStatusApproved
	app.ReviewerId = reviewerId
	app.ReviewerName = reviewerName
	app.ReviewedAt = &now

	if err := tx.Save(&app).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 更新用户角色为代理商，并设置分成比例
	if err := tx.Model(&User{}).Where("id = ?", app.UserId).Updates(map[string]interface{}{
		"role":            common.RoleAgentUser,
		"commission_rate": commissionRate,
	}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 创建域名记录
	var domainStr string
	var domainType int
	var subdomain string

	if app.Domain != "" {
		// 用户提供了自定义域名
		domainStr = app.Domain
		domainType = AgentDomainTypeCustom
	} else {
		// 没有提供自定义域名，根据主站域名生成子域名
		generatedDomain, err := generateSubdomainFromServerAddress(app.UserId, app.Username)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("生成子域名失败: %v", err)
		}
		domainStr = generatedDomain
		domainType = AgentDomainTypeSystem
		subdomain = extractSubdomainPrefix(generatedDomain)
	}

	// 检查域名是否已存在
	var existingCount int64
	tx.Model(&AgentDomain{}).Where("domain = ?", domainStr).Count(&existingCount)
	if existingCount > 0 {
		tx.Rollback()
		return errors.New("域名已被使用")
	}

	domain := &AgentDomain{
		AgentId:     app.UserId,
		Domain:      domainStr,
		DomainType:  domainType,
		Subdomain:   subdomain,
		Status:      AgentDomainStatusActive, // 审批通过后直接生效
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	// 自定义域名需要验证
	if domainType == AgentDomainTypeCustom {
		domain.Status = AgentDomainStatusPending
		domain.VerifyToken = common.GetRandomString(32)
	}

	if err := tx.Create(domain).Error; err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return err
	}

	// 发送审核通过通知
	sendAgentApprovalNotification(&app, commissionRate)

	return nil
}

// RejectAgentApplication 拒绝申请
func RejectAgentApplication(id int, reviewerId int, reviewerName string, reason string) error {
	app, err := GetAgentApplicationById(id)
	if err != nil {
		return err
	}

	if app.Status != AgentApplicationStatusPending {
		return errors.New("该申请已处理")
	}

	now := time.Now().Unix()
	app.Status = AgentApplicationStatusRejected
	app.ReviewerId = reviewerId
	app.ReviewerName = reviewerName
	app.RejectReason = reason
	app.ReviewedAt = &now

	if err := app.Update(); err != nil {
		return err
	}

	// 发送审核拒绝通知
	sendAgentRejectionNotification(app)

	return nil
}

// Insert 创建域名记录
func (domain *AgentDomain) Insert() error {
	domain.CreatedAt = time.Now().Unix()
	domain.UpdatedAt = time.Now().Unix()
	return DB.Create(domain).Error
}

// Update 更新域名记录
func (domain *AgentDomain) Update() error {
	domain.UpdatedAt = time.Now().Unix()
	return DB.Save(domain).Error
}

// GetAgentDomainById 根据ID获取域名
func GetAgentDomainById(id int) (*AgentDomain, error) {
	var domain AgentDomain
	err := DB.First(&domain, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &domain, nil
}

// GetAgentDomainByAgentId 根据代理商ID获取域名列表
func GetAgentDomainByAgentId(agentId int) ([]*AgentDomain, error) {
	var domains []*AgentDomain
	err := DB.Where("agent_id = ?", agentId).Find(&domains).Error
	return domains, err
}

// GetActiveAgentDomainByDomain 根据域名获取有效的域名记录
func GetActiveAgentDomainByDomain(domain string) (*AgentDomain, error) {
	var agentDomain AgentDomain
	err := DB.Where("domain = ? AND status = ?", domain, AgentDomainStatusActive).First(&agentDomain).Error
	if err != nil {
		return nil, err
	}
	return &agentDomain, nil
}

// GetAgentDomainByDomain 根据域名获取域名记录（不限状态）
func GetAgentDomainByDomain(domain string) (*AgentDomain, error) {
	var agentDomain AgentDomain
	err := DB.Where("domain = ?", domain).First(&agentDomain).Error
	if err != nil {
		return nil, err
	}
	return &agentDomain, nil
}

// GetAgentDomainBySubdomain 根据子域名获取域名记录
func GetAgentDomainBySubdomain(subdomain string) (*AgentDomain, error) {
	var agentDomain AgentDomain
	err := DB.Where("subdomain = ? AND domain_type = ?", subdomain, AgentDomainTypeSystem).First(&agentDomain).Error
	if err != nil {
		return nil, err
	}
	return &agentDomain, nil
}

// VerifyDomain 验证域名
func (domain *AgentDomain) VerifyDomain() error {
	domain.Status = AgentDomainStatusActive
	now := time.Now().Unix()
	domain.VerifiedAt = &now
	return domain.Update()
}

// IncrementRegisterCount 增加注册计数
func (domain *AgentDomain) IncrementRegisterCount() error {
	return DB.Model(&AgentDomain{}).Where("id = ?", domain.Id).
		Update("register_count", gorm.Expr("register_count + ?", 1)).Error
}

// DeleteAgentDomain 删除域名
func DeleteAgentDomain(id int, agentId int) error {
	return DB.Where("id = ? AND agent_id = ?", id, agentId).Delete(&AgentDomain{}).Error
}

// GetAgentUsers 获取代理商推广的用户列表
func GetAgentUsers(agentId int, page, pageSize int, keyword string) ([]*User, int64, error) {
	var users []*User
	var total int64

	query := DB.Model(&User{}).Where("agent_id = ?", agentId)
	if keyword != "" {
		query = query.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err = query.Omit("password").Order("id desc").Offset(offset).Limit(pageSize).Find(&users).Error
	return users, total, err
}

// GetAgentUserStats 获取代理商用户统计
func GetAgentUserStats(agentId int) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 总推广用户数
	var totalUsers int64
	DB.Model(&User{}).Where("agent_id = ?", agentId).Count(&totalUsers)
	stats["total_users"] = totalUsers

	// 今日新增用户数
	today := time.Now().Format("2006-01-02")
	todayStart, _ := time.Parse("2006-01-02", today)
	todayEnd := todayStart.Add(24 * time.Hour)
	var todayUsers int64
	DB.Model(&User{}).Where("agent_id = ? AND created_at >= ? AND created_at < ?",
		agentId, todayStart.Unix(), todayEnd.Unix()).Count(&todayUsers)
	stats["today_users"] = todayUsers

	// 推广用户总充值
	var totalTopup int64
	DB.Table("topups").
		Where("user_id IN (SELECT id FROM users WHERE agent_id = ?)", agentId).
		Where("status = ?", "success").
		Select("COALESCE(SUM(quota), 0)").
		Scan(&totalTopup)
	stats["total_topup"] = totalTopup

	// 推广用户总消费
	var totalQuota int64
	DB.Model(&User{}).Where("agent_id = ?", agentId).
		Select("COALESCE(SUM(used_quota), 0)").
		Scan(&totalQuota)
	stats["total_quota"] = totalQuota

	return stats, nil
}

// GetAgentTopupData 获取代理商推广用户充值数据
func GetAgentTopupData(agentId int, startTime, endTime int64) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := DB.Table("topups").
		Select("DATE(FROM_UNIXTIME(created_at)) as date, SUM(quota) as quota, COUNT(*) as count").
		Where("user_id IN (SELECT id FROM users WHERE agent_id = ?)", agentId).
		Where("status = ?", "success").
		Where("created_at >= ? AND created_at <= ?", startTime, endTime).
		Group("DATE(FROM_UNIXTIME(created_at))").
		Order("date").
		Find(&results).Error

	return results, err
}

// GetAgentQuotaData 获取代理商推广用户消费数据
func GetAgentQuotaData(agentId int, startTime, endTime int64) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	// 使用 quota_data 表获取消费数据
	err := DB.Table("quota_data").
		Select("DATE(FROM_UNIXTIME(created_at)) as date, SUM(quota) as quota, SUM(token_used) as token_used, SUM(count) as count").
		Where("user_id IN (SELECT id FROM users WHERE agent_id = ?)", agentId).
		Where("created_at >= ? AND created_at <= ?", startTime, endTime).
		Group("DATE(FROM_UNIXTIME(created_at))").
		Order("date").
		Find(&results).Error

	return results, err
}

// generateSubdomainFromServerAddress 根据主站域名生成子域名
// 例如：ServerAddress 为 https://www.demo.com，生成 aaa.demo.com
func generateSubdomainFromServerAddress(userId int, username string) (string, error) {
	serverAddr := system_setting.ServerAddress
	if serverAddr == "" {
		return "", errors.New("系统未配置主站域名")
	}

	// 解析 ServerAddress 获取域名
	var host string
	if strings.HasPrefix(serverAddr, "http://") || strings.HasPrefix(serverAddr, "https://") {
		parsed, err := url.Parse(serverAddr)
		if err != nil {
			return "", fmt.Errorf("解析主站域名失败: %v", err)
		}
		host = parsed.Host
	} else {
		host = serverAddr
	}

	// 移除端口号（如果有）
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}

	// 生成子域名前缀（使用用户名或随机字符串）
	subdomainPrefix := username
	if subdomainPrefix == "" {
		subdomainPrefix = fmt.Sprintf("agent%d", userId)
	}
	// 确保子域名只包含有效字符
	subdomainPrefix = strings.ToLower(subdomainPrefix)
	subdomainPrefix = strings.ReplaceAll(subdomainPrefix, " ", "")
	// 移除特殊字符，只保留字母数字和下划线
	var cleanPrefix strings.Builder
	for _, c := range subdomainPrefix {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' {
			cleanPrefix.WriteRune(c)
		}
	}
	subdomainPrefix = cleanPrefix.String()
	if subdomainPrefix == "" {
		subdomainPrefix = common.GetRandomString(6)
	}

	// 检查子域名是否已存在，如果存在则添加随机后缀
	var count int64
	for i := 0; i < 10; i++ { // 最多尝试10次
		candidateDomain := subdomainPrefix + "." + host
		DB.Model(&AgentDomain{}).Where("domain = ?", candidateDomain).Count(&count)
		if count == 0 {
			return candidateDomain, nil
		}
		// 添加随机后缀重试
		subdomainPrefix = subdomainPrefix + "_" + common.GetRandomString(4)
	}

	return "", errors.New("无法生成唯一的子域名")
}

// extractSubdomainPrefix 从完整域名中提取子域名前缀
func extractSubdomainPrefix(domain string) string {
	parts := strings.Split(domain, ".")
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// CreateSystemSubdomain 为代理商创建系统子域名
func CreateSystemSubdomain(agentId int, username string) (*AgentDomain, error) {
	subdomain := username
	// 确保子域名唯一
	var count int64
	DB.Model(&AgentDomain{}).Where("subdomain = ?", subdomain).Count(&count)
	if count > 0 {
		subdomain = fmt.Sprintf("%s_%s", username, common.GetRandomString(4))
	}

	now := time.Now().Unix()
	domain := &AgentDomain{
		AgentId:    agentId,
		Domain:     subdomain + ".agent." + common.GetRandomString(8) + ".com", // 实际部署时替换为真实域名
		DomainType: AgentDomainTypeSystem,
		Subdomain:  subdomain,
		Status:     AgentDomainStatusActive, // 系统分配的子域名直接生效
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	err := domain.Insert()
	if err != nil {
		return nil, err
	}

	return domain, nil
}

// IsAgent 检查用户是否为代理商
func IsAgent(userId int) bool {
	var user User
	err := DB.Where("id = ?", userId).Select("role").First(&user).Error
	if err != nil {
		return false
	}
	return user.Role >= common.RoleAgentUser
}

// ========== 超管全局代理统计 ==========

// GetAllAgentStats 获取所有代理商的全局统计数据（超管用）
func GetAllAgentStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 总代理商数
	var totalAgents int64
	DB.Model(&User{}).Where("role >= ?", common.RoleAgentUser).Count(&totalAgents)
	stats["total_agents"] = totalAgents

	// 总代理域名数
	var totalDomains int64
	DB.Model(&AgentDomain{}).Count(&totalDomains)
	stats["total_domains"] = totalDomains

	// 有效域名数
	var activeDomains int64
	DB.Model(&AgentDomain{}).Where("status = ?", AgentDomainStatusActive).Count(&activeDomains)
	stats["active_domains"] = activeDomains

	// 通过代理推广注册的总用户数
	var totalReferralUsers int64
	DB.Model(&User{}).Where("agent_id > 0").Count(&totalReferralUsers)
	stats["total_referral_users"] = totalReferralUsers

	// 今日新增代理用户数
	today := time.Now().Format("2006-01-02")
	todayStart, _ := time.Parse("2006-01-02", today)
	todayEnd := todayStart.Add(24 * time.Hour)
	var todayReferralUsers int64
	DB.Model(&User{}).Where("agent_id > 0 AND created_at >= ? AND created_at < ?",
		todayStart.Unix(), todayEnd.Unix()).Count(&todayReferralUsers)
	stats["today_referral_users"] = todayReferralUsers

	// 代理推广用户总充值
	var totalReferralTopup int64
	DB.Table("topups").
		Where("user_id IN (SELECT id FROM users WHERE agent_id > 0)").
		Where("status = ?", "success").
		Select("COALESCE(SUM(quota), 0)").
		Scan(&totalReferralTopup)
	stats["total_referral_topup"] = totalReferralTopup

	// 代理推广用户总消费
	var totalReferralQuota int64
	DB.Model(&User{}).Where("agent_id > 0").
		Select("COALESCE(SUM(used_quota), 0)").
		Scan(&totalReferralQuota)
	stats["total_referral_quota"] = totalReferralQuota

	// 待审核代理商申请数
	var pendingApplications int64
	DB.Model(&AgentApplication{}).Where("status = ?", AgentApplicationStatusPending).Count(&pendingApplications)
	stats["pending_applications"] = pendingApplications

	// 各代理商统计列表（前10名）
	var agentList []map[string]interface{}
	DB.Table("users u").
		Select(`u.id, u.username, u.display_name, 
			(SELECT COUNT(*) FROM users WHERE agent_id = u.id) as referral_count,
			(SELECT COALESCE(SUM(used_quota), 0) FROM users WHERE agent_id = u.id) as total_quota`).
		Where("u.role >= ?", common.RoleAgentUser).
		Order("referral_count DESC").
		Limit(10).
		Find(&agentList)
	stats["top_agents"] = agentList

	return stats, nil
}

// GetAllAgentTrendData 获取所有代理用户的趋势数据
func GetAllAgentTrendData(startTime, endTime int64) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := DB.Table("quota_data").
		Select("DATE(FROM_UNIXTIME(created_at)) as date, SUM(quota) as quota, SUM(token_used) as token_used, SUM(count) as count").
		Where("user_id IN (SELECT id FROM users WHERE agent_id > 0)").
		Where("created_at >= ? AND created_at <= ?", startTime, endTime).
		Group("DATE(FROM_UNIXTIME(created_at))").
		Order("date").
		Find(&results).Error

	return results, err
}

// GetAllAgentTopupTrendData 获取所有代理用户的充值趋势数据
func GetAllAgentTopupTrendData(startTime, endTime int64) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	err := DB.Table("topups").
		Select("DATE(FROM_UNIXTIME(created_at)) as date, SUM(quota) as quota, COUNT(*) as count").
		Where("user_id IN (SELECT id FROM users WHERE agent_id > 0)").
		Where("status = ?", "success").
		Where("created_at >= ? AND created_at <= ?", startTime, endTime).
		Group("DATE(FROM_UNIXTIME(created_at))").
		Order("date").
		Find(&results).Error

	return results, err
}

// ========== 代理商及其下级统计增强 ==========

// GetAgentStatsWithSelf 获取代理商及其下级用户统计数据（包含代理商自己的数据）
func GetAgentStatsWithSelf(agentId int) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 获取代理商自己的下级用户ID列表
	var referralUserIds []int
	DB.Model(&User{}).Where("agent_id = ?", agentId).Pluck("id", &referralUserIds)

	// 总推广用户数（下级）
	stats["total_users"] = len(referralUserIds)

	// 今日新增用户数
	today := time.Now().Format("2006-01-02")
	todayStart, _ := time.Parse("2006-01-02", today)
	todayEnd := todayStart.Add(24 * time.Hour)
	var todayUsers int64
	DB.Model(&User{}).Where("agent_id = ? AND created_at >= ? AND created_at < ?",
		agentId, todayStart.Unix(), todayEnd.Unix()).Count(&todayUsers)
	stats["today_users"] = todayUsers

	// 下级用户总充值
	var totalTopup int64
	if len(referralUserIds) > 0 {
		DB.Table("topups").
			Where("user_id IN ?", referralUserIds).
			Where("status = ?", "success").
			Select("COALESCE(SUM(quota), 0)").
			Scan(&totalTopup)
	}
	stats["total_topup"] = totalTopup

	// 下级用户总消费
	var totalQuota int64
	DB.Model(&User{}).Where("agent_id = ?", agentId).
		Select("COALESCE(SUM(used_quota), 0)").
		Scan(&totalQuota)
	stats["total_quota"] = totalQuota

	// 下级用户当前总余额
	var totalBalance int64
	DB.Model(&User{}).Where("agent_id = ?", agentId).
		Select("COALESCE(SUM(quota), 0)").
		Scan(&totalBalance)
	stats["total_balance"] = totalBalance

	// 代理商自己的数据
	agentUser, err := GetUserById(agentId, false)
	if err == nil {
		stats["agent_quota"] = agentUser.Quota
		stats["agent_used_quota"] = agentUser.UsedQuota
		// 分成相关数据
		stats["commission_balance"] = agentUser.CommissionBalance
		stats["commission_total"] = agentUser.CommissionTotal
		stats["commission_withdrawn"] = agentUser.CommissionWithdrawn
		stats["commission_rate"] = agentUser.CommissionRate
	}

	// 最低提现金额
	stats["min_withdraw_amount"] = GetAgentMinWithdrawAmount()

	// 获取域名信息
	domains, _ := GetAgentDomainByAgentId(agentId)
	stats["domains_count"] = len(domains)
	stats["active_domains_count"] = 0
	for _, d := range domains {
		if d.Status == AgentDomainStatusActive {
			stats["active_domains_count"] = stats["active_domains_count"].(int) + 1
		}
	}

	return stats, nil
}

// GetAgentTrendDataWithSelf 获取代理商下级用户的趋势数据（含消费和充值）
func GetAgentTrendDataWithSelf(agentId int, startTime, endTime int64) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 消费趋势
	quotaData, err := GetAgentQuotaData(agentId, startTime, endTime)
	if err != nil {
		return nil, err
	}
	result["quota_trend"] = quotaData

	// 充值趋势
	topupData, err := GetAgentTopupData(agentId, startTime, endTime)
	if err != nil {
		return nil, err
	}
	result["topup_trend"] = topupData

	// 新用户趋势
	var newUserTrend []map[string]interface{}
	err = DB.Table("users").
		Select("DATE(FROM_UNIXTIME(created_at)) as date, COUNT(*) as count").
		Where("agent_id = ?", agentId).
		Where("created_at >= ? AND created_at <= ?", startTime, endTime).
		Group("DATE(FROM_UNIXTIME(created_at))").
		Order("date").
		Find(&newUserTrend).Error
	if err != nil {
		return nil, err
	}
	result["new_user_trend"] = newUserTrend

	return result, nil
}

// ========== 代理商分成配置 ==========

const (
	DefaultAgentCommissionRate    = 5  // 默认分成比例 5%
	DefaultAgentMinWithdrawAmount = 500000 // 默认最低提现金额（quota，约 1 美元）
)

// GetDefaultAgentCommissionRate 获取系统默认分成比例
func GetDefaultAgentCommissionRate() int {
	var option Option
	err := DB.Where("key = ?", "AgentCommissionRate").First(&option).Error
	if err != nil {
		return DefaultAgentCommissionRate
	}
	rate, err := strconv.Atoi(option.Value)
	if err != nil || rate < 0 || rate > 100 {
		return DefaultAgentCommissionRate
	}
	return rate
}

// GetAgentMinWithdrawAmount 获取最低提现金额
func GetAgentMinWithdrawAmount() int {
	var option Option
	err := DB.Where("key = ?", "AgentMinWithdrawAmount").First(&option).Error
	if err != nil {
		return DefaultAgentMinWithdrawAmount
	}
	amount, err := strconv.Atoi(option.Value)
	if err != nil || amount <= 0 {
		return DefaultAgentMinWithdrawAmount
	}
	return amount
}

// ========== 代理商分成逻辑 ==========

// ProcessAgentCommission 处理代理商分成（充值成功后调用）
func ProcessAgentCommission(userId int, topupId int, topupAmount int) error {
	// 获取用户信息
	user, err := GetUserById(userId, false)
	if err != nil {
		return err
	}

	// 检查用户是否有代理商
	if user.AgentId <= 0 {
		return nil // 没有代理商，无需分成
	}

	// 获取代理商信息
	agent, err := GetUserById(user.AgentId, false)
	if err != nil {
		return err
	}

	// 检查代理商的分成比例
	if agent.CommissionRate <= 0 {
		return nil // 分成比例为0，无需分成
	}

	// 计算分成金额
	commissionAmount := topupAmount * agent.CommissionRate / 100
	if commissionAmount <= 0 {
		return nil
	}

	// 更新代理商账户
	err = DB.Model(&User{}).Where("id = ?", agent.Id).Updates(map[string]interface{}{
		"commission_balance": gorm.Expr("commission_balance + ?", commissionAmount),
		"commission_total":   gorm.Expr("commission_total + ?", commissionAmount),
	}).Error
	if err != nil {
		return err
	}

	// 记录分成日志
	log := &AgentCommissionLog{
		AgentId:          agent.Id,
		UserId:           userId,
		TopupId:          topupId,
		TopupAmount:      topupAmount,
		CommissionRate:   agent.CommissionRate,
		CommissionAmount: commissionAmount,
		CreatedAt:        time.Now().Unix(),
	}

	return DB.Create(log).Error
}

// ========== 代理商分成比例调整 ==========

// UpdateAgentCommissionRate 更新代理商分成比例
func UpdateAgentCommissionRate(userId int, commissionRate int) error {
	if commissionRate < 0 || commissionRate > 100 {
		return errors.New("分成比例必须在 0-100 之间")
	}
	return DB.Model(&User{}).Where("id = ?", userId).Update("commission_rate", commissionRate).Error
}

// ========== 提现申请相关 ==========

// CreateWithdrawal 创建提现申请
func CreateWithdrawal(agentId int, amount int, bankName, bankAccount, accountName string) (*AgentWithdrawal, error) {
	// 检查余额是否充足
	user, err := GetUserById(agentId, false)
	if err != nil {
		return nil, err
	}

	minAmount := GetAgentMinWithdrawAmount()
	if amount < minAmount {
		return nil, fmt.Errorf("提现金额不能低于最低提现金额")
	}

	if user.CommissionBalance < amount {
		return nil, errors.New("可提现余额不足")
	}

	// 冻结余额
	err = DB.Model(&User{}).Where("id = ?", agentId).Update("commission_balance", gorm.Expr("commission_balance - ?", amount)).Error
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()
	withdrawal := &AgentWithdrawal{
		AgentId:     agentId,
		Amount:      amount,
		Status:      AgentWithdrawalStatusPending,
		BankName:    bankName,
		BankAccount: bankAccount,
		AccountName: accountName,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err = DB.Create(withdrawal).Error
	if err != nil {
		// 回滚余额
		DB.Model(&User{}).Where("id = ?", agentId).Update("commission_balance", gorm.Expr("commission_balance + ?", amount))
		return nil, err
	}

	return withdrawal, nil
}

// GetWithdrawalsByAgentId 获取代理商的提现记录
func GetWithdrawalsByAgentId(agentId, page, pageSize int) ([]*AgentWithdrawal, int64, error) {
	var withdrawals []*AgentWithdrawal
	var total int64

	query := DB.Model(&AgentWithdrawal{}).Where("agent_id = ?", agentId)
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err = query.Order("id desc").Offset(offset).Limit(pageSize).Find(&withdrawals).Error
	return withdrawals, total, err
}

// GetAllWithdrawals 获取所有提现记录（超管用）
func GetAllWithdrawals(page, pageSize, status int) ([]*AgentWithdrawal, int64, error) {
	var withdrawals []*AgentWithdrawal
	var total int64

	query := DB.Model(&AgentWithdrawal{})
	if status >= 0 {
		query = query.Where("status = ?", status)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err = query.Order("id desc").Offset(offset).Limit(pageSize).Find(&withdrawals).Error
	return withdrawals, total, err
}

// ApproveWithdrawal 批准提现申请
func ApproveWithdrawal(id int, reviewerId int, reviewerName string) error {
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var withdrawal AgentWithdrawal
	if err := tx.First(&withdrawal, "id = ?", id).Error; err != nil {
		tx.Rollback()
		return err
	}

	if withdrawal.Status != AgentWithdrawalStatusPending {
		tx.Rollback()
		return errors.New("该提现申请已处理")
	}

	now := time.Now().Unix()
	withdrawal.Status = AgentWithdrawalStatusApproved
	withdrawal.ReviewerId = reviewerId
	withdrawal.ReviewerName = reviewerName
	withdrawal.ReviewedAt = &now
	withdrawal.UpdatedAt = now

	if err := tx.Save(&withdrawal).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 更新已提现金额
	if err := tx.Model(&User{}).Where("id = ?", withdrawal.AgentId).
		Update("commission_withdrawn", gorm.Expr("commission_withdrawn + ?", withdrawal.Amount)).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// RejectWithdrawal 拒绝提现申请
func RejectWithdrawal(id int, reviewerId int, reviewerName string, reason string) error {
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var withdrawal AgentWithdrawal
	if err := tx.First(&withdrawal, "id = ?", id).Error; err != nil {
		tx.Rollback()
		return err
	}

	if withdrawal.Status != AgentWithdrawalStatusPending {
		tx.Rollback()
		return errors.New("该提现申请已处理")
	}

	now := time.Now().Unix()
	withdrawal.Status = AgentWithdrawalStatusRejected
	withdrawal.ReviewerId = reviewerId
	withdrawal.ReviewerName = reviewerName
	withdrawal.RejectReason = reason
	withdrawal.ReviewedAt = &now
	withdrawal.UpdatedAt = now

	if err := tx.Save(&withdrawal).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 退还余额
	if err := tx.Model(&User{}).Where("id = ?", withdrawal.AgentId).
		Update("commission_balance", gorm.Expr("commission_balance + ?", withdrawal.Amount)).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetCommissionLogsByAgentId 获取代理商的分成记录
func GetCommissionLogsByAgentId(agentId, page, pageSize int) ([]*AgentCommissionLog, int64, error) {
	var logs []*AgentCommissionLog
	var total int64

	query := DB.Model(&AgentCommissionLog{}).Where("agent_id = ?", agentId)
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err = query.Order("id desc").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

// sendAgentApprovalNotification 发送代理商审核通过通知
func sendAgentApprovalNotification(app *AgentApplication, commissionRate int) {
	// 获取用户信息
	user, err := GetUserById(app.UserId, false)
	if err != nil {
		return
	}

	// 发送邮件通知
	subject := "代理商申请审核通过通知"
	content := fmt.Sprintf(`
亲爱的用户 %s：

恭喜您！您的代理商申请已审核通过。

审核详情：
- 申请时间：%s
- 审核时间：%s
- 分成比例：%d%%
- 联系邮箱：%s

您现在可以登录系统，在"代理商中心"查看您的推广链接和数据统计。

如有任何问题，请联系管理员。

祝您推广顺利！
`, user.Username, time.Unix(app.CreatedAt, 0).Format("2006-01-02 15:04:05"),
		time.Unix(*app.ReviewedAt, 0).Format("2006-01-02 15:04:05"),
		commissionRate, app.Email)

	// 异步发送邮件
	go func() {
		if err := common.SendEmail(subject, user.Email, content); err != nil {
			common.SysLog(fmt.Sprintf("发送代理商审核通过通知失败: %v", err))
		}
	}()
}

// sendAgentRejectionNotification 发送代理商审核拒绝通知
func sendAgentRejectionNotification(app *AgentApplication) {
	// 获取用户信息
	user, err := GetUserById(app.UserId, false)
	if err != nil {
		return
	}

	// 发送邮件通知
	subject := "代理商申请审核结果通知"
	content := fmt.Sprintf(`
亲爱的用户 %s：

很抱歉，您的代理商申请未能通过审核。

审核详情：
- 申请时间：%s
- 审核时间：%s
- 拒绝原因：%s

您可以在系统中重新提交申请，如有疑问请联系管理员。

感谢您的关注！
`, user.Username, time.Unix(app.CreatedAt, 0).Format("2006-01-02 15:04:05"),
		time.Unix(*app.ReviewedAt, 0).Format("2006-01-02 15:04:05"),
		app.RejectReason)

	// 异步发送邮件
	go func() {
		if err := common.SendEmail(subject, user.Email, content); err != nil {
			common.SysLog(fmt.Sprintf("发送代理商审核拒绝通知失败: %v", err))
		}
	}()
}
