module.exports = {
  apps: [
    {
      name: 'scrapperx-backend',
      script: 'backend/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'scrapperx-frontend',
      script: 'npm',
      args: 'start',
      cwd: 'frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
