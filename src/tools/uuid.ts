import { randomUUID } from "node:crypto";
import { registerTool } from "../registry.js";

registerTool({
  name: "uuid_generate",
  description: "Generate one or more v4 UUIDs",
  pro: false,
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Number of UUIDs to generate (default: 1, max: 10)",
      },
    },
  },
  handler: async (args) => {
    let count = Math.min(Math.max((args.count as number) || 1, 1), 10);
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(randomUUID());
    }
    return uuids.join("\n");
  },
});
