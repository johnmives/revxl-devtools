import { registerTool } from "../registry.js";
registerTool({
    name: "json_format",
    description: "Format, minify, or validate JSON strings",
    pro: false,
    inputSchema: {
        type: "object",
        properties: {
            text: { type: "string", description: "JSON string to process" },
            action: {
                type: "string",
                enum: ["format", "minify", "validate"],
                description: "Action to perform (default: format)",
            },
            indent: {
                type: "number",
                description: "Number of spaces for indentation (default: 2)",
            },
        },
        required: ["text"],
    },
    handler: async (args) => {
        const text = args.text;
        const action = args.action || "format";
        const indent = args.indent || 2;
        const parsed = JSON.parse(text);
        if (action === "validate") {
            const type = Array.isArray(parsed)
                ? `array[${parsed.length}]`
                : `object{${Object.keys(parsed).length} keys}`;
            return `Valid JSON: ${type}`;
        }
        if (action === "minify") {
            return JSON.stringify(parsed);
        }
        return JSON.stringify(parsed, null, indent);
    },
});
