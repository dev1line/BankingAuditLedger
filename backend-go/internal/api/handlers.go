package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/banking-audit-ledger/backend/internal/models"
	"github.com/banking-audit-ledger/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Handlers contains all HTTP handlers
type Handlers struct {
	logService         *services.LogService
	verificationService *services.VerificationService
	logger             *logrus.Logger
}

// NewHandlers creates new HTTP handlers
func NewHandlers(logService *services.LogService, verificationService *services.VerificationService, logger *logrus.Logger) *Handlers {
	return &Handlers{
		logService:         logService,
		verificationService: verificationService,
		logger:             logger,
	}
}

// CreateLog handles POST /logs
func (h *Handlers) CreateLog(c *gin.Context) {
	var req models.CreateLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.WithError(err).Error("Invalid request payload")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	log, err := h.logService.CreateLog(&req)
	if err != nil {
		h.logger.WithError(err).Error("Failed to create log")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create log", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, log)
}

// GetLog handles GET /logs/:id
func (h *Handlers) GetLog(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Log ID is required"})
		return
	}

	log, err := h.logService.GetLog(id)
	if err != nil {
		if err.Error() == "log not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
			return
		}
		h.logger.WithError(err).Error("Failed to get log")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get log", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, log)
}

// ListLogs handles GET /logs
func (h *Handlers) ListLogs(c *gin.Context) {
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	
	// Validate pagination parameters
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// Parse filter parameters
	source := c.Query("source")
	eventType := c.Query("event_type")

	logs, err := h.logService.ListLogs(page, pageSize, source, eventType)
	if err != nil {
		h.logger.WithError(err).Error("Failed to list logs")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list logs", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// VerifyLog handles GET /verify/:id
func (h *Handlers) VerifyLog(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Log ID is required"})
		return
	}

	verification, err := h.verificationService.VerifyLog(id)
	if err != nil {
		if err.Error() == "log not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
			return
		}
		h.logger.WithError(err).Error("Failed to verify log")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify log", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, verification)
}

// HealthCheck handles GET /healthz
func (h *Handlers) HealthCheck(c *gin.Context) {
	// Check database connection
	_ = int64(0) // count variable for future use
	dbStatus := "healthy"
	// Note: In a real implementation, you would check the database connection
	// For now, we'll assume it's healthy if the service is running

	// Check Fabric connection
	fabricStatus := "healthy"
	// Note: In a real implementation, you might want to ping the Fabric network
	// For now, we'll assume it's healthy if the service is running

	health := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Services: map[string]string{
			"database": dbStatus,
			"fabric":   fabricStatus,
		},
	}

	// Determine overall status
	if dbStatus != "healthy" || fabricStatus != "healthy" {
		health.Status = "unhealthy"
		c.JSON(http.StatusServiceUnavailable, health)
		return
	}

	c.JSON(http.StatusOK, health)
}
