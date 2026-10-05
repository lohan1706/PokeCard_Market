import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../../../.env'),
];

for (const candidate of candidates) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}
