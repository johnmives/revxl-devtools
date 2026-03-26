import { registerTool } from "../registry.js";

// ---------------------------------------------------------------------------
// Minimal YAML parser
// ---------------------------------------------------------------------------

function parseYaml(text: string): unknown {
  const lines = text.split("\n");
  return parseYamlLines(lines, 0, 0).value;
}

interface ParseResult {
  value: unknown;
  nextLine: number;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function parseScalar(val: string): unknown {
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  // Strip quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseYamlLines(
  lines: string[],
  startLine: number,
  baseIndent: number,
): ParseResult {
  // Skip empty lines and comments
  let i = startLine;
  while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) {
    i++;
  }
  if (i >= lines.length) return { value: null, nextLine: i };

  const line = lines[i];
  const trimmed = line.trim();

  // Check if it's a list item
  if (trimmed.startsWith("- ")) {
    const arr: unknown[] = [];
    const listIndent = getIndent(line);
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim() === "" || cur.trim().startsWith("#")) { i++; continue; }
      const curIndent = getIndent(cur);
      if (curIndent < listIndent) break;
      if (curIndent === listIndent && cur.trim().startsWith("- ")) {
        const itemText = cur.trim().slice(2);
        // Check if it's a key: value (nested map in list)
        if (itemText.includes(": ")) {
          const obj: Record<string, unknown> = {};
          const colonIdx = itemText.indexOf(": ");
          const key = itemText.slice(0, colonIdx).trim();
          const val = itemText.slice(colonIdx + 2).trim();
          obj[key] = parseScalar(val);
          // Check for continuation lines at deeper indent
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            if (nextLine.trim() === "" || nextLine.trim().startsWith("#")) { i++; continue; }
            const nextIndent = getIndent(nextLine);
            if (nextIndent <= listIndent) break;
            if (nextLine.trim().includes(": ")) {
              const ci = nextLine.trim().indexOf(": ");
              const k = nextLine.trim().slice(0, ci).trim();
              const v = nextLine.trim().slice(ci + 2).trim();
              obj[k] = parseScalar(v);
              i++;
            } else {
              break;
            }
          }
          arr.push(obj);
        } else {
          arr.push(parseScalar(itemText));
          i++;
        }
      } else {
        break;
      }
    }
    return { value: arr, nextLine: i };
  }

  // Check if it's a map (key: value)
  if (trimmed.includes(": ") || trimmed.endsWith(":")) {
    const obj: Record<string, unknown> = {};
    const mapIndent = getIndent(line);
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim() === "" || cur.trim().startsWith("#")) { i++; continue; }
      const curIndent = getIndent(cur);
      if (curIndent < mapIndent && i > startLine) break;
      if (curIndent !== mapIndent) break;
      const curTrimmed = cur.trim();
      if (curTrimmed.endsWith(":")) {
        // Block value — next lines are the value
        const key = curTrimmed.slice(0, -1).trim();
        i++;
        const result = parseYamlLines(lines, i, mapIndent + 2);
        obj[key] = result.value;
        i = result.nextLine;
      } else if (curTrimmed.includes(": ")) {
        const colonIdx = curTrimmed.indexOf(": ");
        const key = curTrimmed.slice(0, colonIdx).trim();
        const val = curTrimmed.slice(colonIdx + 2).trim();
        obj[key] = parseScalar(val);
        i++;
      } else {
        break;
      }
    }
    return { value: obj, nextLine: i };
  }

  // Plain scalar
  return { value: parseScalar(trimmed), nextLine: i + 1 };
}

// ---------------------------------------------------------------------------
// Minimal TOML parser
// ---------------------------------------------------------------------------

function parseToml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection = result;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    // Section header [section]
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      const parts = sectionName.split(".");
      let target = result;
      for (const part of parts) {
        if (!(part in target)) {
          target[part] = {};
        }
        target = target[part] as Record<string, unknown>;
      }
      currentSection = target;
      continue;
    }

    // key = value
    const kvMatch = trimmed.match(/^([^=]+)=\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();
      currentSection[key] = parseTomlValue(val);
    }
  }

  return result;
}

function parseTomlValue(val: string): unknown {
  if (val === "true") return true;
  if (val === "false") return false;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    return val.slice(1, -1);
  }
  // Arrays
  if (val.startsWith("[") && val.endsWith("]")) {
    const inner = val.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((item) => parseTomlValue(item.trim()));
  }
  return val;
}

