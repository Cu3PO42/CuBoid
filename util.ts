export class CachedPromise<T> {
    private _res: T;
    private _promise: Promise<T>;
    private _ready = false;

    public constructor(promise: Promise<T> | (() => Promise<T>)) {
        if (!(promise instanceof Promise)) promise = promise();
        this._promise = promise.then(r => this._res = r);
    }

    public async value() {
        if (!this._ready) await this._promise;
        return this._res;
    }
}

export function promisify<T>(fn: (cb: (err: Error, res?: T) => void) => void): () => Promise<T>;
export function promisify<T, A1>(fn: (arg1: A1, cb: (err: Error, res?: T) => void) => void): (arg1: A1) => Promise<T>;
export function promisify<T, A1, A2>(fn: (arg1: A1, arg2: A2, cb: (err: Error, res?: T) => void) => void): (arg1: A1, arg2: A2) => Promise<T>;
export function promisify<T, A1, A2, A3>(fn: (arg1: A1, arg2: A2, arg3: A3, cb: (err: Error, res?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3) => Promise<T>;
export function promisify<T, A1, A2, A3, A4>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, cb: (err: Error, res?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;
export function promisify<T, A1, A2, A3, A4, A5>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, cb: (err: Error, res?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Promise<T>;
export function promisify<T, A1, A2, A3, A4, A5, A6>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, cb: (err: Error, res?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => Promise<T>;
export function promisify<T, A1, A2, A3, A4, A5, A6, A7>(fn: (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7, cb: (err: Error, res?: T) => void) => void): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6, arg7: A7) => Promise<T>;
export function promisify(fn: Function) {
    return function(...args: any[]) {
        return new Promise(function(resolve, reject) {
            fn(...args, function(err: Error, res: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    };
}