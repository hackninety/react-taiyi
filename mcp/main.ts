/**
 * 太乙 MCP server stdio 入口。
 *
 * Claude Code 注册（项目级已内置 .mcp.json；用户级手动）：
 *   claude mcp add taiyi -- npx tsx D:\WWW\react-taiyi\mcp\main.ts
 * 环境变量：TAIYI_API 覆盖 kintaiyi 后端地址（默认 https://taiyi-api.0x7c.cc）。
 *
 * 注意：stdout 是 MCP 协议通道，日志一律走 stderr。
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTaiyiMcpServer } from './server';

const server = createTaiyiMcpServer();
await server.connect(new StdioServerTransport());
console.error('[taiyi-mcp] ready (stdio)');
