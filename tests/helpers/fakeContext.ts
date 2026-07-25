/**
 * CanvasRenderingContext2D の偽物。
 * core/ の描画コードは ctx を引数で受け取るだけなので、これで DOM 無しに検証できる。
 */

export interface FakeContext {
  ctx: CanvasRenderingContext2D;
  /** 呼ばれたメソッド名の履歴 */
  calls: string[];
  /** 代入されたプロパティの最後の値 */
  props: Record<string, unknown>;
  countOf(method: string): number;
}

export function createFakeContext(): FakeContext {
  const calls: string[] = [];
  const props: Record<string, unknown> = {};
  const gradient = {
    addColorStop: () => {
      calls.push('addColorStop');
    },
  };

  const proxy = new Proxy(
    {},
    {
      get(_target, property) {
        const name = String(property);
        if (name in props) return props[name];
        if (name === 'createLinearGradient' || name === 'createRadialGradient') {
          return () => {
            calls.push(name);
            return gradient;
          };
        }
        return (...args: unknown[]) => {
          calls.push(name);
          // 数値が NaN のまま描画に渡ると Canvas は黙って何も描かないので、ここで捕まえる
          for (const arg of args) {
            if (typeof arg === 'number' && !Number.isFinite(arg)) {
              throw new Error(`${name}() が有限でない数値を受け取りました: ${String(arg)}`);
            }
          }
        };
      },
      set(_target, property, value) {
        if (typeof value === 'number' && !Number.isFinite(value)) {
          throw new Error(`ctx.${String(property)} に有限でない数値が代入されました`);
        }
        props[String(property)] = value;
        return true;
      },
    },
  ) as CanvasRenderingContext2D;

  return {
    ctx: proxy,
    calls,
    props,
    countOf: (method: string) => calls.filter((call) => call === method).length,
  };
}
