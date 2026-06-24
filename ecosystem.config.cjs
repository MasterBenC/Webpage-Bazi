module.exports = {
  apps: [
    {
      name: 'chenyao-bazi-web',
      script: 'server/index.mjs',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '8787',
      },
    },
  ],
};
