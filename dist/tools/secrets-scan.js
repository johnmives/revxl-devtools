import { registerTool } from "../registry.js";
const PATTERNS = [
    {
        type: "AWS Access Key",
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: "critical",
        recommendation: "Rotate this AWS access key immediately in IAM console",
    },
    {
        type: "AWS Secret Key",
        pattern: /(?:aws_secret_access_key|secret_access_key|aws_secret)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
        severity: "critical",
        recommendation: "Rotate AWS credentials and revoke the exposed secret key",
    },
    {
        type: "GitHub Token",
        pattern: /gh[pors]_[A-Za-z0-9_]{36,255}/g,
        severity: "critical",
        recommendation: "Revoke this GitHub token at github.com/settings/tokens",
    },
    {
        type: "Stripe Secret Key",
        pattern: /sk_live_[A-Za-z0-9]{24,}/g,
        severity: "critical",
        recommendation: "Roll this Stripe key in the Dashboard immediately",
    },
    {
        type: "Stripe Publishable Key",
        pattern: /pk_live_[A-Za-z0-9]{24,}/g,
        severity: "high",
        recommendation: "While publishable, review if this key should be public",
    },
    {
        type: "Slack Token",
        pattern: /xox[bpors]-[A-Za-z0-9-]{10,}/g,
        severity: "critical",
        recommendation: "Revoke this Slack token in your workspace admin settings",
    },
    {
        type: "Private Key",
        pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
        severity: "critical",
        recommendation: "Remove this private key and generate a new key pair",
    },
    {
        type: "JWT Token",
        pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
        severity: "high",
        recommendation: "Revoke this JWT and rotate the signing secret",
    },
    {
        type: "Anthropic API Key",
        pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g,
        severity: "critical",
        recommendation: "Rotate this Anthropic API key in your account settings",
    },
    {
        type: "OpenAI API Key",
        pattern: /sk-[A-Za-z0-9]{20,}/g,
        severity: "critical",
        recommendation: "Rotate this OpenAI API key at platform.openai.com",
    },
    {
        type: "Generic API Key/Token",
        pattern: /(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token)\s*[=:]\s*["']?([A-Za-z0-9_\-/.+=]{16,})["']?/gi,
        severity: "medium",
        recommendation: "Review if this API key/token should be in source code",
    },
    {
        type: "Generic Password",
        pattern: /(?:password|passwd|pwd)\s*[=:]\s*["']([^"'\s]{8,})["']/gi,
        severity: "high",
        recommendation: "Move this password to a secrets manager or environment variable",
    },
    {
        type: "Generic Secret",
        pattern: /(?:secret|secret_key)\s*[=:]\s*["']([^"'\s]{8,})["']/gi,
        severity: "high",
        recommendation: "Move this secret to a secrets manager or environment variable",
    },
    {
        type: "Connection String",
        pattern: /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s"']{10,}/gi,
        severity: "critical",
        recommendation: "Move this connection string to an environment variable. It may contain credentials.",
    },
];
function maskSecret(secret) {
    if (secret.length <= 12)
        return secret.slice(0, 4) + "****";
    return secret.slice(0, 8) + "..." + secret.slice(-4);
}
function scanText(text) {
    const lines = text.split("\n");
    const findings = [];
    const seen = new Set();
    for (const patternDef of PATTERNS) {
        // Reset regex lastIndex for global patterns
        patternDef.pattern.lastIndex = 0;
        let match;
        while ((match = patternDef.pattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const secret = match[1] || fullMatch;
            // Deduplicate
            const key = `${patternDef.type}:${fullMatch}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            // Find line number
            const offset = match.index;
            let lineNum = 1;
            for (let i = 0; i < offset && i < text.length; i++) {
                if (text[i] === "\n")
                    lineNum++;
            }
            findings.push({
                type: patternDef.type,
                masked: maskSecret(secret),
                line: lineNum,
                severity: patternDef.severity,
                recommendation: patternDef.recommendation,
            });
        }
    }
    // Sort by severity then line number
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.line - b.line);
    return findings;
}
registerTool({
    name: "secrets_scan",
    description: "Scan text for leaked secrets, API keys, tokens, passwords, and connection strings",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            text: {
                type: "string",
                description: "Text content to scan for secrets",
            },
        },
        required: ["text"],
    },
    handler: async (args) => {
        const text = args.text;
        if (!text.trim())
            throw new Error("Text is empty");
        const findings = scanText(text);
        if (findings.length === 0) {
            return "No secrets detected. The text appears clean.";
        }
        const critical = findings.filter((f) => f.severity === "critical").length;
        const high = findings.filter((f) => f.severity === "high").length;
        const medium = findings.filter((f) => f.severity === "medium").length;
        const lines = [
            `=== Secrets Scan: Found ${findings.length} secret${findings.length === 1 ? "" : "s"}: ${critical} critical, ${high} high, ${medium} medium ===`,
            "",
        ];
        for (const finding of findings) {
            const severityLabel = finding.severity === "critical"
                ? "CRITICAL"
                : finding.severity === "high"
                    ? "HIGH"
                    : "MEDIUM";
            lines.push(`[${severityLabel}] ${finding.type}`);
            lines.push(`  Line: ${finding.line}`);
            lines.push(`  Preview: ${finding.masked}`);
            lines.push(`  Action: ${finding.recommendation}`);
            lines.push("");
        }
        return lines.join("\n").trimEnd();
    },
});
