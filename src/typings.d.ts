// Ambient declarations for test globals to satisfy TypeScript checks during build
declare function describe(description: string, spec: () => void): void;
declare function it(description: string, test: (...args: any[]) => any): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
declare function expect(actual: any): any;
declare const expectAsync: any;
declare function spyOn(obj: any, method: string): any;
