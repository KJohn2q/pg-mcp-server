import { z } from "zod";
import type { ServerConfig } from "./types.js";
import { ConfigurationError } from "./types.js";

/**
 * Parse currentSchema from DATABASE_URL
 *
 * PostgreSQL connection URLs can include a currentSchema parameter:
 * postgresql://user:pass@host:port/db?currentSchema=schema_name
 *
 * @param databaseUrl - The database connection URL
 * @returns The default schema name if specified, undefined otherwise
 */
function parseCurrentSchema(databaseUrl: string): string | undefined {
  try {
    const url = new URL(databaseUrl);
    return url.searchParams.get('currentSchema') || undefined;
  } catch (error) {
    // If URL parsing fails, return undefined
    return undefined;
  }
}

/**
 * Remove currentSchema parameter from DATABASE_URL
 * This is needed because currentSchema is not a standard PostgreSQL connection parameter
 * but we want to support it for user convenience.
 *
 * @param databaseUrl - The database connection URL
 * @returns The cleaned database URL without currentSchema parameter
 */
function removeCurrentSchemaFromUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    url.searchParams.delete('currentSchema');

    // Convert back to string, removing the trailing ? if no search params remain
    const cleanedUrl = url.toString();
    return cleanedUrl.endsWith('?') ? cleanedUrl.slice(0, -1) : cleanedUrl;
  } catch (error) {
    // If URL parsing fails, return the original URL
    return databaseUrl;
  }
}

// Helpers to robustly parse env vars
const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((val) => {
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
      const s = val.trim().toLowerCase();
      if (["true", "1", "yes", "on", "y", "t"].includes(s)) return true;
      if (["false", "0", "no", "off", "", "n", "f"].includes(s)) return false;
      return undefined;
    }
    return undefined;
  }, z.boolean().default(defaultValue));

const intFromEnv = (defaultValue: number, min?: number, max?: number) => {
  let numberSchema: z.ZodNumber = z.number().int();
  if (typeof min === "number") numberSchema = numberSchema.min(min);
  if (typeof max === "number") numberSchema = numberSchema.max(max);

  return z.preprocess((val) => {
    if (typeof val === "number") {
      return Number.isFinite(val) ? Math.trunc(val) : undefined;
    }
    if (typeof val === "string") {
      const n = Number(val);
      return Number.isFinite(n) ? Math.trunc(n) : undefined;
    }
    return undefined;
  }, numberSchema.default(defaultValue));
};

// Zod schema for environment variables
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DANGEROUSLY_ALLOW_WRITE_OPS: booleanFromEnv(false),
  PG_MAX_CONNECTIONS: intFromEnv(10, 1, 100),
  PG_CONNECTION_TIMEOUT: intFromEnv(30, 1, 300),
  PG_STATEMENT_TIMEOUT: intFromEnv(30000, 0),
  PG_PREPARE_STATEMENTS: booleanFromEnv(true),
  DEBUG: booleanFromEnv(false),
  PG_SSL_ROOT_CERT: z.string().optional(),
  PG_REQUIRE_SSL: booleanFromEnv(false),
  PG_SSL_REJECT_UNAUTHORIZED: booleanFromEnv(true),
  PG_FETCH_TYPES: booleanFromEnv(true),
});

// Zod schema for the final config
const ConfigSchema = z.object({
  databaseUrl: z.string(),
  allowWriteOps: z.boolean(),
  maxConnections: z.number().min(1).max(100),
  connectionTimeout: z.number().min(1).max(300),
  statementTimeout: z.number().min(0),
  prepareStatements: z.boolean(),
  debug: z.boolean(),
  sslRootCertPath: z.string().optional(),
  requireSsl: z.boolean().optional(),
  sslRejectUnauthorized: z.boolean().optional(),
  fetchTypes: z.boolean().optional(),
  defaultSchema: z.string().optional(),
});

/**
 * Parse and validate server configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  try {
    // Parse environment variables using Zod
    const env = EnvSchema.parse(process.env);

    // Parse currentSchema from DATABASE_URL
    const defaultSchema = parseCurrentSchema(env.DATABASE_URL);

    // Remove currentSchema from DATABASE_URL since it's not a standard PostgreSQL parameter
    const cleanedDatabaseUrl = removeCurrentSchemaFromUrl(env.DATABASE_URL);

    // Create config object
    const config = {
      databaseUrl: cleanedDatabaseUrl,
      allowWriteOps: env.DANGEROUSLY_ALLOW_WRITE_OPS,
      maxConnections: env.PG_MAX_CONNECTIONS,
      connectionTimeout: env.PG_CONNECTION_TIMEOUT,
      statementTimeout: env.PG_STATEMENT_TIMEOUT,
      prepareStatements: env.PG_PREPARE_STATEMENTS,
      debug: env.DEBUG,
      sslRootCertPath: env.PG_SSL_ROOT_CERT,
      requireSsl: env.PG_REQUIRE_SSL ? true : undefined,
      sslRejectUnauthorized: env.PG_SSL_REJECT_UNAUTHORIZED ? true : undefined,
      fetchTypes: env.PG_FETCH_TYPES,
      defaultSchema,
    };

    // Validate the final config
    const validatedConfig = ConfigSchema.parse(config);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new ConfigurationError(
        `Configuration validation failed: ${errorMessage}`
      );
    }
    throw error;
  }
}

/**
 * Validate configuration values
 */
export function validateConfig(config: ServerConfig): void {
  try {
    ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new ConfigurationError(
        `Configuration validation failed: ${errorMessage}`
      );
    }
    throw error;
  }
}
