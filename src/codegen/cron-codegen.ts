// ---------------------------------------------------------------------------
// Cron code generation — crontab, systemd timer, and node-cron snippets
// ---------------------------------------------------------------------------

export function generateCronCode(expression: string): string {
  const crontab = `# Crontab entry
${expression} /path/to/command`;

  const systemd = generateSystemdTimer(expression);
  const nodeCron = generateNodeCron(expression);

  return [crontab, systemd, nodeCron].join("\n\n---\n\n");
}

function cronToOnCalendar(expression: string): string {
  const parts = expression.split(/\s+/);
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const dayMap: Record<string, string> = {
    "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed",
    "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun",
  };

  let dow = "*";
  if (dayOfWeek !== "*") {
    dow = dayOfWeek
      .split(",")
      .map((d) => dayMap[d] || d)
      .join(",");
  }

  const dom = dayOfMonth === "*" ? "*" : dayOfMonth;
  const mon = month === "*" ? "*" : month.padStart(2, "0");
  const h = hour === "*" ? "*" : hour.padStart(2, "0");
  const m = minute === "*" ? "*" : minute.padStart(2, "0");

  return `${dow} *-${mon}-${dom} ${h}:${m}:00`;
}

function generateSystemdTimer(expression: string): string {
  const onCalendar = cronToOnCalendar(expression);
  return `# systemd timer unit — save as /etc/systemd/system/mytask.timer
[Unit]
Description=My scheduled task

[Timer]
OnCalendar=${onCalendar}
Persistent=true

[Install]
WantedBy=timers.target`;
}

function generateNodeCron(expression: string): string {
  return `// Node.js — npm install cron
import { CronJob } from 'cron';

const job = new CronJob('${expression}', () => {
  console.log('Task executed at', new Date().toISOString());
  // your logic here
});

job.start();`;
}
