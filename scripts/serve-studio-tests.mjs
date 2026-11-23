// Local shell for Playwright route mocks. Never forwards to an application or auth API.
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { Socket } from 'node:net';

const port = Number(process.env.STUDIO_TEST_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local Studio test port.');
if (!existsSync('.next/BUILD_ID')) throw new Error('Run npm run build before the Studio browser tests.');

// Prevent server rendering or a third-party SDK from opening outgoing connections.
// Incoming browser sockets are accepted by the HTTP server and do not call connect().
Socket.prototype.connect = function () {
  process.nextTick(() => this.destroy(new Error('Outgoing network disabled for local Studio tests.')));
  return this;
};
const { default: next } = await import('next');
const app = next({ dev: false, hostname: '127.0.0.1', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    if (req.headers.host !== '127.0.0.1:' + port || !req.url.startsWith('/') || req.url.startsWith('//') ||
        !['GET', 'HEAD'].includes(req.method) || /^\/(?:api|monitoring|ingest)(?:[/?]|$)/.test(req.url)) {
      res.writeHead(403, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({message: 'The local Studio test server serves pages and assets only.'}));
      return;
    }
    handle(req, res);
  });
  server.on('connect', (_req, socket) => socket.destroy());
  server.listen(port, '127.0.0.1');
});
