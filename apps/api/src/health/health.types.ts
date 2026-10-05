export type HealthReport = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
};
