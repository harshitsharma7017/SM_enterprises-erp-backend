import { config } from './config/env.js';
import app from './app.js';
import { testConnection } from './config/database.js';
import { storage } from './services/storage.service.js';

async function startServer() {
  storage.assertConfigured();
  await testConnection();

  app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
  });
}

startServer();
