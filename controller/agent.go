package controller

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

// ========== 代理商申请相关 ==========

type AgentApplicationRequest struct {
	Email          string `json:"email" binding:"required,email"`
	Phone          string `json:"phone"`
	Domain         string `json:"domain"`
	BusinessInfo   string `json:"business_info"`
	SSLCertificate string `json:"ssl_certificate"` // SSL证书内容（PEM格式）
}

// ApplyAgent 提交代理商申请
func ApplyAgent(c *gin.Context) {
	userId := c.GetInt("id")
	username := c.GetString("username")

	// 检查是否已有待审核的申请
	existingApp, err := model.GetAgentApplicationByUserId(userId)
	if err == nil && existingApp.Status == model.AgentApplicationStatusPending {
		common.ApiErrorI18n(c, i18n.MsgAgentApplicationPending)
		return
	}

	// 检查用户是否已经是代理商
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.Role >= common.RoleAgentUser {
		common.ApiErrorI18n(c, i18n.MsgAlreadyAgent)
		return
	}

	var req AgentApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// 清理域名
	domain := strings.TrimSpace(req.Domain)
	if domain != "" {
		domain = strings.TrimPrefix(domain, "http://")
		domain = strings.TrimPrefix(domain, "https://")
		domain = strings.TrimSuffix(domain, "/")
	}

	app := &model.AgentApplication{
		UserId:         userId,
		Username:       username,
		Email:          req.Email,
		Phone:          req.Phone,
		Domain:         domain,
		BusinessInfo:   req.BusinessInfo,
		SSLCertificate: req.SSLCertificate,
		Status:         model.AgentApplicationStatusPending,
		CreatedAt:      time.Now().Unix(),
		UpdatedAt:      time.Now().Unix(),
	}

	if err := app.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, app)
}

// GetAgentApplicationStatus 获取当前用户的申请状态
func GetAgentApplicationStatus(c *gin.Context) {
	userId := c.GetInt("id")

	app, err := model.GetAgentApplicationByUserId(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    app,
	})
}

// ========== 管理员审核相关 ==========

// GetAllAgentApplications 获取所有代理商申请
func GetAllAgentApplications(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}
	// status: 不传参数或传-1表示查询全部，0待审核，1已通过，2已拒绝
	statusStr := c.Query("status")
	status := -1 // 默认查询全部
	if statusStr != "" {
		val, err := strconv.Atoi(statusStr)
		if err == nil && val >= 0 {
			status = val
		}
	}

	apps, total, err := model.GetAllAgentApplications(page, pageSize, status)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":     apps,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// GetAgentDomainsByAdmin 管理员查看指定代理商的域名列表
func GetAgentDomainsByAdmin(c *gin.Context) {
	agentId, err := strconv.Atoi(c.Query("agent_id"))
	if err != nil || agentId <= 0 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	domains, err := model.GetAgentDomainByAgentId(agentId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, domains)
}

// ApproveAgentApplication 批准代理商申请
func ApproveAgentApplication(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// 解析请求体，获取分成比例
	var req struct {
		CommissionRate int `json:"commission_rate"` // 分成比例（百分比）
	}
	// 允许不传body，使用默认值
	c.ShouldBindJSON(&req)

	// 校验分成比例范围
	if req.CommissionRate < 0 || req.CommissionRate > 100 {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	reviewerId := c.GetInt("id")
	reviewerName := c.GetString("username")

	if err := model.ApproveAgentApplication(id, reviewerId, reviewerName, req.CommissionRate); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgAgentApplicationApproved, nil)
}

// RejectAgentApplication 拒绝代理商申请
func RejectAgentApplication(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	reviewerId := c.GetInt("id")
	reviewerName := c.GetString("username")

	if err := model.RejectAgentApplication(id, reviewerId, reviewerName, req.Reason); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgAgentApplicationRejected, nil)
}

// ========== 代理商域名管理 ==========

type AddAgentDomainRequest struct {
	Domain string `json:"domain" binding:"required"`
}

