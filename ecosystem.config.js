module.exports = {
  apps: [
    {
      name: 'scrapperx-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      instances: 1, // Single instance for 1GB RAM
      exec_mode: 'fork', // Fork mode for single instance
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      max_memory_restart: '400M', // Restart if memory exceeds 400MB
      error_file: '~/.pm2/logs/scrapperx-backend-error.log',
      out_file: '~/.pm2/logs/scrapperx-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'scrapperx-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1, // Single instance for 1GB RAM
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '200M', // Restart if memory exceeds 200MB
      error_file: '~/.pm2/logs/scrapperx-frontend-error.log',
      out_file: '~/.pm2/logs/scrapperx-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
