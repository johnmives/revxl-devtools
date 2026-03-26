// ---------------------------------------------------------------------------
// Tool registry — separated to avoid circular import issues with ESM hoisting
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  pro: boolean;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

const tools: Map<string, ToolDefinition> = new Map();

export function registerTool(tool: ToolDefinition): void {
  tools.set(tool.name, tool);
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return tools.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(tools.values());
}
