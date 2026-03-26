import { createHash } from "node:crypto";
import { registerTool } from "../registry.js";
registerTool({
    name: "hash_text",
    description: "Hash text with MD5, SHA-256, or SHA-512",
    pro: false,
    inputSchema: {
        type: "object",
        properties: {
            text: { type: "string", description: "Text to hash" },
            algorithm: {
                type: "string",
                enum: ["md5", "sha256", "sha512"],
                description: "Hash algorithm (default: sha256)",
            },
        },
        required: ["text"],
    },
    handler: async (args) => {
        const text = args.text;
        const algorithm = args.algorithm || "sha256";
        const digest = createHash(algorithm).update(text, "utf-8").digest("hex");
        return `${algorithm}: ${digest}`;
    },
});
