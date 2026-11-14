declare module 'global' {
  export interface TextEditSignal {
    on(callback: (...args: unknown[]) => void): void;
    off(callback: (...args: unknown[]) => void): void;
  }

  export class Global {
    textEditFinished: TextEditSignal;
    startTextEdit(config: string): unknown;
    closeTextEdit(uuid: string): void;
    [key: string]: unknown;
  }

  const globalModule: { Global: typeof Global };
  export default globalModule;
}
