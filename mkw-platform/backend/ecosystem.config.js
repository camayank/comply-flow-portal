/**
 * PM2 Ecosystem Configuration
 * Production deployment configuration for MKW Platform Backend
 */

module.exports = {
  apps: [
    {
      name: 'mkw-platform-backend',
      script: 'src/server.js',
      cwd: process.cwd(),
      
      // Instance configuration
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // Logging configuration
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Performance tuning
      node_args: '--max_old_space_size=1024',
      
      // Health monitoring
      health_check_http_url: 'http://localhost:5000/health',
      health_check_grace_period: 3000,
      
      // Auto-restart conditions
      watch: process.env.NODE_ENV === 'development' ? [
        'src',
        '.env'
      ] : false,
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'test',
        '*.log'
      ],
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Advanced options
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      
      // Cron jobs (if needed)
      cron_restart: process.env.NODE_ENV === 'production' ? '0 2 * * *' : undefined, // Daily restart at 2 AM
      
      // Environment-specific configurations
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000,
        LOG_LEVEL: 'debug'
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/mkw-platform.git',
      path: '/var/www/mkw-platform',
      'post-deploy': 'cd mkw-platform/backend && npm ci --production && npm run migrate && pm2 reload ecosystem.config.js --env production'
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/mkw-platform.git',
      path: '/var/www/mkw-platform-staging',
      'post-deploy': 'cd mkw-platform/backend && npm ci && npm run migrate && pm2 reload ecosystem.config.js --env staging'
    }
  }
};