// AddAgentDomain 添加自定义域名
func AddAgentDomain(c *gin.Context) {
	agentId := c.GetInt("id")

	var req AddAgentDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// 清理域名
	domain := strings.TrimSpace(req.Domain)
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")
	domain = strings.TrimSuffix(domain, "/")

	if domain == "" {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	// 检查域名是否已被使用
	existingDomain, _ := model.GetActiveAgentDomainByDomain(domain)
	if existingDomain != nil {
		common.ApiErrorI18n(c, i18n.MsgDomainAlreadyUsed)
		return
	}

	// 检查代理商域名数量限制
	domains, _ := model.GetAgentDomainByAgentId(agentId)
	if len(domains) >= 5 {
		common.ApiErrorI18n(c, i18n.MsgDomainLimitExceeded)
		return
	}

	agentDomain := &model.AgentDomain{
		AgentId:     agentId,
		Domain:      domain,
		DomainType:  model.AgentDomainTypeCustom,
		Status:      model.AgentDomainStatusPending,
		VerifyToken: common.GetRandomString(32),
		CreatedAt:   time.Now().Unix(),
		UpdatedAt:   time.Now().Unix(),
	}

	if err := agentDomain.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, agentDomain)
}

// GetAgentDomains 获取代理商的域名列表
func GetAgentDomains(c *gin.Context) {
	agentId := c.GetInt("id")

	domains, err := model.GetAgentDomainByAgentId(agentId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, domains)
}

// VerifyAgentDomain 验证域名
func VerifyAgentDomain(c *gin.Context) {
	agentId := c.GetInt("id")
	domainId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	domain, err := model.GetAgentDomainById(domainId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if domain.AgentId != agentId {
		common.ApiErrorI18n(c, i18n.MsgNoPermission)
		return
	}

	// TODO: 实际的域名验证逻辑（DNS TXT记录验证）
	// 这里简化处理，直接设置为验证通过
	if err := domain.VerifyDomain(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgDomainVerified, nil)
}

// DeleteAgentDomain 删除域名
func DeleteAgentDomain(c *gin.Context) {
	agentId := c.GetInt("id")
	domainId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	if err := model.DeleteAgentDomain(domainId, agentId); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgDeleteSuccess, nil)
}

// GetAgentSubdomain 获取系统分配的子域名
func GetAgentSubdomain(c *gin.Context) {
	agentId := c.GetInt("id")

	// 检查是否已有系统分配的子域名
	domains, err := model.GetAgentDomainByAgentId(agentId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	for _, d := range domains {
		if d.DomainType == model.AgentDomainTypeSystem {
			common.ApiSuccess(c, d)
			return
		}
	}

	// 创建新的系统子域名
	user, err := model.GetUserById(agentId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	domain, err := model.CreateSystemSubdomain(agentId, user.Username)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, domain)
}

// ========== 代理商用户管理 ==========

// GetAgentUsers 获取代理商推广的用户列表
func GetAgentUsers(c *gin.Context) {
	agentId := c.GetInt("id")

	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}
	keyword := c.Query("keyword")

	users, total, err := model.GetAgentUsers(agentId, page, pageSize, keyword)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":     users,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// GetAgentUserStats 获取代理商用户统计
func GetAgentUserStats(c *gin.Context) {
	agentId := c.GetInt("id")

	stats, err := model.GetAgentUserStats(agentId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, stats)
}

// ========== 代理商Dashboard ==========

// GetAgentDashboardStats 获取代理商Dashboard统计数据
func GetAgentDashboardStats(c *gin.Context) {
	agentId := c.GetInt("id")

	stats, err := model.GetAgentUserStats(agentId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 获取域名信息
	domains, _ := model.GetAgentDomainByAgentId(agentId)
	stats["domains"] = domains

	// 获取推广链接
	var promotionLinks []map[string]interface{}
	for _, d := range domains {
		if d.Status == model.AgentDomainStatusActive {
			promotionLinks = append(promotionLinks, map[string]interface{}{
				"domain":        d.Domain,
				"register_count": d.RegisterCount,
				"type":          d.DomainType,
			})
		}
	}
	stats["promotion_links"] = promotionLinks

	common.ApiSuccess(c, stats)
}

// GetAgentTopupData 获取代理商推广用户充值趋势
func GetAgentTopupData(c *gin.Context) {
	agentId := c.GetInt("id")

	startTime, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTime, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)

	if startTime == 0 || endTime == 0 {
		// 默认最近30天
		endTime = time.Now().Unix()
		startTime = endTime - 30*24*3600
	}

	data, err := model.GetAgentTopupData(agentId, startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, data)
}

// GetAgentQuotaData 获取代理商推广用户消费趋势
func GetAgentQuotaData(c *gin.Context) {
	agentId := c.GetInt("id")

	startTime, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTime, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)

	if startTime == 0 || endTime == 0 {
		// 默认最近30天
		endTime = time.Now().Unix()
		startTime = endTime - 30*24*3600
	}

	data, err := model.GetAgentQuotaData(agentId, startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, data)
}

