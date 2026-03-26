import { registerTool } from "../registry.js";
import { generateCronCode } from "../codegen/cron-codegen.js";
// ---------------------------------------------------------------------------
// Cron expression explainer, generator, and next-run calculator
// ---------------------------------------------------------------------------
const FIELD_NAMES = ["minute", "hour", "day of month", "month", "day of week"];
const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function parseField(raw, min, max) {
    if (raw === "*")
        return { type: "any", raw };
    // Step: */N or N-M/S
    if (raw.includes("/")) {
        const [base, stepStr] = raw.split("/");
        const step = parseInt(stepStr, 10);
        if (base === "*") {
            return { type: "step", raw, step, rangeStart: min, rangeEnd: max };
        }
        if (base.includes("-")) {
            const [s, e] = base.split("-").map(Number);
            return { type: "step", raw, step, rangeStart: s, rangeEnd: e };
        }
        return { type: "step", raw, step, rangeStart: parseInt(base, 10), rangeEnd: max };
    }
    // Range: N-M
    if (raw.includes("-") && !raw.includes(",")) {
        const [s, e] = raw.split("-").map(Number);
        return { type: "range", raw, rangeStart: s, rangeEnd: e };
    }
    // List: N,M,O
    if (raw.includes(",")) {
        const values = raw.split(",").map(Number);
        return { type: "list", raw, values };
    }
    // Single value
    return { type: "value", raw, values: [parseInt(raw, 10)] };
}
function expandField(field, min, max) {
    switch (field.type) {
        case "any": {
            const vals = [];
            for (let i = min; i <= max; i++)
                vals.push(i);
            return vals;
        }
        case "value":
        case "list":
            return field.values;
        case "range": {
            const vals = [];
            for (let i = field.rangeStart; i <= field.rangeEnd; i++)
                vals.push(i);
            return vals;
        }
        case "step": {
            const vals = [];
            for (let i = field.rangeStart; i <= field.rangeEnd; i += field.step)
                vals.push(i);
            return vals;
        }
    }
}
function describeField(field, index) {
    const name = FIELD_NAMES[index];
    switch (field.type) {
        case "any":
            return `${name}: every ${name}`;
        case "value": {
            const v = field.values[0];
            if (index === 3)
                return `${name}: ${MONTH_NAMES[v] || v}`;
            if (index === 4)
                return `${name}: ${DOW_NAMES[v] || v}`;
            return `${name}: ${v}`;
        }
        case "list": {
            const labels = field.values.map((v) => {
                if (index === 3)
                    return MONTH_NAMES[v] || String(v);
                if (index === 4)
                    return DOW_NAMES[v] || String(v);
                return String(v);
            });
            return `${name}: ${labels.join(", ")}`;
        }
        case "range":
            return `${name}: ${field.rangeStart} through ${field.rangeEnd}`;
        case "step":
            return `${name}: every ${field.step} starting at ${field.rangeStart}`;
    }
}
// ---------------------------------------------------------------------------
// Next run calculator
// ---------------------------------------------------------------------------
function fieldMatches(value, allowed) {
    return allowed.includes(value);
}
function getNextRuns(expression, count, fromDate) {
    const parts = expression.split(/\s+/);
    if (parts.length !== 5)
        throw new Error("Invalid cron: expected 5 fields");
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
    const allowedSets = parts.map((p, i) => {
        const field = parseField(p, ranges[i][0], ranges[i][1]);
        return expandField(field, ranges[i][0], ranges[i][1]);
    });
    const [allowedMin, allowedHour, allowedDom, allowedMonth, allowedDow] = allowedSets;
    const results = [];
    const start = fromDate ? new Date(fromDate) : new Date();
    // Round up to next minute
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() + 1);
    const maxIterations = count * 1440 * 32; // generous limit
    const current = new Date(start);
    for (let i = 0; i < maxIterations && results.length < count; i++) {
        const min = current.getMinutes();
        const hour = current.getHours();
        const dom = current.getDate();
        const month = current.getMonth() + 1;
        const dow = current.getDay();
        if (fieldMatches(min, allowedMin) &&
            fieldMatches(hour, allowedHour) &&
            fieldMatches(dom, allowedDom) &&
            fieldMatches(month, allowedMonth) &&
            fieldMatches(dow, allowedDow)) {
            results.push(new Date(current));
        }
        current.setMinutes(current.getMinutes() + 1);
    }
    return results;
}
// ---------------------------------------------------------------------------
// Natural language -> cron
// ---------------------------------------------------------------------------
function naturalToCron(text) {
    const lower = text.toLowerCase().trim();
    // "every N minutes"
    const everyMinMatch = lower.match(/every\s+(\d+)\s+minutes?/);
    if (everyMinMatch)
        return `*/${everyMinMatch[1]} * * * *`;
    // "every N hours"
    const everyHourMatch = lower.match(/every\s+(\d+)\s+hours?/);
    if (everyHourMatch)
        return `0 */${everyHourMatch[1]} * * *`;
    // "every minute"
    if (/every\s+minute/.test(lower))
        return "* * * * *";
    // "every hour"
    if (/every\s+hour/.test(lower))
        return "0 * * * *";
    // "midnight"
    if (/midnight/.test(lower))
        return "0 0 * * *";
    // "noon"
    if (/noon/.test(lower))
        return "0 12 * * *";
    // "every day at Xam/pm" or "daily at X"
    const dailyMatch = lower.match(/(?:every\s+day|daily)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (dailyMatch) {
        let hour = parseInt(dailyMatch[1], 10);
        const min = dailyMatch[2] ? parseInt(dailyMatch[2], 10) : 0;
        const ampm = dailyMatch[3];
        if (ampm === "pm" && hour < 12)
            hour += 12;
        if (ampm === "am" && hour === 12)
            hour = 0;
        return `${min} ${hour} * * *`;
    }
    // "every weekday at X"
    const weekdayMatch = lower.match(/every\s+weekday\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (weekdayMatch) {
        let hour = parseInt(weekdayMatch[1], 10);
        const min = weekdayMatch[2] ? parseInt(weekdayMatch[2], 10) : 0;
        const ampm = weekdayMatch[3];
        if (ampm === "pm" && hour < 12)
            hour += 12;
        if (ampm === "am" && hour === 12)
            hour = 0;
        return `${min} ${hour} * * 1-5`;
    }
    // "every monday/tuesday/..." with optional "at X"
    const dayNames = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
    };
    const dayMatch = lower.match(/every\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/);
    if (dayMatch) {
        const dow = dayNames[dayMatch[1]];
        let hour = dayMatch[2] ? parseInt(dayMatch[2], 10) : 0;
        const min = dayMatch[3] ? parseInt(dayMatch[3], 10) : 0;
        const ampm = dayMatch[4];
        if (ampm === "pm" && hour < 12)
            hour += 12;
        if (ampm === "am" && hour === 12)
            hour = 0;
        return `${min} ${hour} * * ${dow}`;
    }
    throw new Error(`Could not parse: "${text}". Try formats like "every 5 minutes", "every day at 3pm", "every monday at 9am", "midnight", "noon"`);
}
// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------
registerTool({
    name: "cron",
    description: "Explain cron expressions in plain English, generate cron from natural language, and compute next run times with code snippets",
    pro: true,
    inputSchema: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["explain", "generate", "next_runs"],
                description: "explain: parse and describe a cron expression | generate: natural language to cron | next_runs: compute upcoming run times",
            },
            expression: {
                type: "string",
                description: "(explain, next_runs) A 5-field cron expression like '*/5 * * * *'",
            },
            text: {
                type: "string",
                description: '(generate) Natural language schedule like "every 5 minutes" or "every monday at 9am"',
            },
            count: {
                type: "number",
                description: "(next_runs) Number of upcoming runs to compute (default: 5)",
            },
        },
        required: ["action"],
    },
    handler: async (args) => {
        const action = args.action;
        if (action === "explain") {
            const expression = args.expression;
            if (!expression)
                throw new Error("expression is required for explain action");
            const parts = expression.split(/\s+/);
            if (parts.length !== 5)
                throw new Error("Invalid cron expression: expected 5 space-separated fields");
            const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
            const fields = parts.map((p, i) => parseField(p, ranges[i][0], ranges[i][1]));
            const sections = [
                `=== Cron: ${expression} ===`,
                "",
                "--- Fields ---",
                ...fields.map((f, i) => `  ${parts[i].padEnd(6)} ${describeField(f, i)}`),
                "",
            ];
            // Next 3 runs
            const nextRuns = getNextRuns(expression, 3);
            sections.push("--- Next 3 Runs ---");
            for (const run of nextRuns) {
                sections.push(`  ${run.toISOString()}`);
            }
            sections.push("");
            sections.push("--- Code ---");
            sections.push(generateCronCode(expression));
            return sections.join("\n");
        }
        if (action === "generate") {
            const text = args.text;
            if (!text)
                throw new Error("text is required for generate action");
            const expression = naturalToCron(text);
            const parts = expression.split(/\s+/);
            const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
            const fields = parts.map((p, i) => parseField(p, ranges[i][0], ranges[i][1]));
            const sections = [
                `=== Generated Cron ===`,
                "",
                `Input: "${text}"`,
                `Expression: ${expression}`,
                "",
                "--- Fields ---",
                ...fields.map((f, i) => `  ${parts[i].padEnd(6)} ${describeField(f, i)}`),
                "",
            ];
            const nextRuns = getNextRuns(expression, 3);
            sections.push("--- Next 3 Runs ---");
            for (const run of nextRuns) {
                sections.push(`  ${run.toISOString()}`);
            }
            sections.push("");
            sections.push("--- Code ---");
            sections.push(generateCronCode(expression));
            return sections.join("\n");
        }
        if (action === "next_runs") {
            const expression = args.expression;
            if (!expression)
                throw new Error("expression is required for next_runs action");
            const count = args.count || 5;
            const runs = getNextRuns(expression, count);
            const sections = [
                `=== Next ${count} Runs for: ${expression} ===`,
                "",
            ];
            for (let i = 0; i < runs.length; i++) {
                sections.push(`  ${i + 1}. ${runs[i].toISOString()}`);
            }
            if (runs.length < count) {
                sections.push("");
                sections.push(`(Only found ${runs.length} matching times within search window)`);
            }
            return sections.join("\n");
        }
        throw new Error(`Unknown action: ${action}. Use "explain", "generate", or "next_runs".`);
    },
});