// ---------------------------------------------------------------------------
// Serializers
// ---------------------------------------------------------------------------

function toYaml(data: unknown, indent: number = 0): string {
  const prefix = "  ".repeat(indent);

  if (data === null || data === undefined) return `${prefix}null\n`;
  if (typeof data === "boolean") return `${prefix}${data}\n`;
  if (typeof data === "number") return `${prefix}${data}\n`;
  if (typeof data === "string") {
    if (data.includes("\n") || data.includes(": ") || data.includes("#")) {
      return `${prefix}"${data.replace(/"/g, '\\"')}"\n`;
    }
    return `${prefix}${data}\n`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return `${prefix}[]\n`;
    let out = "";
    for (const item of data) {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const entries = Object.entries(item as Record<string, unknown>);
        if (entries.length > 0) {
          const [firstKey, firstVal] = entries[0];
          out += `${prefix}- ${firstKey}: ${scalarToYaml(firstVal)}\n`;
          for (let i = 1; i < entries.length; i++) {
            out += `${prefix}  ${entries[i][0]}: ${scalarToYaml(entries[i][1])}\n`;
          }
          continue;
        }
      }
      out += `${prefix}- ${scalarToYaml(item)}\n`;
    }
    return out;
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return `${prefix}{}\n`;
    let out = "";
    for (const key of keys) {
      const val = obj[key];
      if (
        typeof val === "object" &&
        val !== null &&
        !Array.isArray(val) &&
        Object.keys(val).length > 0
      ) {
        out += `${prefix}${key}:\n`;
        out += toYaml(val, indent + 1);
      } else if (Array.isArray(val)) {
        out += `${prefix}${key}:\n`;
        out += toYaml(val, indent + 1);
      } else {
        out += `${prefix}${key}: ${scalarToYaml(val)}\n`;
      }
    }
    return out;
  }

  return `${prefix}${String(data)}\n`;
}

function scalarToYaml(val: unknown): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return String(val);
  if (typeof val === "number") return String(val);
  if (typeof val === "string") {
    if (val.includes(": ") || val.includes("#") || val.includes("\n")) {
      return `"${val.replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  return JSON.stringify(val);
}

function toToml(data: unknown, sectionPath: string = ""): string {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return String(data);
  }

  const obj = data as Record<string, unknown>;
  let topLevel = "";
  let sections = "";

  for (const [key, val] of Object.entries(obj)) {
    if (
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val)
    ) {
      const path = sectionPath ? `${sectionPath}.${key}` : key;
      sections += `[${path}]\n`;
      sections += toToml(val, path);
      sections += "\n";
    } else {
      topLevel += `${key} = ${toTomlValue(val)}\n`;
    }
  }

  return topLevel + sections;
}

function toTomlValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === "boolean") return String(val);
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return `"${val.replace(/"/g, '\\"')}"`;
  if (Array.isArray(val)) {
    return `[${val.map((v) => toTomlValue(v)).join(", ")}]`;
  }
  return JSON.stringify(val);
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

type Format = "yaml" | "json" | "toml";

function parse(text: string, format: Format): unknown {
  switch (format) {
    case "json":
      return JSON.parse(text);
    case "yaml":
      return parseYaml(text);
    case "toml":
      return parseToml(text);
    default:
      throw new Error(`Unsupported input format: ${format}`);
  }
}

function serialize(data: unknown, format: Format): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "yaml":
      return toYaml(data).trimEnd();
    case "toml":
      return toToml(data).trimEnd();
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}

registerTool({
  name: "yaml_convert",
  description:
    "Convert between YAML, JSON, and TOML formats",
  pro: true,
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Input text to convert" },
      from: {
        type: "string",
        enum: ["yaml", "json", "toml"],
        description: "Source format",
      },
      to: {
        type: "string",
        enum: ["yaml", "json", "toml"],
        description: "Target format",
      },
    },
    required: ["text", "from", "to"],
  },
  handler: async (args) => {
    const text = args.text as string;
    const from = args.from as Format;
    const to = args.to as Format;

    if (!text.trim()) throw new Error("Input text is empty");

    const data = parse(text, from);
    const output = serialize(data, to);

    return [
      `=== Converted ${from.toUpperCase()} → ${to.toUpperCase()} ===`,
      "",
      output,
    ].join("\n");
  },
});
