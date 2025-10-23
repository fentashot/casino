export async function computeHmacHex(serverSeedHex: string, clientSeed: string, nonce: number): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', hexToBytes(serverSeedHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${clientSeed}:${nonce}`));
  return bytesToHex(new Uint8Array(sig));
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  return arr;
}
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}


export function hashHexToNumber(hashHex: string): number {
  const val = parseInt(hashHex.substring(0, 8), 16);
  return val % 37;
}