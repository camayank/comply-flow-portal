/**
 * Routes Index
 * Central route registration for all API endpoints
 */

import { Express } from 'express';
import authRoutes from './auth';
import clientRoutes from './client';
import salesRoutes from './sales';
import operationsRoutes from './operations';
import adminRoutes from './admin';
import paymentRoutes from './payment';

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

  // Admin portal routes
  app.use(`${API_PREFIX}/admin`, adminRoutes);

  // Payment routes
  app.use(`${API_PREFIX}/payments`, paymentRoutes);

  console.log('✅ API v1 routes registered');
}
