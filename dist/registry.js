// ---------------------------------------------------------------------------
// Tool registry — separated to avoid circular import issues with ESM hoisting
// ---------------------------------------------------------------------------
const tools = new Map();
export function registerTool(tool) {
    tools.set(tool.name, tool);
}
export function getToolByName(name) {
    return tools.get(name);
}
export function getAllTools() {
    return Array.from(tools.values());
}
