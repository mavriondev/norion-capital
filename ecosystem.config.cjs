const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
  });
}

module.exports = {
  apps: [{
    name: 'norion',
    script: 'dist/index.cjs',
    cwd: '/var/www/norion',
    exec_mode: 'fork',
    env: {
      ...envVars,
      NODE_ENV: 'production',
    },
    instances: 1,
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
