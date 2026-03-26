#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  checkProAccess,
  getTrialUsesRemaining,
  incrementTrialUse,
} from "./auth.js";
import {
  registerTool,
  getToolByName,
  getAllTools,
} from "./registry.js";
import type { ToolDefinition } from "./registry.js";

// Re-export for tool files that import from index
export { registerTool, getToolByName, getAllTools };
export type { ToolDefinition };

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const PURCHASE_URL = "https://revxl-devtools.vercel.app";

const server = new Server(
  { name: "@revxl/devtools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --- ListTools ------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolList = getAllTools().map((t) => ({
    name: t.name,
    description: t.pro
      ? `${t.description} [PRO - 3 free trials]`
      : t.description,
    inputSchema: t.inputSchema,
  }));
  return { tools: toolList };
});

// --- CallTool -------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = getToolByName(name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // Pro gate
  if (tool.pro) {
    const isPro = await checkProAccess();
    if (!isPro) {
      const remaining = getTrialUsesRemaining(name);
      if (remaining <= 0) {
        return {
          content: [
            {
              type: "text",
              text: `⚡ ${name} is a Pro tool and you've used all 3 free trials.\n\nUpgrade for $7 one-time at ${PURCHASE_URL} to unlock unlimited access to all Pro tools.`,
            },
          ],
          isError: false,
        };
      }
      incrementTrialUse(name);
    }
  }

  try {
    const result = await tool.handler((args ?? {}) as Record<string, unknown>);
    const text =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error in ${name}: ${message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Tool imports
// ---------------------------------------------------------------------------

// Free tools
import "./tools/json-format.js";
import "./tools/base64.js";
import "./tools/url-encode.js";
import "./tools/uuid.js";
import "./tools/hash.js";
import "./tools/timestamp.js";
import "./tools/http-status.js";

// Pro tools
import "./tools/jwt.js";
import "./tools/regex.js";
import "./tools/cron.js";
import "./tools/json-diff.js";
import "./tools/json-query.js";
import "./tools/batch.js";
import "./tools/sql-format.js";
import "./tools/yaml-convert.js";
import "./tools/chmod.js";
import "./tools/secrets-scan.js";

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("@revxl/devtools MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
