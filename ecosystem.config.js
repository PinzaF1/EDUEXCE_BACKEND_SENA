module.exports = {
  apps: [{
    name: 'eduexce-backend',
    script: 'build/bin/server.js',
    cwd: '/home/ubuntu/eduexce-backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3333,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3333,
      HOST: '0.0.0.0'
    },
    error_file: '/home/ubuntu/eduexce-backend/logs/err.log',
    out_file: '/home/ubuntu/eduexce-backend/logs/out.log',
    log_file: '/home/ubuntu/eduexce-backend/logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ]
  }]
}