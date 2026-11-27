import { defineConfig } from '@playwright/test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const target = new URL(process.env.E2E_BASE_URL || 'http://127.0.0.1:4388');
if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.protocol !== 'http:' ||
    !target.port || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
  throw new Error('Studio tests require a local HTTP origin with an explicit port, e.g. http://127.0.0.1:4388.');
}
const origin = 'http://127.0.0.1:' + target.port;
process.env.E2E_BASE_URL = origin;

// Workers re-import the config. Share only the new temporary directory from this run.
if (!process.env.TEST_WORKER_INDEX) {
  process.env.STUDIO_TEST_RESULTS = mkdtempSync(join(tmpdir(), 'globoox-studio-e2e-'));
  console.log('Studio test results:', process.env.STUDIO_TEST_RESULTS);
}
const results = process.env.STUDIO_TEST_RESULTS!;
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/studio-*.spec.ts',
  workers: 4,
  forbidOnly: true,
  outputDir: join(results, 'artifacts'),
  reporter: [['list'], ['json', {outputFile: join(results, 'report.json')}]],
  use: {
    baseURL: origin,
    serviceWorkers: 'block',
    screenshot: process.env.STUDIO_SCREENSHOTS === '1' ? 'on' : 'only-on-failure',
    launchOptions: {
      executablePath: existsSync(macChrome) ? macChrome : undefined,
      // Send every other host (including other loopback ports) to the local server.
      // It rejects proxy requests and tunnelling. The Playwright route mocks still run.
      args: [
        '--proxy-server=' + origin,
        '--proxy-bypass-list=<-loopback>;127.0.0.1:' + target.port,
        '--disable-quic',
        '--disable-background-networking',
      ],
    },
  },
  webServer: {
    command: 'node scripts/serve-studio-tests.mjs',
    env: {STUDIO_TEST_PORT: target.port, NEXT_TELEMETRY_DISABLED: '1'},
    url: origin + '/studio',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
