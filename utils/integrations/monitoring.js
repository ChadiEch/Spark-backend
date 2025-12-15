// Simple monitoring utilities for integrations

let metrics = {
  oauthExchanges: 0,
  tokenRefreshes: 0,
  connectionAttempts: 0,
  successfulConnections: 0,
  failedConnections: 0
};

const incrementMetric = (metricName) => {
  if (metrics.hasOwnProperty(metricName)) {
    metrics[metricName]++;
  }
};

const getMetrics = () => {
  return { ...metrics };
};

const resetMetrics = () => {
  metrics = {
    oauthExchanges: 0,
    tokenRefreshes: 0,
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0
  };
};

module.exports = {
  incrementMetric,
  getMetrics,
  resetMetrics
};