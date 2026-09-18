import { config } from './config/env.js';
import app from './app.js';
import { testConnection } from './config/database.js';

async function startServer() {
  await testConnection();

  app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
  });
}

startServer();
