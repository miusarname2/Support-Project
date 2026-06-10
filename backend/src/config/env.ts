import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Also try loading from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  SUPABASE_URL: requireEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  GROQ_API_KEY: requireEnv("GROQ_API_KEY"),
  PORT: parseInt(requireEnv("PORT", "3001"), 10),
  AI_SERVICE_URL: requireEnv("AI_SERVICE_URL", "http://localhost:8000"),
  FRONTEND_URL: requireEnv("FRONTEND_URL", "http://localhost:5173"),
  NODE_ENV: requireEnv("NODE_ENV", "development"),
} as const;
