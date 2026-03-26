import { createHmac } from "node:crypto";
import { registerTool } from "../registry.js";
// ---------------------------------------------------------------------------
// Base64url helpers
// ---------------------------------------------------------------------------
function base64urlDecode(input) {
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad === 2)
        base64 += "==";
    else if (pad === 3)
        base64 += "=";
    return Buffer.from(base64, "base64").toString("utf-8");
}
function base64urlEncode(input) {
    const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
// ---------------------------------------------------------------------------
// Known JWT claims
// ---------------------------------------------------------------------------
const CLAIM_NAMES = {
    iss: "Issuer",
    sub: "Subject",
    aud: "Audience",
    exp: "Expiration Time",
    nbf: "Not Before",
    iat: "Issued At",
    jti: "JWT ID",
};
function describeClaims(payload) {
    const lines = [];
    for (const [key, label] of Object.entries(CLAIM_NAMES)) {
        if (key in payload) {
            const val = payload[key];
            if (["exp", "nbf", "iat"].includes(key) && typeof val === "number") {
                const date = new Date(val * 1000);
                lines.push(`  ${key} (${label}): ${val} — ${date.toISOString()}`);
            }
            else {
                lines.push(`  ${key} (${label}): ${JSON.stringify(val)}`);
            }
        }
    }
    return lines;
}
function expiryStatus(payload) {
    if (typeof payload.exp !== "number")
        return "No expiration set";
    const now = Math.floor(Date.now() / 1000);
    const diff = payload.exp - now;
    if (diff <= 0) {
        const mins = Math.abs(Math.round(diff / 60));
        return `EXPIRED ${mins} minute${mins === 1 ? "" : "s"} ago`;
    }
    const mins = Math.round(diff / 60);
    return `Valid for ${mins} minute${mins === 1 ? "" : "s"}`;
}
// ---------------------------------------------------------------------------
// HMAC signing
// ---------------------------------------------------------------------------
function sign(header, payload, secret, algorithm) {
    const algoMap = {
        HS256: "sha256",
        HS384: "sha384",
        HS512: "sha512",
    };
    const hashAlgo = algoMap[algorithm];
    if (!hashAlgo)
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    const data = `${header}.${payload}`;
    const hmac = createHmac(hashAlgo, secret).update(data).digest();
    return base64urlEncode(hmac);
}
// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------
registerTool({
    name: "jwt",
    description: "Decode a JWT to inspect header/payload/expiry, or create a new HMAC-signed JWT",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["decode", "create"],
                description: "decode: inspect a JWT | create: generate a new JWT",
            },
            token: {
                type: "string",
                description: "(decode) The JWT string to decode",
            },
            payload: {
                type: "object",
                description: "(create) Claims object for the JWT payload",
            },
            secret: {
                type: "string",
                description: "(create) HMAC secret for signing",
            },
            algorithm: {
                type: "string",
                enum: ["HS256", "HS384", "HS512"],
                description: "(create) Signing algorithm, default HS256",
            },
            expires_in: {
                type: "number",
                description: "(create) Seconds until expiration",
            },
        },
        required: ["action"],
    },
    handler: async (args) => {
        const action = args.action;
        if (action === "decode") {
            const token = args.token;
            if (!token)
                throw new Error("token is required for decode action");
            const parts = token.split(".");
            if (parts.length !== 3)
                throw new Error("Invalid JWT: expected 3 dot-separated parts");
            const header = JSON.parse(base64urlDecode(parts[0]));
            const payload = JSON.parse(base64urlDecode(parts[1]));
            const lines = [
                "=== JWT Decoded ===",
                "",
                "--- Header ---",
                JSON.stringify(header, null, 2),
                "",
                "--- Payload ---",
                JSON.stringify(payload, null, 2),
                "",
                "--- Known Claims ---",
                ...describeClaims(payload),
                "",
                `--- Expiry: ${expiryStatus(payload)} ---`,
                "",
                "(Signature not verified — provide secret separately if needed)",
            ];
            return lines.join("\n");
        }
        if (action === "create") {
            const payloadObj = args.payload || {};
            const secret = args.secret;
            if (!secret)
                throw new Error("secret is required for create action");
            const algorithm = args.algorithm || "HS256";
            const expiresIn = args.expires_in;
            const now = Math.floor(Date.now() / 1000);
            const claims = { ...payloadObj, iat: now };
            if (expiresIn)
                claims.exp = now + expiresIn;
            const headerB64 = base64urlEncode(JSON.stringify({ alg: algorithm, typ: "JWT" }));
            const payloadB64 = base64urlEncode(JSON.stringify(claims));
            const signature = sign(headerB64, payloadB64, secret, algorithm);
            const token = `${headerB64}.${payloadB64}.${signature}`;
            const lines = [
                "=== JWT Created ===",
                "",
                token,
                "",
                "--- Header ---",
                JSON.stringify({ alg: algorithm, typ: "JWT" }, null, 2),
                "",
                "--- Payload ---",
                JSON.stringify(claims, null, 2),
                "",
                `Algorithm: ${algorithm}`,
            ];
            if (expiresIn)
                lines.push(`Expires in: ${expiresIn} seconds`);
            return lines.join("\n");
        }
        throw new Error(`Unknown action: ${action}. Use "decode" or "create".`);
    },
});
