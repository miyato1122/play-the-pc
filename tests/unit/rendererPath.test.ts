import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveRendererFile } from '../../src/main/rendererPath.js';

const ROOT = path.resolve('/app/dist');

describe('resolveRendererFile', () => {
  it('通常のパスを配信ルート配下に解決する', () => {
    expect(resolveRendererFile(ROOT, '/renderer/index.html')).toBe(
      path.join(ROOT, 'renderer', 'index.html'),
    );
    expect(resolveRendererFile(ROOT, '/core/scene.js')).toBe(
      path.join(ROOT, 'core', 'scene.js'),
    );
  });

  it('ルート指定は入口の HTML になる', () => {
    expect(resolveRendererFile(ROOT, '/')).toBe(path.join(ROOT, 'renderer', 'index.html'));
    expect(resolveRendererFile(ROOT, '')).toBe(path.join(ROOT, 'renderer', 'index.html'));
  });

  it('ルートの外へ出ようとするパスは拒否する', () => {
    expect(resolveRendererFile(ROOT, '/../../etc/passwd')).toBeNull();
    expect(resolveRendererFile(ROOT, '/renderer/../../secret.txt')).toBeNull();
    expect(resolveRendererFile(ROOT, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
  });

  it('壊れたパーセントエンコードは拒否する', () => {
    expect(resolveRendererFile(ROOT, '/%')).toBeNull();
  });

  it('エンコードされた日本語ファイル名も解決できる', () => {
    expect(resolveRendererFile(ROOT, '/renderer/%E3%81%82.js')).toBe(
      path.join(ROOT, 'renderer', 'あ.js'),
    );
  });
});
