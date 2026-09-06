declare module 'wav' {
  import { Writable, Readable } from 'stream';

  export interface WriterOptions {
    channels?: number;
    sampleRate?: number;
    bitDepth?: number;
  }

  export class Writer extends Writable {
    constructor(options?: WriterOptions);
  }

  export class Reader extends Readable {
    constructor();
  }

  const wav: {
    Writer: typeof Writer;
    Reader: typeof Reader;
  };

  export default wav;
}
