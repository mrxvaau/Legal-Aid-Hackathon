const app = require('./src/app');
const config = require('./src/config');
const { migrate } = require('./src/db/migrate');

// Auto-run migration to ensure schema exists
try {
  migrate();
  console.log('[Server] Database verified & migrated.');
} catch (err) {
  console.error('[Server] Migration failed on startup:', err);
  process.exit(1);
}

const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(config.port, HOST, () => {
  console.log(`[Server] ADLASB Backend running on http://${HOST}:${config.port} in ${config.env} mode.`);
});

module.exports = server;
