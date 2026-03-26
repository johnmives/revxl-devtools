import { registerTool, getToolByName } from "../registry.js";
// ---------------------------------------------------------------------------
// Batch runner — execute a free tool across multiple inputs
// ---------------------------------------------------------------------------
const MAX_ITEMS = 500;
registerTool({
    name: "batch",
    description: "Run any free tool across multiple inputs in one call — up to 500 items. Only works with free (non-Pro) tools.",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            tool: {
                type: "string",
                description: "Name of the tool to run (must be a free tool)",
            },
            items: {
                type: "array",
                items: { type: "object" },
                description: "Array of argument objects — each is passed to the tool's handler (max 500)",
            },
        },
        required: ["tool", "items"],
    },
    handler: async (args) => {
        const toolName = args.tool;
        const items = args.items;
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error("items must be a non-empty array");
        }
        if (items.length > MAX_ITEMS) {
            throw new Error(`Maximum ${MAX_ITEMS} items per batch (got ${items.length})`);
        }
        const tool = getToolByName(toolName);
        if (!tool) {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        if (tool.pro) {
            throw new Error(`Batch only works with free tools. "${toolName}" is a Pro tool.`);
        }
        const results = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const result = await tool.handler(items[i]);
                const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
                results.push(`[${i}] ${text}`);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                results.push(`[${i}] ERROR: ${message}`);
            }
        }
        const header = `Batch ${toolName}: ${items.length} items`;
        return `${header}\n${"=".repeat(header.length)}\n\n${results.join("\n\n")}`;
    },
});
