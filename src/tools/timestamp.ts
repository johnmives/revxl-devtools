import { registerTool } from "../registry.js";

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const absDiff = Math.abs(diffMs);
  const suffix = diffMs >= 0 ? "ago" : "from now";

  const seconds = Math.floor(absDiff / 1000);
  if (seconds < 60) return `${seconds} seconds ${suffix}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ${suffix}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ${suffix}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ${suffix}`;
  const years = Math.floor(days / 365);
  return `${years} years ${suffix}`;
}

registerTool({
  name: "timestamp",
  description:
    "Convert between timestamp formats: epoch seconds, epoch ms, ISO 8601, human-readable",
  pro: false,
  inputSchema: {
    type: "object",
    properties: {
      value: {
        type: "string",
        description:
          'Timestamp value: "now", epoch seconds, epoch milliseconds, or ISO 8601 string',
      },
    },
    required: ["value"],
  },
  handler: async (args) => {
    const value = (args.value as string).trim();
    let date: Date;

    if (value.toLowerCase() === "now") {
      date = new Date();
    } else if (/^\d{10}$/.test(value)) {
      // Epoch seconds
      date = new Date(parseInt(value, 10) * 1000);
    } else if (/^\d{13}$/.test(value)) {
      // Epoch milliseconds
      date = new Date(parseInt(value, 10));
    } else if (value.includes("T") || value.includes("-")) {
      date = new Date(value);
    } else {
      throw new Error(
        `Cannot parse timestamp: "${value}". Use "now", epoch seconds (10 digits), epoch ms (13 digits), or ISO 8601.`
      );
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: "${value}"`);
    }

    const epochS = Math.floor(date.getTime() / 1000);
    const epochMs = date.getTime();

    return [
      `epoch_seconds: ${epochS}`,
      `epoch_ms:      ${epochMs}`,
      `iso8601:       ${date.toISOString()}`,
      `human:         ${date.toUTCString()}`,
      `relative:      ${relativeTime(date)}`,
    ].join("\n");
  },
});
