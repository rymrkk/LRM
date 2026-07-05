#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const FORBIDDEN_KEYS = ["SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY"];

function usage() {
  console.log("Usage: node my-skill/scripts/check_supabase_env.mjs [env-file] [--allow-placeholders]");
}

function parseArgs(argv) {
  const options = {
    allowPlaceholders: false,
    envPath: null,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--allow-placeholders") {
      options.allowPlaceholders = true;
      continue;
    }
    if (!options.envPath) {
      options.envPath = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  options.envPath = options.envPath || path.join(process.cwd(), "crm-app", ".env.local");
  return options;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvFile(contents) {
  const entries = new Map();
  const lines = contents.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    entries.set(match[1], unquote(match[2]));
  }

  return entries;
}

function isPlaceholder(value) {
  return /your-|replace-|example|placeholder/i.test(value);
}

function validate(entries, options) {
  const errors = [];
  const warnings = [];

  for (const key of REQUIRED_KEYS) {
    if (!entries.has(key) || entries.get(key).trim() === "") {
      errors.push(`Missing required key: ${key}`);
    }
  }

  for (const key of FORBIDDEN_KEYS) {
    if (entries.has(key) && entries.get(key).trim() !== "") {
      errors.push(`Forbidden browser env key is present: ${key}`);
    }
  }

  const supabaseUrl = entries.get("VITE_SUPABASE_URL") || "";
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push("VITE_SUPABASE_URL must use http or https.");
      }
      if (!parsed.hostname.includes("supabase")) {
        warnings.push("VITE_SUPABASE_URL does not look like a Supabase hostname.");
      }
    } catch {
      errors.push("VITE_SUPABASE_URL is not a valid URL.");
    }
  }

  const publishableKey = entries.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "";
  if (publishableKey && publishableKey.length < 10) {
    errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is unexpectedly short.");
  }

  if (!options.allowPlaceholders) {
    for (const key of REQUIRED_KEYS) {
      const value = entries.get(key) || "";
      if (isPlaceholder(value)) {
        errors.push(`${key} still contains a placeholder value.`);
      }
    }
  }

  return { errors, warnings };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(2);
  }

  if (!existsSync(options.envPath)) {
    console.error(`Env file not found: ${options.envPath}`);
    process.exit(1);
  }

  const entries = parseEnvFile(readFileSync(options.envPath, "utf8"));
  const { errors, warnings } = validate(entries, options);

  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(`OK: ${options.envPath} contains browser-safe Supabase env keys.`);
}

main();