// ========== 超管全局代理统计接口 ==========

// GetAllAgentDashboardStats 超管获取全局代理统计数据
func GetAllAgentDashboardStats(c *gin.Context) {
	// 支持按代理ID筛选
	agentIdStr := c.Query("agent_id")
	
	if agentIdStr != "" {
		// 查看单个代理的数据
		agentId, err := strconv.Atoi(agentIdStr)
		if err != nil {
			common.ApiErrorI18n(c, i18n.MsgInvalidParams)
			return
		}
		stats, err := model.GetAgentStatsWithSelf(agentId)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		common.ApiSuccess(c, stats)
		return
	}
	
	// 获取全部代理统计
	stats, err := model.GetAllAgentStats()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, stats)
}

// GetAllAgentDashboardTrend 超管获取全局代理趋势数据
func GetAllAgentDashboardTrend(c *gin.Context) {
	startTime, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTime, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)

	if startTime == 0 || endTime == 0 {
		endTime = time.Now().Unix()
		startTime = endTime - 7*24*3600 // 默认7天
	}

	result := make(map[string]interface{})

	// 支持按代理ID筛选
	agentIdStr := c.Query("agent_id")
	if agentIdStr != "" {
		agentId, err := strconv.Atoi(agentIdStr)
		if err != nil {
			common.ApiErrorI18n(c, i18n.MsgInvalidParams)
			return
		}
		// 获取单个代理的趋势数据
		data, err := model.GetAgentTrendDataWithSelf(agentId, startTime, endTime)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		common.ApiSuccess(c, data)
		return
	}

	// 消费趋势
	quotaData, err := model.GetAllAgentTrendData(startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	result["quota_trend"] = quotaData

	// 充值趋势
	topupData, err := model.GetAllAgentTopupTrendData(startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	result["topup_trend"] = topupData

	common.ApiSuccess(c, result)
}

// ========== 代理商增强统计接口 ==========

// GetAgentDashboardStatsEnhanced 代理商获取增强统计数据（含自己和下级）
func GetAgentDashboardStatsEnhanced(c *gin.Context) {
	agentId := c.GetInt("id")

	stats, err := model.GetAgentStatsWithSelf(agentId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 获取域名信息
	domains, _ := model.GetAgentDomainByAgentId(agentId)
	stats["domains"] = domains

	common.ApiSuccess(c, stats)
}

// GetAgentDashboardTrendEnhanced 代理商获取趋势数据（含消费、充值和新用户）
func GetAgentDashboardTrendEnhanced(c *gin.Context) {
	agentId := c.GetInt("id")

	startTime, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTime, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)

	if startTime == 0 || endTime == 0 {
		endTime = time.Now().Unix()
		startTime = endTime - 7*24*3600 // 默认7天
	}

	data, err := model.GetAgentTrendDataWithSelf(agentId, startTime, endTime)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, data)
}

