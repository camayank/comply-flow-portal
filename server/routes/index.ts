/**
 * Routes Index
 * Central route registration for all API endpoints
 */

import { Express } from 'express';
import authRoutes from './auth';
import clientRoutes from './client';
import clientV2Routes from './client-v2';
import lifecycleApiRoutes from './lifecycle-api';
import salesRoutes from './sales';
import operationsRoutes from './operations';
import adminRoutes from './admin';
import paymentRoutes from './payment';
import complianceStateRoutes from '../compliance-state-routes';
import monitoringRoutes from '../monitoring/routes';
// Note: opsCaseRoutes are registered in main server/routes.ts via server/ops-case-routes.ts

/**
 * Register all API routes
 */
export function registerApiRoutes(app: Express): void {
  // API v1 routes
  const API_PREFIX = '/api/v1';

  // Authentication routes
  app.use(`${API_PREFIX}/auth`, authRoutes);

  // Client portal routes
  app.use(`${API_PREFIX}/client`, clientRoutes);
  app.use(`${API_PREFIX}/services`, clientRoutes);

  // Sales portal routes
  app.use(`${API_PREFIX}/sales`, salesRoutes);

  // Operations portal routes
  app.use(`${API_PREFIX}/operations`, operationsRoutes);

  // Note: Ops Case Dashboard routes registered in main server/routes.ts

  // Admin portal routes
  app.use(`${API_PREFIX}/admin`, adminRoutes);

  // Payment routes
  app.use(`${API_PREFIX}/payments`, paymentRoutes);

  // Compliance State routes
  app.use(`${API_PREFIX}/compliance-state`, complianceStateRoutes);

  // Monitoring routes (APM, metrics, alerts)
  app.use(`${API_PREFIX}/monitoring`, monitoringRoutes);

  console.log('✅ API v1 routes registered');

  // API v2 routes (US-Style Portal)
  const API_V2_PREFIX = '/api/v2';

  // Client portal v2 routes (status-first design)
  app.use(`${API_V2_PREFIX}/client`, clientV2Routes);

  // Lifecycle management routes (high-level + drill-down)
  app.use(`${API_V2_PREFIX}/lifecycle`, lifecycleApiRoutes);

  console.log('✅ API v2 routes registered (US-Style Portal with Lifecycle Management)');
}
