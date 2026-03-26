# @revxl/devtools

17 developer tools for AI agents. Works with Claude Desktop, Cursor, Windsurf, VS Code.

## Install

Add to your MCP client config:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "@revxl/devtools"]
    }
  }
}
```

## Why @revxl/devtools?

| Feature | mcp-devutils | @revxl/devtools |
|---------|-------------|-----------------|
| Price | $5 one-time | $7 one-time |
| Free tools | 15 (commodity) | 7 (unlimited) |
| Regex to code generation | No | Yes (Python, JS, Go, Rust, Java) |
| Batch operations | No | Yes (500 items per call) |
| Secrets scanner | No | Yes (AWS, GitHub, Stripe, OpenAI) |
| Cron from English | No | Yes ("every weekday at 9am") |
| JSON diff | Pro only | Pro with path-level changes |
| Context token usage | 44 tool defs | 17 tool defs (saves ~2K tokens) |

## Free Tools (7)

| Tool | Description |
|------|-------------|
| `json_format` | Format, minify, or validate JSON strings |
| `base64` | Encode or decode Base64 strings |
| `url_encode` | URL encode or decode strings |
| `uuid_generate` | Generate one or more v4 UUIDs |
| `hash_text` | Hash text with MD5, SHA-256, or SHA-512 |
| `timestamp` | Convert between Unix timestamps, ISO 8601, and human-readable dates |
| `http_status` | Look up HTTP status code name and category |

## Pro Tools (10)

Each Pro tool has 3 free trials before purchase.

| Tool | Description |
|------|-------------|
| `jwt` | Decode and inspect JWTs, or create signed JWTs with custom claims |
| `regex` | Test regex patterns with match highlighting + generate code in 5 languages |
| `cron` | Explain cron expressions, compute next runs, or generate cron from plain English |
| `json_diff` | Deep-diff two JSON objects with path-level added/removed/changed detail |
| `json_query` | Query JSON with dot-notation and bracket paths (e.g. `users[0].name`) |
| `batch` | Run any free tool on up to 500 inputs in a single call |
| `sql_format` | Format and prettify SQL queries with proper indentation |
| `yaml_convert` | Convert between JSON and YAML |
| `chmod` | Explain or generate Unix file permissions from symbolic or numeric notation |
| `secrets_scan` | Scan text for leaked secrets (AWS keys, GitHub tokens, Stripe keys, OpenAI keys) |

## Get Pro

1. Purchase at [https://revxl-devtools.vercel.app](https://revxl-devtools.vercel.app) — **$7 one-time**
2. You'll receive a license key (format: `REVXL-XXXX-XXXX-XXXX`)
3. Add it to your MCP config:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "@revxl/devtools"],
      "env": {
        "REVXL_PRO_KEY": "REVXL-XXXX-XXXX-XXXX"
      }
    }
  }
}
```

## License

MIT — RevXL
