export interface ToolDefinition {
    name: string;
    description: string;
    pro: boolean;
    inputSchema: Record<string, unknown>;
    handler: (args: Record<string, unknown>) => Promise<unknown>;
}
export declare function registerTool(tool: ToolDefinition): void;
export declare function getToolByName(name: string): ToolDefinition | undefined;
export declare function getAllTools(): ToolDefinition[];
