declare type PromiseFun = () => Promise<any>;
export default class PromiseInterval {
    private ms;
    private timer?;
    constructor(ms: number);
    start(promiseFun: PromiseFun, onError?: (e: Error) => any): void;
    stop(): void;
}
export {};
