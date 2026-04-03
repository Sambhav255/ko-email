import path from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

const appDir = path.join(__dirname);
const parentDir = path.join(appDir, "..");
const isDev = process.env.NODE_ENV !== "production";

// Load parent folder `.env.local` (e.g. Modo Demo/.env.local) so GEMINI_API_KEY works
// when the key is only in the repo root, not inside ko-email-generator/.
loadEnvConfig(parentDir, isDev);
loadEnvConfig(appDir, isDev);

const nextConfig: NextConfig = {};

export default nextConfig;
