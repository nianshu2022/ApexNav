export async function readLimitedText(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('远程响应过大');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(result);
}

// Parse the fixed provider's suggestion array as JSON data; never execute its JSONP response.
export function parseSuggestions(source: string): string[] {
  const array = source.match(/["']?s["']?\s*:\s*(\[(?:\s*"(?:\\.|[^"\\])*"\s*,?)*\])/);
  if (!array) return [];
  try { return JSON.parse(array[1]).filter((item: unknown) => typeof item === 'string' && item.length <= 200).slice(0, 5); }
  catch { return []; }
}
