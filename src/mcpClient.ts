import OpenAI from 'openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import env from './config/env';
import readline from 'readline/promises';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Tool } from '@modelcontextprotocol/sdk/types';

export class MCPClient {
  private mcp: Client;
  private llm: OpenAI;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.llm = new OpenAI({
      apiKey: env.LLM_API_KEY,
    });
    this.mcp = new Client({ name: 'MCP client', version: '1.0.0' });
  }

  async connectToServer(serverScriptPath: string) {
    const isJs = serverScriptPath.endsWith('.js');
    const isPy = serverScriptPath.endsWith('.py');
    if (!isJs && !isPy) throw Error('Server must be a .js or .py file');
    const command = isPy
      ? process.platform === 'win32'
        ? 'python'
        : 'python3'
      : process.execPath;

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });
    try {
      await this.mcp.connect(this.transport);
      await this.initializeTools();
      console.log(
        'Server connected. Tools Available:',
        this.tools.map((tool) => tool.name)
      );
    } catch (error) {
      console.log('Error connecting the server', error);
    }
  }

  private async initializeTools() {
    try {
      const listTools = await this.mcp.listTools();
      this.tools = listTools.tools.map((tool) => {
        return {
          inputSchema: tool.inputSchema,
          name: tool.name,
          description: tool.description,
        };
      });
    } catch (error) {
      console.log('Error initializing tools', error);
    }
  }

  async processQuery(query: string) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: query,
      },
    ];
    const response = await this.llm.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 100,
      messages,
      tools: this.tools.map((tool) => {
        return {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        };
      }),
      tool_choice: 'auto',
    });

    const finalText = [];
    if (response.choices[0].message.content) {
      finalText.push(response.choices[0].message.content);
    }

    if (
      response &&
      response.choices &&
      response.choices[0].message &&
      response.choices[0].message.tool_calls &&
      response.choices[0].message.tool_calls?.length > 0
    ) {
      messages.push(response.choices[0].message);
      for (const toolCall of response.choices[0].message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        const result = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });
        finalText.push(
          `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
        );
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.content as string,
        });
        const response = await this.llm.chat.completions.create({
          model: 'gpt-3.5-turbo',
          max_tokens: 1000,
          messages,
        });
        finalText.push(response.choices[0].message.content);
      }
    }
    return finalText.join('\n');
  }

  async userInterface() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log('\nMCP client started');
      console.log("Type 'quit' to exit.");
      while (true) {
        const message = await rl.question('\nQuery:');
        if (message.toLowerCase() === 'quit') break;
        const response = await this.processQuery(message);
        console.log('\n', response);
      }
    } catch (error) {
      console.log('Error in userInterface method', error);
    } finally {
      rl.close();
    }
  }

  async disconnectMCP() {
    await this.mcp.close();
  }
}
