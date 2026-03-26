import { registerTool } from "../registry.js";
import { generateRegexCode } from "../codegen/regex-codegen.js";

// ---------------------------------------------------------------------------
// Regex tester + multi-language code generator
// ---------------------------------------------------------------------------

interface MatchResult {
  match: string;
  index: number;
  groups: Record<string, string> | null;
}

registerTool({
  name: "regex",
  description:
    "Test a regex pattern against a string (with match details, groups, indices) and generate working code in JS/Python/Go/Rust/Java",
  pro: true,
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regular expression pattern (without delimiters)",
      },
      test_string: {
        type: "string",
        description: "String to test against (omit to just validate the pattern)",
      },
      flags: {
        type: "string",
        description: "Regex flags, e.g. 'gi' for global+case-insensitive (default: 'g')",
      },
      generate_code: {
        type: "boolean",
        description: "Generate code snippets in multiple languages (default: false)",
      },
      languages: {
        type: "array",
        items: { type: "string" },
        description:
          "Languages for code generation: javascript, python, go, rust, java (default: all)",
      },
    },
    required: ["pattern"],
  },
  handler: async (args) => {
    const pattern = args.pattern as string;
    const testString = args.test_string as string | undefined;
    const flags = (args.flags as string) || "g";
    const generateCode = (args.generate_code as boolean) || false;
    const languages = args.languages as string[] | undefined;

    // Validate the pattern first
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Invalid regex pattern: ${msg}`;
    }

    const sections: string[] = [
      `=== Regex: /${pattern}/${flags} ===`,
    ];

    if (testString !== undefined) {
      const matches: MatchResult[] = [];

      if (flags.includes("g")) {
        // Global: iterate all matches
        let m: RegExpExecArray | null;
        while ((m = regex.exec(testString)) !== null) {
          matches.push({
            match: m[0],
            index: m.index,
            groups: m.groups ? { ...m.groups } : null,
          });
          // Safety: avoid infinite loop on zero-length matches
          if (m[0].length === 0) regex.lastIndex++;
        }
      } else {
        // Non-global: single match with capture groups
        const m = regex.exec(testString);
        if (m) {
          matches.push({
            match: m[0],
            index: m.index,
            groups: m.groups ? { ...m.groups } : null,
          });
          // Show capture groups
          if (m.length > 1) {
            sections.push("");
            sections.push("--- Capture Groups ---");
            for (let i = 1; i < m.length; i++) {
              sections.push(`  Group ${i}: ${JSON.stringify(m[i])}`);
            }
          }
        }
      }

      sections.push("");
      if (matches.length === 0) {
        sections.push("No matches found.");
      } else {
        sections.push(`${matches.length} match${matches.length === 1 ? "" : "es"} found:`);
        sections.push("");
        for (const match of matches) {
          sections.push(`  [${match.index}] "${match.match}"`);
          if (match.groups) {
            for (const [name, value] of Object.entries(match.groups)) {
              sections.push(`        ${name}: "${value}"`);
            }
          }
        }
      }
    } else {
      sections.push("");
      sections.push("Pattern is valid. Provide test_string to see matches.");
    }

    if (generateCode) {
      sections.push("");
      sections.push("=== Code Snippets ===");
      sections.push("");
      sections.push(generateRegexCode(pattern, flags, languages));
    }

    return sections.join("\n");
  },
});
