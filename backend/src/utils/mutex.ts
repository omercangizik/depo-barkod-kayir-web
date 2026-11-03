class Mutex {
  private queue: Promise<void> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn, fn);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

const barcodeLocks = new Map<string, Mutex>();
const sheetLock = new Mutex();

function barcodeMutex(barcode: string): Mutex {
  const key = barcode.trim();
  let mutex = barcodeLocks.get(key);
  if (!mutex) {
    mutex = new Mutex();
    barcodeLocks.set(key, mutex);
  }
  return mutex;
}

export function withBarcodeLock<T>(barcode: string, fn: () => Promise<T>): Promise<T> {
  return barcodeMutex(barcode).run(fn);
}

export function withSheetLock<T>(fn: () => Promise<T>): Promise<T> {
  return sheetLock.run(fn);
}
