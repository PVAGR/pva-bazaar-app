const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * Comprehensive health check endpoint
 * Returns detailed system status including:
 * - Overall health status
 * - Database connectivity
 * - Memory usage
 * - Uptime information
 * - Environment details
 */
router.get('/', async (req, res) => {
	const startTime = Date.now();
	const healthStatus = {
		ok: true,
		message: 'PVA Bazaar API is healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || 'development',
		version: process.env.npm_package_version || '1.0.0'
	};

	try {
		// Check database connectivity
		const dbState = mongoose.connection.readyState;
		const dbStatus = {
			connected: dbState === 1,
			state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
			type: process.env.USE_MEMORY_DB === 'true' ? 'in-memory' : 'mongodb'
		};

		// Test database with a simple operation
		if (dbState === 1) {
			try {
				await mongoose.connection.db.admin().ping();
				dbStatus.responsive = true;
			} catch (pingError) {
				dbStatus.responsive = false;
				dbStatus.error = 'Database ping failed';
				healthStatus.ok = false;
			}
		} else {
			healthStatus.ok = false;
			dbStatus.error = 'Database not connected';
		}

		healthStatus.database = dbStatus;

		// Memory usage information
		const memUsage = process.memoryUsage();
		healthStatus.memory = {
			heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
			heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
			rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
			external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
		};

		// Response time
		healthStatus.responseTime = Date.now() - startTime + ' ms';

		// Set appropriate status code
		const statusCode = healthStatus.ok ? 200 : 503;
		res.status(statusCode).json(healthStatus);

	} catch (error) {
		console.error('Health check error:', error);
		res.status(503).json({
			ok: false,
			message: 'Health check failed',
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

/**
 * Quick ping endpoint for basic uptime monitoring
 * Returns minimal response for fast checks
 */
router.get('/ping', (req, res) => {
	res.json({ 
		ok: true, 
		timestamp: new Date().toISOString() 
	});
});

/**
 * Readiness check endpoint
 * Returns 200 only when the service is ready to handle traffic
 */
router.get('/ready', async (req, res) => {
	try {
		const dbState = mongoose.connection.readyState;
		if (dbState !== 1) {
			return res.status(503).json({
				ready: false,
				reason: 'Database not connected',
				timestamp: new Date().toISOString()
			});
		}

		// Test database responsiveness
		await mongoose.connection.db.admin().ping();

		res.json({
			ready: true,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		res.status(503).json({
			ready: false,
			reason: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

/**
 * Liveness check endpoint
 * Returns 200 if the process is alive (even if not fully functional)
 */
router.get('/live', (req, res) => {
	res.json({
		alive: true,
		uptime: process.uptime(),
		timestamp: new Date().toISOString()
	});
});

module.exports = router;
