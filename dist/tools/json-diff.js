import { registerTool } from "../registry.js";
function deepDiff(a, b, path, results) {
    if (a === b)
        return;
    // Both null/undefined
    if (a == null && b == null)
        return;
    // Type mismatch or primitive change
    if (typeof a !== typeof b ||
        a === null ||
        b === null ||
        typeof a !== "object" ||
        typeof b !== "object") {
        results.push({ path: path || "$", type: "changed", oldValue: a, newValue: b });
        return;
    }
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    // Array vs object mismatch
    if (aIsArray !== bIsArray) {
        results.push({ path: path || "$", type: "changed", oldValue: a, newValue: b });
        return;
    }
    if (aIsArray && bIsArray) {
        const maxLen = Math.max(a.length, b.length);
        for (let i = 0; i < maxLen; i++) {
            const itemPath = `${path}[${i}]`;
            if (i >= a.length) {
                results.push({ path: itemPath, type: "added", newValue: b[i] });
            }
            else if (i >= b.length) {
                results.push({ path: itemPath, type: "removed", oldValue: a[i] });
            }
            else {
                deepDiff(a[i], b[i], itemPath, results);
            }
        }
        return;
    }
    // Both objects
    const aObj = a;
    const bObj = b;
    const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
    for (const key of allKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        if (!(key in aObj)) {
            results.push({ path: keyPath, type: "added", newValue: bObj[key] });
        }
        else if (!(key in bObj)) {
            results.push({ path: keyPath, type: "removed", oldValue: aObj[key] });
        }
        else {
            deepDiff(aObj[key], bObj[key], keyPath, results);
        }
    }
}
function formatValue(val) {
    if (typeof val === "string")
        return JSON.stringify(val);
    if (val === undefined)
        return "undefined";
    return JSON.stringify(val);
}
// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------
registerTool({
    name: "json_diff",
    description: "Deep-compare two JSON objects and show all differences — added, removed, and changed values with paths",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            a: {
                type: "string",
                description: "First JSON string",
            },
            b: {
                type: "string",
                description: "Second JSON string",
            },
        },
        required: ["a", "b"],
    },
    handler: async (args) => {
        const aStr = args.a;
        const bStr = args.b;
        let aVal;
        let bVal;
        try {
            aVal = JSON.parse(aStr);
        }
        catch {
            throw new Error("Invalid JSON in 'a'");
        }
        try {
            bVal = JSON.parse(bStr);
        }
        catch {
            throw new Error("Invalid JSON in 'b'");
        }
        const diffs = [];
        deepDiff(aVal, bVal, "", diffs);
        if (diffs.length === 0) {
            return "No differences — the two JSON values are identical.";
        }
        const added = diffs.filter((d) => d.type === "added").length;
        const removed = diffs.filter((d) => d.type === "removed").length;
        const changed = diffs.filter((d) => d.type === "changed").length;
        const lines = [
            `=== JSON Diff: ${diffs.length} difference${diffs.length === 1 ? "" : "s"} ===`,
            `${added} added, ${removed} removed, ${changed} changed`,
            "",
        ];
        for (const diff of diffs) {
            const p = diff.path || "$";
            switch (diff.type) {
                case "added":
                    lines.push(`+ ${p}: ${formatValue(diff.newValue)}`);
                    break;
                case "removed":
                    lines.push(`- ${p}: ${formatValue(diff.oldValue)}`);
                    break;
                case "changed":
                    lines.push(`~ ${p}: ${formatValue(diff.oldValue)} → ${formatValue(diff.newValue)}`);
                    break;
            }
        }
        return lines.join("\n");
    },
});
