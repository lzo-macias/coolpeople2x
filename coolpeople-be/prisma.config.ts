import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),

  // Database URL for all Prisma CLI commands (push, migrate, studio, etc.)
  datasource: {
    url: process.env.DATABASE_URL!,
  },

  migrate: {
    async resolveDatabase() {
      return {
        kind: 'connectionString' as const,
        value: process.env.DATABASE_URL!,
      };
    },
  },
});
