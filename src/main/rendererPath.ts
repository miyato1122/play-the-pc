/**
 * 画面ファイルの解決。
 *
 * file:// のままだと ES モジュールが CORS で読めないため、独自スキーム(app://)で配信する。
 * ここはその URL → 実ファイルの対応付けだけを行う純粋な関数（Electron に依存しない）。
 */

import path from 'node:path';

/** 拡張子から Content-Type を決める（配信するのは自前のファイルだけ）。 */
export function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.json':
    case '.map':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

export const RENDERER_SCHEME = 'app';
export const RENDERER_HOST = 'play';
export const RENDERER_ENTRY_URL = `${RENDERER_SCHEME}://${RENDERER_HOST}/renderer/index.html`;

/**
 * URL のパス部分を、配信ルート配下の実ファイルパスへ変換する。
 * ルートの外に出る指定（../ など）は null を返して拒否する。
 */
export function resolveRendererFile(root: string, urlPathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPathname);
  } catch {
    return null;
  }

  const relative = decoded === '/' || decoded === '' ? '/renderer/index.html' : decoded;

  // 「..」を含む指定は、正規化すると root 内に収まってしまい判別できなくなるため先に弾く
  if (relative.split(/[\\/]/).includes('..')) return null;

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, `.${path.posix.normalize(relative)}`);

  // 保険：正規化の結果が万一 root の外に出ていたら拒否する
  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) return null;
  return target;
}
