import { registerTool } from "../registry.js";
const STATUS_CODES = {
    100: ["Continue", "Informational"],
    101: ["Switching Protocols", "Informational"],
    200: ["OK", "Success"],
    201: ["Created", "Success"],
    202: ["Accepted", "Success"],
    204: ["No Content", "Success"],
    206: ["Partial Content", "Success"],
    301: ["Moved Permanently", "Redirection"],
    302: ["Found", "Redirection"],
    303: ["See Other", "Redirection"],
    304: ["Not Modified", "Redirection"],
    307: ["Temporary Redirect", "Redirection"],
    308: ["Permanent Redirect", "Redirection"],
    400: ["Bad Request", "Client Error"],
    401: ["Unauthorized", "Client Error"],
    403: ["Forbidden", "Client Error"],
    404: ["Not Found", "Client Error"],
    405: ["Method Not Allowed", "Client Error"],
    406: ["Not Acceptable", "Client Error"],
    408: ["Request Timeout", "Client Error"],
    409: ["Conflict", "Client Error"],
    410: ["Gone", "Client Error"],
    411: ["Length Required", "Client Error"],
    412: ["Precondition Failed", "Client Error"],
    413: ["Payload Too Large", "Client Error"],
    414: ["URI Too Long", "Client Error"],
    415: ["Unsupported Media Type", "Client Error"],
    418: ["I'm a Teapot", "Client Error"],
    422: ["Unprocessable Entity", "Client Error"],
    429: ["Too Many Requests", "Client Error"],
    500: ["Internal Server Error", "Server Error"],
    501: ["Not Implemented", "Server Error"],
    502: ["Bad Gateway", "Server Error"],
    503: ["Service Unavailable", "Server Error"],
    504: ["Gateway Timeout", "Server Error"],
};
registerTool({
    name: "http_status",
    description: "Look up HTTP status code name and category",
    pro: false,
    inputSchema: {
        type: "object",
        properties: {
            code: { type: "number", description: "HTTP status code (e.g. 404)" },
        },
        required: ["code"],
    },
    handler: async (args) => {
        const code = args.code;
        const entry = STATUS_CODES[code];
        if (!entry) {
            return `Unknown HTTP status code: ${code}`;
        }
        const [name, category] = entry;
        return `${code} ${name} (${category})`;
    },
});
