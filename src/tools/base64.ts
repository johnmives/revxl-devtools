import { registerTool } from "../registry.js";

registerTool({
  name: "base64",
  description: "Encode or decode Base64 strings",
  pro: false,
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to encode or Base64 string to decode" },
      action: {
        type: "string",
        enum: ["encode", "decode"],
        description: "encode or decode",
      },
    },
    required: ["text", "action"],
  },
  handler: async (args) => {
    const text = args.text as string;
    const action = args.action as string;

    if (action === "encode") {
      return Buffer.from(text, "utf-8").toString("base64");
    }

    // Handle URL-safe Base64 variant
    const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf-8");
    return decoded;
  },
});
