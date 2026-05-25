module.exports = {
  apps: [
    {
      name: 'titanium-server',
      script: './node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/Volumes/10TB/apps/Titanium/titanium-app',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      exp_backoff_restart_delay: 100,
      log_file: '/Users/servimac/.pm2/logs/titanium-server.log',
      error_file: '/Users/servimac/.pm2/logs/titanium-server-error.log',
      out_file: '/Users/servimac/.pm2/logs/titanium-server-out.log',
      merge_logs: true,
    }
  ]
};
