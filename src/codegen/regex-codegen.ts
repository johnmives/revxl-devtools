// ---------------------------------------------------------------------------
// Regex code generation — produces working snippets in 5 languages
// ---------------------------------------------------------------------------

type Language = "javascript" | "python" | "go" | "rust" | "java";

const ALL_LANGUAGES: Language[] = ["javascript", "python", "go", "rust", "java"];

function jsFlags(flags: string): string {
  return flags || "";
}

function pyFlags(flags: string): string {
  const parts: string[] = [];
  if (flags.includes("i")) parts.push("re.IGNORECASE");
  if (flags.includes("m")) parts.push("re.MULTILINE");
  if (flags.includes("s")) parts.push("re.DOTALL");
  return parts.length ? ", " + parts.join(" | ") : "";
}

function generateJS(pattern: string, flags: string): string {
  const f = jsFlags(flags);
  return `// JavaScript
const regex = /${pattern}/${f};
const text = "your text here";

const matches = text.match(regex);
if (matches) {
  console.log("Matches:", matches);
} else {
  console.log("No matches found");
}`;
}

function generatePython(pattern: string, flags: string): string {
  const f = pyFlags(flags);
  return `# Python
import re

pattern = re.compile(r'${pattern}'${f})
text = "your text here"

matches = pattern.findall(text)
print("Matches:", matches)`;
}

function generateGo(pattern: string, flags: string): string {
  // Go uses inline flags (?i) etc.
  let goFlags = "";
  if (flags.includes("i")) goFlags += "i";
  if (flags.includes("m")) goFlags += "m";
  if (flags.includes("s")) goFlags += "s";
  const prefix = goFlags ? `(?${goFlags})` : "";
  return `// Go
package main

import (
\t"fmt"
\t"regexp"
)

func main() {
\tre := regexp.MustCompile(\`${prefix}${pattern}\`)
\ttext := "your text here"

\tmatches := re.FindAllString(text, -1)
\tfmt.Println("Matches:", matches)
}`;
}

function generateRust(pattern: string, flags: string): string {
  let rustFlags = "";
  if (flags.includes("i")) rustFlags += "(?i)";
  if (flags.includes("m")) rustFlags += "(?m)";
  if (flags.includes("s")) rustFlags += "(?s)";
  return `// Rust — add \`regex = "1"\` to Cargo.toml [dependencies]
use regex::Regex;

fn main() {
    let re = Regex::new(r"${rustFlags}${pattern}").unwrap();
    let text = "your text here";

    for m in re.find_iter(text) {
        println!("Match: {}", m.as_str());
    }
}`;
}

function generateJava(pattern: string, flags: string): string {
  const javaFlags: string[] = [];
  if (flags.includes("i")) javaFlags.push("Pattern.CASE_INSENSITIVE");
  if (flags.includes("m")) javaFlags.push("Pattern.MULTILINE");
  if (flags.includes("s")) javaFlags.push("Pattern.DOTALL");
  const flagArg = javaFlags.length ? ", " + javaFlags.join(" | ") : "";
  return `// Java
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class RegexDemo {
    public static void main(String[] args) {
        Pattern pattern = Pattern.compile("${pattern}"${flagArg});
        String text = "your text here";
        Matcher matcher = pattern.matcher(text);

        while (matcher.find()) {
            System.out.println("Match: " + matcher.group());
        }
    }
}`;
}

const generators: Record<Language, (pattern: string, flags: string) => string> = {
  javascript: generateJS,
  python: generatePython,
  go: generateGo,
  rust: generateRust,
  java: generateJava,
};

export function generateRegexCode(
  pattern: string,
  flags: string,
  languages?: string[],
): string {
  const langs: Language[] = languages && languages.length
    ? (languages.map((l) => l.toLowerCase()) as Language[]).filter(
        (l) => l in generators,
      )
    : ALL_LANGUAGES;

  return langs.map((lang) => generators[lang](pattern, flags)).join("\n\n---\n\n");
}
