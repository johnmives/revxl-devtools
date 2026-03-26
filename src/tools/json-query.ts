import { registerTool } from "../registry.js";

// ---------------------------------------------------------------------------
// Simple JSON path query — supports dot notation, [N] indexing, * wildcard
// ---------------------------------------------------------------------------

function queryPath(data: unknown, segments: string[]): unknown[] {
  if (segments.length === 0) return [data];

  const [head, ...rest] = segments;

  if (data === null || data === undefined || typeof data !== "object") {
    return [];
  }

  // Wildcard: expand all array items or object values
  if (head === "*") {
    const values = Array.isArray(data) ? data : Object.values(data);
    const results: unknown[] = [];
    for (const val of values) {
      results.push(...queryPath(val, rest));
    }
    return results;
  }

  // Array index: [N]
  const indexMatch = head.match(/^\[(\d+)]$/);
  if (indexMatch) {
    const idx = parseInt(indexMatch[1], 10);
    if (Array.isArray(data) && idx < data.length) {
      return queryPath(data[idx], rest);
    }
    return [];
  }

  // Object key
  const obj = data as Record<string, unknown>;
  if (head in obj) {
    return queryPath(obj[head], rest);
  }

  return [];
}

function parseQuery(query: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === ".") {
      if (current) segments.push(current);
      current = "";
    } else if (ch === "[") {
      if (current) segments.push(current);
      current = "";
      const end = query.indexOf("]", i);
      if (end === -1) throw new Error(`Unmatched '[' at position ${i}`);
      segments.push(query.slice(i, end + 1));
      i = end;
    } else {
      current += ch;
    }
  }
  if (current) segments.push(current);

  return segments;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

registerTool({
  name: "json_query",
  description:
    "Query JSON data with dot-path expressions — supports nested keys, array indices [N], and wildcard * expansion",
  pro: true,
  inputSchema: {
    type: "object",
    properties: {
      json: {
        type: "string",
        description: "JSON string to query",
      },
      query: {
        type: "string",
        description:
          'Dot-path query like "data.users[0].name" or "items.*.id" — use * for wildcard, [N] for array index',
      },
    },
    required: ["json", "query"],
  },
  handler: async (args) => {
    const jsonStr = args.json as string;
    const query = args.query as string;

    let data: unknown;
    try {
      data = JSON.parse(jsonStr);
    } catch {
      throw new Error("Invalid JSON input");
    }

    const segments = parseQuery(query);
    const results = queryPath(data, segments);

    if (results.length === 0) {
      return `No results for query: ${query}`;
    }

    const sections: string[] = [
      `=== Query: ${query} ===`,
      `${results.length} result${results.length === 1 ? "" : "s"}`,
      "",
    ];

    if (results.length === 1) {
      sections.push(JSON.stringify(results[0], null, 2));
    } else {
      sections.push(JSON.stringify(results, null, 2));
    }

    return sections.join("\n");
  },
});
