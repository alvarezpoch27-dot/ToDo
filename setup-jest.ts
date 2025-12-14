// Minimal Jest setup (avoid jest-preset-angular dependency)

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock crypto para pruebas
if (typeof (global as any).self === 'undefined') {
  (global as any).self = global;
}

Object.defineProperty((global as any).self, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => 'test-uuid-1234'),
    subtle: {
      importKey: jest.fn(async (_format: any, key: ArrayBuffer) => {
        return { __rawKey: Array.from(new Uint8Array(key)) };
      }),
      deriveBits: jest.fn(async (params: any, keyObj: any, length: number) => {
        const keyBytes: number[] = keyObj?.__rawKey || [];
        const saltBytes: number[] = params?.salt ? Array.from(new Uint8Array(params.salt)) : [];
        const bytes = new Uint8Array(length / 8);
        for (let i = 0; i < bytes.length; i++) {
          const kb = keyBytes.length ? keyBytes[i % keyBytes.length] : 0;
          const sb = saltBytes.length ? saltBytes[i % saltBytes.length] : i;
          bytes[i] = (kb ^ sb) & 0xff;
        }
        return bytes.buffer;
      }),
      digest: jest.fn(async () => new ArrayBuffer(32)),
    },
  },
});
