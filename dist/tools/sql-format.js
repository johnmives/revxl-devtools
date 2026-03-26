import { registerTool } from "../registry.js";
// ---------------------------------------------------------------------------
// SQL Formatter — normalize whitespace, add newlines before major clauses,
// indent columns and conditions
// ---------------------------------------------------------------------------
const MAJOR_CLAUSES = [
    "SELECT",
    "FROM",
    "WHERE",
    "INNER JOIN",
    "LEFT JOIN",
    "RIGHT JOIN",
    "FULL JOIN",
    "CROSS JOIN",
    "JOIN",
    "ON",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LIMIT",
    "OFFSET",
    "INSERT INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE FROM",
    "WITH",
    "UNION ALL",
    "UNION",
    "EXCEPT",
    "INTERSECT",
];
function formatSQL(sql, _dialect) {
    // Normalize whitespace: collapse runs of whitespace into single space
    let normalized = sql.replace(/\s+/g, " ").trim();
    // Uppercase major clauses and add newlines before them
    // Sort clauses longest-first so multi-word clauses match before single-word
    const sortedClauses = [...MAJOR_CLAUSES].sort((a, b) => b.length - a.length);
    for (const clause of sortedClauses) {
        const pattern = new RegExp(`\\b${clause}\\b`, "gi");
        normalized = normalized.replace(pattern, `\n${clause}`);
    }
    // Clean up: remove leading newline
    normalized = normalized.replace(/^\n/, "");
    // Split into lines for indentation processing
    const lines = normalized.split("\n").map((l) => l.trim());
    const result = [];
    for (const line of lines) {
        if (!line)
            continue;
        // Check if this line starts with a major clause
        const upperLine = line.toUpperCase();
        const startsWithClause = sortedClauses.some((c) => upperLine.startsWith(c));
        if (startsWithClause) {
            // Find where the clause keyword ends
            const matchedClause = sortedClauses.find((c) => upperLine.startsWith(c));
            if (matchedClause) {
                const rest = line.slice(matchedClause.length).trim();
                if (matchedClause === "SELECT" ||
                    matchedClause === "GROUP BY" ||
                    matchedClause === "ORDER BY") {
                    // Split comma-separated items onto separate indented lines
                    if (rest) {
                        const items = splitTopLevel(rest, ",");
                        if (items.length > 1) {
                            result.push(matchedClause);
                            for (let i = 0; i < items.length; i++) {
                                const comma = i < items.length - 1 ? "," : "";
                                result.push(`  ${items[i].trim()}${comma}`);
                            }
                            continue;
                        }
                    }
                }
                if (matchedClause === "WHERE" || matchedClause === "HAVING") {
                    // Indent AND/OR conditions
                    if (rest) {
                        const withConditions = rest
                            .replace(/\b(AND)\b/gi, "\n  AND")
                            .replace(/\b(OR)\b/gi, "\n  OR");
                        const condLines = withConditions
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean);
                        result.push(`${matchedClause}`);
                        for (const cl of condLines) {
                            result.push(`  ${cl}`);
                        }
                        continue;
                    }
                }
                result.push(line);
            }
            else {
                result.push(line);
            }
        }
        else {
            result.push(`  ${line}`);
        }
    }
    return result.join("\n");
}
/**
 * Split a string by a delimiter, but only at the top level (not inside parens).
 */
function splitTopLevel(s, delimiter) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "(")
            depth++;
        else if (ch === ")")
            depth--;
        if (ch === delimiter && depth === 0) {
            parts.push(current);
            current = "";
        }
        else {
            current += ch;
        }
    }
    if (current.trim())
        parts.push(current);
    return parts;
}
registerTool({
    name: "sql_format",
    description: "Format and prettify SQL queries with proper indentation and clause separation",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            sql: { type: "string", description: "SQL query to format" },
            dialect: {
                type: "string",
                enum: ["standard", "postgresql", "mysql", "sqlite"],
                description: "SQL dialect (default: standard)",
            },
        },
        required: ["sql"],
    },
    handler: async (args) => {
        const sql = args.sql;
        const dialect = args.dialect || "standard";
        if (!sql.trim())
            throw new Error("SQL string is empty");
        const formatted = formatSQL(sql, dialect);
        return [
            `=== Formatted SQL (${dialect}) ===`,
            "",
            formatted,
        ].join("\n");
    },
});
