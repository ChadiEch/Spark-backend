const cron = require('node-cron');
const IntegrationConnection = require('../../models/IntegrationConnection');
const FacebookClient = require('./facebookClient');
const TikTokClient = require('./tiktokClient');
const GoogleClient = require('./googleClient');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('integration-monitoring-service');

class IntegrationMonitoringService {
  constructor() {
    this.running = false;
    this.cronJob = null;
  }

  /**
   * Start the integration monitoring service
   */
  start() {
    if (this.running) {
      logger.warn('Integration monitoring service is already running');
      return;
    }

    // Run every 30 minutes to check integration status
    this.cronJob = cron.schedule('*/30 * * * *', async () => {
      try {
        await this.checkIntegrationStatus();
      } catch (error) {
        logger.error('Error checking integration status', { error: error.message });
      }
    });

    this.running = true;
    logger.info('Integration monitoring service started');
  }

  /**
   * Stop the integration monitoring service
   */
  stop() {
    if (!this.running) {
      logger.warn('Integration monitoring service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.running = false;
    logger.info('Integration monitoring service stopped');
  }

  /**
   * Check the status of all integration connections
   */
  async checkIntegrationStatus() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting integration status check');
      
      // Get all integration connections
      const connections = await IntegrationConnection.find()
        .populate('integrationId')
        .populate('userId');

      if (connections.length === 0) {
        logger.info('No integration connections found for status check');
        return;
      }

      logger.info('Checking status for integration connections', { count: connections.length });

      // Check status for each connection
      for (const connection of connections) {
        try {
          await this.checkConnectionStatus(connection);
        } catch (error) {
          logger.error('Error checking connection status', { 
            connectionId: connection._id, 
            error: error.message 
          });
        }
      }

      // Record successful API call
      recordAPICall('integration-monitoring', 'check', Date.now() - startTime, true);
      
      logger.info('Integration status check completed');
    } catch (error) {
      // Record error
      recordError('integration-monitoring', 'check', error.message);
      
      logger.error('Error checking integration status', { error: error.message });
      throw error;
    }
  }

  /**
   * Check the status of a specific integration connection
   * @param {Object} connection - The integration connection to check
   */
  async checkConnectionStatus(connection) {
    try {
      // Check if token is expired
      let isExpired = false;
      let needsRefresh = false;
      
      if (connection.expiresAt) {
        const now = new Date();
        const expiresAt = new Date(connection.expiresAt);
        
        // Check if token is expired
        if (expiresAt < now) {
          isExpired = true;
        }
        // Check if token needs refresh (expires within 24 hours)
        else if (expiresAt - now < 24 * 60 * 60 * 1000) {
          needsRefresh = true;
        }
      }

      // Update connection status
      connection.status = isExpired ? 'EXPIRED' : 'ACTIVE';
      connection.lastChecked = new Date();
      
      // If token needs refresh, attempt to refresh it
      if (needsRefresh && !isExpired) {
        try {
          await this.refreshToken(connection);
          connection.status = 'ACTIVE';
        } catch (error) {
          logger.warn('Failed to refresh token for connection', { 
            connectionId: connection._id, 
            error: error.message 
          });
          
          // If the refresh token is invalid, mark the connection as expired
          if (error.message.includes('invalid_grant') || error.message.includes('refresh token')) {
            connection.status = 'EXPIRED';
            logger.warn('Refresh token is invalid, marking connection as expired', { 
              connectionId: connection._id 
            });
          } else {
            connection.status = 'NEEDS_REFRESH';
          }
        }
      }
      
      await connection.save();
      
      logger.info('Connection status updated', { 
        connectionId: connection._id, 
        status: connection.status,
        integration: connection.integrationId?.name,
        user: connection.userId?.email
      });
    } catch (error) {
      logger.error('Error checking connection status', { 
        connectionId: connection._id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Refresh an integration token
   * @param {Object} connection - The integration connection to refresh
   */
  async refreshToken(connection) {
    try {
      // Import the OAuth utilities
      const { refreshOAuthTokens } = require('./oauthUtils');
      
      // Use the refresh token to get a new access token
      const tokenData = await refreshOAuthTokens(connection.integrationId.key, connection.refreshToken);
      
      // Update the connection with the new tokens
      connection.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        connection.refreshToken = tokenData.refresh_token;
      }
      
      // Update expiration time
      if (tokenData.expires_in) {
        connection.expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      }
      
      // Update metadata
      connection.metadata = {
        ...connection.metadata,
        tokenType: tokenData.token_type || null,
        expiresIn: tokenData.expires_in || null
      };
      
      // Save the updated connection
      await connection.save();
      
      logger.info('Token refreshed successfully for connection', { 
        connectionId: connection._id,
        integration: connection.integrationId?.name
      });
      
      return true;
    } catch (error) {
      logger.error('Error refreshing token', { 
        connectionId: connection._id, 
        error: error.message 
      });
      
      // Re-throw the error with additional context
      throw new Error(`Failed to refresh token for ${connection.integrationId?.name}: ${error.message}`);
    }
  }

  /**
   * Get integration health metrics
   */
  async getHealthMetrics() {
    try {
      const connections = await IntegrationConnection.find()
        .populate('integrationId');
      
      const metrics = {
        total: connections.length,
        active: 0,
        expired: 0,
        needsRefresh: 0,
        byPlatform: {}
      };
      
      for (const connection of connections) {
        const platform = connection.integrationId?.key || 'unknown';
        
        if (!metrics.byPlatform[platform]) {
          metrics.byPlatform[platform] = {
            total: 0,
            active: 0,
            expired: 0,
            needsRefresh: 0
          };
        }
        
        metrics.byPlatform[platform].total++;
        metrics.total++;
        
        switch (connection.status) {
          case 'ACTIVE':
            metrics.active++;
            metrics.byPlatform[platform].active++;
            break;
          case 'EXPIRED':
            metrics.expired++;
            metrics.byPlatform[platform].expired++;
            break;
          case 'NEEDS_REFRESH':
            metrics.needsRefresh++;
            metrics.byPlatform[platform].needsRefresh++;
            break;
        }
      }
      
      return metrics;
    } catch (error) {
      logger.error('Error getting health metrics', { error: error.message });
      throw error;
    }
  }
}

module.exports = IntegrationMonitoringService;