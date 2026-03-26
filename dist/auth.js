import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const CACHE_PATH = join(homedir(), ".revxl-devtools-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TRIAL_USES = 3;
function loadCache() {
    try {
        const raw = readFileSync(CACHE_PATH, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return { proValidated: false, validatedAt: 0, trialUses: {} };
    }
}
function saveCache(cache) {
    try {
        writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
    }
    catch {
        // Silently fail — cache is best-effort
    }
}
async function validateKeyWithSupabase(key) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        // Dev mode: accept any RX-prefixed key
        return key.startsWith("RX.");
    }
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/pro_keys?key=eq.${encodeURIComponent(key)}&select=active`, {
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
            },
        });
        if (!res.ok) {
            // Supabase down — fall back to format check
            return key.startsWith("RX.");
        }
        const rows = (await res.json());
        return rows.length > 0 && rows[0].active === true;
    }
    catch {
        // Network error — fall back to format check
        return key.startsWith("RX.");
    }
}
export async function checkProAccess() {
    const key = process.env.MCP_DEVTOOLS_KEY;
    if (!key || !key.startsWith("RX.")) {
        return false;
    }
    const cache = loadCache();
    // Check cache validity
    const cacheAge = Date.now() - cache.validatedAt;
    if (cache.proValidated && cacheAge < CACHE_TTL_MS) {
        return true;
    }
    // Validate against Supabase (or dev mode fallback)
    const valid = await validateKeyWithSupabase(key);
    cache.proValidated = valid;
    cache.validatedAt = Date.now();
    saveCache(cache);
    return valid;
}
export function getTrialUsesRemaining(toolName) {
    const cache = loadCache();
    const used = cache.trialUses[toolName] ?? 0;
    return Math.max(0, MAX_TRIAL_USES - used);
}
export function incrementTrialUse(toolName) {
    const cache = loadCache();
    cache.trialUses[toolName] = (cache.trialUses[toolName] ?? 0) + 1;
    saveCache(cache);
}
