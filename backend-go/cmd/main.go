package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/banking-audit-ledger/backend/internal/api"
	"github.com/banking-audit-ledger/backend/internal/config"
	"github.com/banking-audit-ledger/backend/internal/database"
	"github.com/banking-audit-ledger/backend/internal/fabric"
	"github.com/banking-audit-ledger/backend/internal/services"
	"github.com/banking-audit-ledger/backend/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize logger
	logger := logger.New(cfg.LogLevel, cfg.LogFormat)

	// Initialize database
	db, err := database.New(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to connect to database", "error", err)
	}

	// Run migrations
	if err := database.Migrate(db); err != nil {
		logger.Fatal("Failed to run migrations", "error", err)
	}

	// Initialize Fabric Gateway client
	fabricClient, err := fabric.NewGatewayClient(cfg.Fabric)
	if err != nil {
		logger.WithFields(logrus.Fields{"component": "fabric"}).Fatal("Failed to initialize Fabric Gateway client", "error", err)
	}
	defer fabricClient.Close()
	logger.WithFields(logrus.Fields{"component": "fabric"}).Info("Successfully connected to Hyperledger Fabric network via Gateway")

	// Initialize services
	logService := services.NewLogService(db, fabricClient, logger)
	verificationService := services.NewVerificationService(db, fabricClient, logger)

	// Initialize API handlers
	handlers := api.NewHandlers(logService, verificationService, logger)

	// Setup Gin router
	router := setupRouter(handlers, cfg)

	// Setup metrics endpoint
	if cfg.MetricsEnabled {
		router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	}

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		logger.Info("Starting server", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	// Give outstanding requests 30 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", "error", err)
	}

	logger.Info("Server exited")
}

func setupRouter(handlers *api.Handlers, cfg *config.Config) *gin.Engine {
	// Set Gin mode
	if cfg.LogLevel == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/healthz", handlers.HealthCheck)

	// API routes
	api := router.Group("/api/v1")
	{
		// Log management
		api.POST("/logs", handlers.CreateLog)
		api.GET("/logs/:id", handlers.GetLog)
		api.GET("/logs", handlers.ListLogs)

		// Verification
		api.GET("/verify/:id", handlers.VerifyLog)
	}

	return router
}
