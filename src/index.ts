import { MCPClient } from './mcpClient';
import express from 'express';
import cors from 'cors';
import env from './config/env';
import { chatRoute } from './routes/chat';

export const mcpCLient = new MCPClient();

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node index.ts <path_to_server_script>');
    return;
  }
  const app = express();
  app.use(cors());
  app.use(express.json());
  const port = env.PORT;

  try {
    await mcpCLient.connectToServer(process.argv[2]);
    // Activate to use de CLI as UI
    // await mcpCLient.userInterface();
    app.use('/api', chatRoute);
    app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
      console.log(`Chat endpoint: http://localhost:${port}/chat`);
    });
    process.on('SIGTERM', async () => {
      await mcpCLient.disconnectMCP();
      process.exit(0);
    });
  } catch (error) {
    console.log('Error in main function', error);
    process.exit(1);
  }
}

main();