// ========== 代理商分成相关 API ==========

// UpdateAgentCommissionRate 超管调整代理商分成比例
func UpdateAgentCommissionRate(c *gin.Context) {
	var req struct {
		UserId         int `json:"user_id" binding:"required"`
		CommissionRate int `json:"commission_rate" binding:"required,min=0,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	if err := model.UpdateAgentCommissionRate(req.UserId, req.CommissionRate); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgUpdateSuccess, nil)
}

// GetAgentCommissionStats 代理商获取分成统计
func GetAgentCommissionStats(c *gin.Context) {
	agentId := c.GetInt("id")

	user, err := model.GetUserById(agentId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	stats := map[string]interface{}{
		"commission_balance":   user.CommissionBalance,
		"commission_total":     user.CommissionTotal,
		"commission_withdrawn": user.CommissionWithdrawn,
		"commission_rate":      user.CommissionRate,
		"min_withdraw_amount":  model.GetAgentMinWithdrawAmount(),
	}

	common.ApiSuccess(c, stats)
}

// GetAgentCommissionLogs 代理商获取分成记录
func GetAgentCommissionLogs(c *gin.Context) {
	agentId := c.GetInt("id")
	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}

	logs, total, err := model.GetCommissionLogsByAgentId(agentId, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":     logs,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// ApplyWithdrawal 代理商申请提现
func ApplyWithdrawal(c *gin.Context) {
	agentId := c.GetInt("id")

	var req struct {
		Amount      int    `json:"amount" binding:"required"`
		BankName    string `json:"bank_name" binding:"required"`
		BankAccount string `json:"bank_account" binding:"required"`
		AccountName string `json:"account_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	withdrawal, err := model.CreateWithdrawal(agentId, req.Amount, req.BankName, req.BankAccount, req.AccountName)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, withdrawal)
}

// GetAgentWithdrawals 代理商获取提现记录
func GetAgentWithdrawals(c *gin.Context) {
	agentId := c.GetInt("id")
	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}

	withdrawals, total, err := model.GetWithdrawalsByAgentId(agentId, page, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":     withdrawals,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// ========== 超管提现审核 API ==========

// GetAllWithdrawals 超管获取所有提现申请
func GetAllWithdrawals(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page == 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if pageSize == 0 {
		pageSize = 10
	}
	// status: 不传参数或传-1表示查询全部，0待审核，1已通过，2已拒绝
	statusStr := c.Query("status")
	status := -1
	if statusStr != "" {
		val, err := strconv.Atoi(statusStr)
		if err == nil && val >= 0 {
			status = val
		}
	}

	withdrawals, total, err := model.GetAllWithdrawals(page, pageSize, status)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 附加代理商用户名
	type WithdrawalWithAgent struct {
		*model.AgentWithdrawal
		AgentUsername string `json:"agent_username"`
	}
	var result []WithdrawalWithAgent
	for _, w := range withdrawals {
		user, _ := model.GetUserById(w.AgentId, false)
		username := ""
		if user != nil {
			username = user.Username
		}
		result = append(result, WithdrawalWithAgent{
			AgentWithdrawal: w,
			AgentUsername:   username,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"list":     result,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

// ApproveWithdrawal 超管批准提现申请
func ApproveWithdrawal(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	reviewerId := c.GetInt("id")
	reviewerName := c.GetString("username")

	if err := model.ApproveWithdrawal(id, reviewerId, reviewerName); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgUpdateSuccess, nil)
}

// RejectWithdrawal 超管拒绝提现申请
func RejectWithdrawal(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorI18n(c, i18n.MsgInvalidParams)
		return
	}

	reviewerId := c.GetInt("id")
	reviewerName := c.GetString("username")

	if err := model.RejectWithdrawal(id, reviewerId, reviewerName, req.Reason); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccessI18n(c, i18n.MsgUpdateSuccess, nil)
}
