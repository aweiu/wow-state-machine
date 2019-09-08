"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const set_promise_interval_1 = require("set-promise-interval");
class PromiseInterval {
    constructor(ms) {
        this.ms = ms;
    }
    start(promiseFun, onError) {
        if (this.timer === undefined) {
            this.timer = set_promise_interval_1.default(async () => {
                try {
                    await promiseFun();
                }
                catch (e) {
                    this.stop();
                    if (onError)
                        onError(e);
                    else
                        throw e;
                }
            }, this.ms);
        }
    }
    stop() {
        set_promise_interval_1.clearPromiseInterval(this.timer);
        this.timer = undefined;
    }
}
exports.default = PromiseInterval;
