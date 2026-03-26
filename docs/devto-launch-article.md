---
title: I Built 17 MCP Dev Tools That Actually Do What Your AI Can't
published: true
description: Secrets scanning, regex-to-code in 5 languages, cron from plain English, batch ops on 500 items. 17 tools, zero bloat.
tags: mcp, ai, developer-tools, productivity
cover_image:
---

Your AI agent can generate a UUID. It can decode base64 in its head. It can even write a regex pattern if you ask nicely.

So why would you install an MCP dev tools server?

Because there's a category of developer tasks that agents *think* they can do but actually butcher every time:

- **Scanning for leaked secrets** across a codebase (agents miss patterns, hallucinate matches)
- **Generating production regex code** in Python, Go, Rust, Java, and JS from a single pattern
- **Batch-processing 500 items** in one call instead of 500 round-trips
- **Deep-diffing JSON objects** with exact path-level changes, not a vague "these look different"

I built `revxl-devtools` to give agents these capabilities as proper tools with structured output. 17 tools total. No bloat.

## Install in 30 seconds

Add this to your Claude Desktop, Cursor, Windsurf, or VS Code MCP config:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "revxl-devtools"]
    }
  }
}
```

That's it. 7 free tools work immediately, unlimited. 10 Pro tools come with 3 free trials each.

## The 3 Tools That Actually Matter

Most MCP dev tool servers give you 40+ tools that duplicate what your agent already does natively. Here are three that don't exist anywhere else.

### 1. secrets_scan -- Find leaked keys before they cost you $50K

Paste any text, config file, or code block and `secrets_scan` catches what grep won't:

```
> secrets_scan("Check this config:
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   password = hunter2
   ANTHROPIC_API_KEY=sk-ant-api03-abc123...")
```

```json
{
  "findings": [
    {
      "type": "AWS Access Key",
      "value": "AKIAIOSFODNN7EXAMPLE",
      "severity": "critical",
      "line": 2,
      "recommendation": "Rotate immediately in AWS IAM console"
    },
    {
      "type": "Anthropic API Key",
      "value": "sk-ant-api03-abc123...",
      "severity": "critical",
      "line": 4,
      "recommendation": "Revoke at console.anthropic.com/settings/keys"
    }
  ],
  "summary": "2 critical secrets found"
}
```

It catches AWS keys, GitHub tokens, Stripe keys, OpenAI keys, Anthropic keys, and more. Your agent can run this on files before you commit them. Think of it as a lightweight `trufflehog` that lives inside your AI workflow.

### 2. regex -- Pattern testing + code generation in 5 languages

Every developer has done this dance: ask the AI for a regex, test it manually, realize it doesn't work in Go because Go's regex engine doesn't support lookbehinds, rewrite it.

`regex` solves this in one call:

```
> regex(pattern: "^[\\w.+-]+@[\\w-]+\\.[\\w.]+$",
        test_string: "user@example.com\nbad@@email\ntest.user+tag@company.co.uk",
        generate_code: true)
```

```json
{
  "matches": [
    { "match": "user@example.com", "index": 0 },
    { "match": "test.user+tag@company.co.uk", "index": 2 }
  ],
  "code": {
    "python": "import re\npattern = re.compile(r'^[\\w.+-]+@[\\w-]+\\.[\\w.]+$')\nmatches = pattern.findall(text)",
    "javascript": "const pattern = /^[\\w.+-]+@[\\w-]+\\.[\\w.]+$/gm;\nconst matches = text.match(pattern);",
    "go": "re := regexp.MustCompile(`^[\\w.+-]+@[\\w-]+\\.[\\w.]+$`)\nmatches := re.FindAllString(text, -1)",
    "rust": "let re = Regex::new(r\"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$\").unwrap();\nlet matches: Vec<&str> = re.find_iter(&text).map(|m| m.as_str()).collect();",
    "java": "Pattern pattern = Pattern.compile(\"^[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.]+$\");\nMatcher matcher = pattern.matcher(text);"
  }
}
```

Test and generate in one shot. Your agent gets copy-paste-ready code for whichever language your project uses.

### 3. cron -- From plain English to production config

Stop Googling crontab syntax. Just describe what you want:

```
> cron(natural_language: "every weekday at 9am EST")
```

```json
{
  "expression": "0 9 * * 1-5",
  "description": "At 09:00, Monday through Friday",
  "next_runs": [
    "2026-03-26 09:00 (Thu)",
    "2026-03-27 09:00 (Fri)",
    "2026-03-30 09:00 (Mon)"
  ],
  "code": {
    "crontab": "0 9 * * 1-5 /path/to/script.sh",
    "systemd": "[Timer]\nOnCalendar=Mon..Fri *-*-* 09:00:00",
    "node_cron": "cron.schedule('0 9 * * 1-5', () => { /* ... */ })"
  }
}
```

Crontab, systemd timer, and node-cron output -- all from one English sentence. You can also pass an existing cron expression to get a human-readable explanation and the next 5 run times.

## Comparison: revxl-devtools vs mcp-devutils

| | mcp-devutils | revxl-devtools |
|---|---|---|
| **Price** | $5 one-time | $7 one-time |
| **Total tools** | 44 | 17 |
| **Free tools** | 15 | 7 (unlimited) |
| **Regex to code gen** | No | Yes (5 languages) |
| **Batch operations** | No | Yes (500 items/call) |
| **Secrets scanner** | No | Yes |
| **Cron from English** | No | Yes |
| **JSON deep diff** | Pro only | Pro with path-level detail |
| **Context tokens used** | ~44 tool definitions | ~17 tool definitions |

That last row matters more than you think. Every MCP tool definition eats context tokens. 44 tool defs means your agent has less room for your actual conversation. 17 tools means less waste and faster responses.

Fewer tools that do more > more tools that duplicate your agent's native abilities.

## Full Tool List

**Free (unlimited):**
`json_format` | `base64` | `url_encode` | `uuid_generate` | `hash_text` | `timestamp` | `http_status`

**Pro ($7 one-time, 3 free trials each):**
`jwt` | `regex` | `cron` | `json_diff` | `json_query` | `batch` | `sql_format` | `yaml_convert` | `chmod` | `secrets_scan`

## Setup

**Basic (free tools only):**

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "revxl-devtools"]
    }
  }
}
```

**With Pro license:**

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "revxl-devtools"],
      "env": {
        "REVXL_PRO_KEY": "REVXL-XXXX-XXXX-XXXX"
      }
    }
  }
}
```

Works with Claude Desktop, Cursor, Windsurf, and VS Code. Any MCP-compatible client.

## Try It

Every Pro tool gives you 3 free trials. No credit card, no sign-up. Just install and use it.

If the tools save you time (they will), Pro is a one-time $7 at [revxl-devtools.vercel.app](https://revxl-devtools.vercel.app).

`npx -y revxl-devtools` -- that's the whole install.

---

*Built by [RevXL](https://revxl.net). Questions or feature requests? Open an issue on the repo or reach out at john@revxl.net.*
