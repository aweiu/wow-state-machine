"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promise_interval_1 = require("./promise-interval");
class StateMachine {
    constructor(publisher) {
        this.states = {};
        this.runners = [];
        this.timeoutChecker = [];
        this.publisher = publisher;
    }
    errorHandle(e) {
        this.stop();
        if (this.onErrorCallback)
            this.onErrorCallback(e);
        else
            throw e;
    }
    timeoutHandle(state) {
        this.stop();
        if (this.onTimeoutCallback)
            this.onTimeoutCallback(state);
        else
            throw Error(`state: ${state}超时`);
    }
    startTimeoutChecker(state, ms) {
        if (ms) {
            this.timeoutChecker.push(setTimeout(() => this.timeoutHandle(state), ms));
        }
    }
    stopTimeoutChecker() {
        for (let checker of this.timeoutChecker)
            clearTimeout(checker);
        this.timeoutChecker = [];
    }
    startRunner(stateMachineOrSubscriber, tick) {
        if (stateMachineOrSubscriber instanceof StateMachine) {
            try {
                stateMachineOrSubscriber.onError((e) => this.errorHandle(e));
            }
            catch (e) {
                /* tslint:disable:no-empty */
            }
            try {
                stateMachineOrSubscriber.onTimeout((state) => this.onTimeout(state));
            }
            catch (e) {
                /* tslint:disable:no-empty */
            }
            stateMachineOrSubscriber.start(tick);
            this.runners.push(stateMachineOrSubscriber);
        }
        else {
            const runner = new promise_interval_1.default(tick);
            runner.start(stateMachineOrSubscriber, (e) => this.errorHandle(e));
            this.runners.push(runner);
        }
    }
    stopRunner() {
        for (let runner of this.runners)
            runner.stop();
        this.runners = [];
    }
    async publish(isFirstTick) {
        let state = await this.publisher();
        if (this.onTickCallback)
            await this.onTickCallback(state, this.lastState, isFirstTick);
        if (this.lastState !== state) {
            this.lastState = state;
            this.stopRunner();
            this.stopTimeoutChecker();
            if (this.states.hasOwnProperty(state)) {
                const subscribers = this
                    .states[state];
                for (let [subscriber, timeout, tick] of subscribers) {
                    this.startTimeoutChecker(state, timeout);
                    if (tick === -Infinity) {
                        await subscriber();
                        this.stopTimeoutChecker();
                    }
                    else
                        this.startRunner(subscriber, tick);
                }
            }
        }
    }
    on(state, stateMachineOrSubscriber, timeout = 0, tick = 200) {
        if (!this.states.hasOwnProperty(state))
            this.states[state] = [];
        this.states[state].push([stateMachineOrSubscriber, timeout, tick]);
        return this;
    }
    onTick(callback) {
        if (this.onTickCallback)
            throw Error('just allow one TickHandler');
        this.onTickCallback = callback;
        return this;
    }
    onError(callback) {
        if (this.onErrorCallback)
            throw Error('just allow one ErrorHandler');
        this.onErrorCallback = callback;
        return this;
    }
    onTimeout(callback) {
        if (this.onTimeoutCallback)
            throw Error('just allow one TimeoutHandler');
        this.onTimeoutCallback = callback;
        return this;
    }
    start(tick = 200) {
        let isFirstTick = true;
        this.lastState = undefined;
        this.mainLoop = new promise_interval_1.default(tick);
        this.mainLoop.start(() => {
            const _isFirstTick = isFirstTick;
            if (isFirstTick)
                isFirstTick = false;
            return this.publish(_isFirstTick);
        }, (e) => this.errorHandle(e));
    }
    stop() {
        if (this.mainLoop)
            this.mainLoop.stop();
        this.stopRunner();
        this.stopTimeoutChecker();
    }
}
exports.default = StateMachine;
