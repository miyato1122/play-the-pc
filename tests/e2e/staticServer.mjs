// dist/ を配信するだけの小さな静的サーバー。
// file:// のままだと ES モジュールが CORS で読めないため、E2E では http で配信する
// （本番の Electron は同じ理由で独自スキーム app:// を使う）。

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

export async function startStaticServer(root) {
  const resolvedRoot = path.resolve(root);

  const server = http.createServer((request, response) => {
    const urlPath = new URL(request.url ?? '/', 'http://localhost').pathname;
    const relative = urlPath === '/' ? '/renderer/index.html' : urlPath;

    if (relative.split('/').includes('..')) {
      response.writeHead(403).end('forbidden');
      return;
    }

    const filePath = path.join(resolvedRoot, relative);
    if (!filePath.startsWith(resolvedRoot + path.sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404).end('not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      });
      response.end(data);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
