module.exports = {
  apps: [
    {
      name: 'postocard',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/deploy/postocard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
