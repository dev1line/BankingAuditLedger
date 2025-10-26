package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

// New creates a new logger instance
func New(level, format string) *logrus.Logger {
	logger := logrus.New()

	// Set log level
	switch level {
	case "debug":
		logger.SetLevel(logrus.DebugLevel)
	case "info":
		logger.SetLevel(logrus.InfoLevel)
	case "warn":
		logger.SetLevel(logrus.WarnLevel)
	case "error":
		logger.SetLevel(logrus.ErrorLevel)
	default:
		logger.SetLevel(logrus.InfoLevel)
	}

	// Set log format
	switch format {
	case "json":
		logger.SetFormatter(&logrus.JSONFormatter{})
	case "text":
		logger.SetFormatter(&logrus.TextFormatter{})
	default:
		logger.SetFormatter(&logrus.JSONFormatter{})
	}

	// Set output
	logger.SetOutput(os.Stdout)

	return logger
}
