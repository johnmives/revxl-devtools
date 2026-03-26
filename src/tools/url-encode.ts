import { registerTool } from "../registry.js";

registerTool({
  name: "url_encode",
  description: "URL encode or decode strings",
  pro: false,
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to encode or encoded string to decode" },
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
      return encodeURIComponent(text);
    }

    return decodeURIComponent(text);
  },
});
