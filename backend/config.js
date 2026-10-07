import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadInfoEnv() {
  const file = path.join(projectRoot, 'info.env');
  if (!existsSync(file)) return {};
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const values = {};
  for (const line of lines) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  const mongoLine = lines.find(line => /mongodb(?:\+srv)?:\/\//i.test(line))?.trim();
  if (mongoLine) {
    const uri = mongoLine.match(/mongodb(?:\+srv)?:\/\/\S+/i)?.[0];
    if (uri) {
      const username = lines.find(line => line.trim() && !line.includes(':') && !/mongodb(?:\+srv)?:\/\//i.test(line))?.trim();
      const passwordLine = lines.find(line => /^\s*password\s*:/i.test(line));
      const password = passwordLine?.replace(/^\s*password\s*:\s*/i, '').trim();
      values.MONGODB_URI = uri
        .replace('<db_username>', encodeURIComponent(username || ''))
        .replace('<db_password>', encodeURIComponent(password || ''));
    }
  }
  return values;
}

const fileValues = loadInfoEnv();
export const config = {
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || fileValues.MONGODB_URI || '',
  mongoDatabase: process.env.MONGODB_DATABASE || fileValues.MONGODB_DATABASE || 'cust_sports_week',
  jwtSecret: process.env.JWT_SECRET || fileValues.JWT_SECRET || (process.env.NODE_ENV==='production'?'':'cust-sports-week-development-secret'),
  port: Number(process.env.PORT || fileValues.PORT || 4000),
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || fileValues.SUPER_ADMIN_EMAIL || 'admin@cust.edu.pk',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || fileValues.SUPER_ADMIN_PASSWORD || '',
  projectRoot
};

export function validateMongoUri(uri) {
  if (!uri) throw new Error('MongoDB is not configured. Set MONGODB_URI or provide a valid MongoDB URI in info.env.');
  if (uri.includes('<') || uri.includes('>')) throw new Error('MongoDB URI still contains an unresolved placeholder. Replace the username placeholder in info.env.');
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MongoDB URI is invalid. Check the connection string in info.env.');
  }
  if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
    throw new Error('MongoDB URI must start with mongodb:// or mongodb+srv://.');
  }
}
