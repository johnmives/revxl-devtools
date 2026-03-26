import { registerTool } from "../registry.js";
// ---------------------------------------------------------------------------
// Chmod converter — numeric ↔ symbolic with human-readable explanation
// ---------------------------------------------------------------------------
const PERM_MAP = {
    0: "---",
    1: "--x",
    2: "-w-",
    3: "-wx",
    4: "r--",
    5: "r-x",
    6: "rw-",
    7: "rwx",
};
const ROLE_NAMES = ["Owner", "Group", "Others"];
const PERM_LABELS = {
    r: "read",
    w: "write",
    x: "execute",
};
function numericToSymbolic(mode) {
    const digits = mode.split("").map(Number);
    return digits.map((d) => PERM_MAP[d]).join("");
}
function symbolicToNumeric(mode) {
    // Expect 9-char symbolic like "rwxr-xr-x"
    const clean = mode.replace(/^-/, ""); // strip leading - if present (like -rwxr-xr-x)
    const chars = clean.length >= 9 ? clean.slice(0, 9) : clean;
    let result = "";
    for (let i = 0; i < 3; i++) {
        const group = chars.slice(i * 3, i * 3 + 3);
        let val = 0;
        if (group[0] === "r")
            val += 4;
        if (group[1] === "w")
            val += 2;
        if (group[2] === "x")
            val += 1;
        result += val;
    }
    return result;
}
function describePermissions(numericMode) {
    const digits = numericMode.split("").map(Number);
    const descriptions = [];
    for (let i = 0; i < 3; i++) {
        const symbolic = PERM_MAP[digits[i]];
        const perms = [];
        for (const ch of symbolic) {
            if (ch !== "-" && PERM_LABELS[ch]) {
                perms.push(PERM_LABELS[ch]);
            }
        }
        const permStr = perms.length > 0 ? perms.join(", ") : "none";
        descriptions.push(`${ROLE_NAMES[i]}: ${permStr}`);
    }
    return descriptions;
}
function isNumericMode(mode) {
    return /^[0-7]{3,4}$/.test(mode);
}
function isSymbolicMode(mode) {
    // Accept rwxr-xr-x or -rwxr-xr-x
    return /^-?[rwx-]{9}$/.test(mode);
}
registerTool({
    name: "chmod",
    description: "Convert between numeric (755) and symbolic (rwxr-xr-x) chmod permissions with explanation",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            mode: {
                type: "string",
                description: 'Permission mode — numeric (e.g. "755") or symbolic (e.g. "rwxr-xr-x")',
            },
        },
        required: ["mode"],
    },
    handler: async (args) => {
        const mode = args.mode.trim();
        if (!mode)
            throw new Error("mode is required");
        if (isNumericMode(mode)) {
            // Take last 3 digits (ignore leading 0 in 0755)
            const digits = mode.slice(-3);
            const symbolic = numericToSymbolic(digits);
            const explanation = describePermissions(digits);
            return [
                "=== Chmod: Numeric → Symbolic ===",
                "",
                `Numeric:  ${digits}`,
                `Symbolic: ${symbolic}`,
                "",
                "--- Permissions ---",
                ...explanation.map((e) => `  ${e}`),
            ].join("\n");
        }
        if (isSymbolicMode(mode)) {
            const clean = mode.startsWith("-") ? mode.slice(1) : mode;
            const numeric = symbolicToNumeric(clean);
            const explanation = describePermissions(numeric);
            return [
                "=== Chmod: Symbolic → Numeric ===",
                "",
                `Symbolic: ${clean}`,
                `Numeric:  ${numeric}`,
                "",
                "--- Permissions ---",
                ...explanation.map((e) => `  ${e}`),
            ].join("\n");
        }
        throw new Error(`Invalid mode: "${mode}". Use numeric (e.g. "755") or symbolic (e.g. "rwxr-xr-x").`);
    },
});
