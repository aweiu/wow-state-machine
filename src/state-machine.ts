import PromiseInterval from './promise-interval'

type DataOrPromiseData<T> = T | Promise<T>
type Publisher<T> = () => DataOrPromiseData<T>
type Subscriber = () => any
type OnTick<T> = (
  state: T,
  lastState: T | undefined,
  isFirstTick: boolean,
) => any
type OnError = (e: Error) => any
type OnTimeout<T> = (state: T) => any

export default class StateMachine<T extends string | number> {
  private publisher: Publisher<T>
  private onTickCallback?: OnTick<T>
  private onErrorCallback?: OnError
  private onTimeoutCallback?: OnTimeout<T>
  private mainLoop?: PromiseInterval
  private lastState?: T
  private states: any = {}
  private runners: Array<StateMachine<any> | PromiseInterval> = []
  private timeoutChecker: number[] = []

  constructor(publisher: Publisher<T>) {
    this.publisher = publisher
  }

  private errorHandle(e: Error) {
    this.stop()
    if (this.onErrorCallback) this.onErrorCallback(e)
    else throw e
  }

  private timeoutHandle(state: T) {
    this.stop()
    if (this.onTimeoutCallback) this.onTimeoutCallback(state)
    else throw Error(`state: ${state}超时`)
  }

  private startTimeoutChecker(state: T, ms: number) {
    if (ms) {
      this.timeoutChecker.push(setTimeout(() => this.timeoutHandle(state), ms))
    }
  }

  private stopTimeoutChecker() {
    for (let checker of this.timeoutChecker) clearTimeout(checker)
    this.timeoutChecker = []
  }

  private startRunner(
    stateMachineOrSubscriber: StateMachine<any> | Subscriber,
    tick: number,
  ) {
    if (stateMachineOrSubscriber instanceof StateMachine) {
      try {
        stateMachineOrSubscriber.onError((e) => this.errorHandle(e))
      } catch (e) {
        /* tslint:disable:no-empty */
      }
      try {
        stateMachineOrSubscriber.onTimeout((state) => this.onTimeout(state))
      } catch (e) {
        /* tslint:disable:no-empty */
      }
      stateMachineOrSubscriber.start(tick)
      this.runners.push(stateMachineOrSubscriber)
    } else {
      const runner = new PromiseInterval(tick)
      runner.start(stateMachineOrSubscriber, (e) => this.errorHandle(e))
      this.runners.push(runner)
    }
  }

  private stopRunner() {
    for (let runner of this.runners) runner.stop()
    this.runners = []
  }

  private async publish(isFirstTick: boolean) {
    let state: T = await this.publisher()
    if (this.onTickCallback)
      await this.onTickCallback(state, this.lastState, isFirstTick)
    if (this.lastState !== state) {
      this.lastState = state
      this.stopRunner()
      this.stopTimeoutChecker()
      if (this.states.hasOwnProperty(state)) {
        const subscribers: [Subscriber, number, number][] = (this
          .states as any)[state]
        for (let [subscriber, timeout, tick] of subscribers) {
          this.startTimeoutChecker(state, timeout)
          if (tick === -Infinity) {
            await subscriber()
            this.stopTimeoutChecker()
          } else this.startRunner(subscriber, tick)
        }
      }
    }
  }

  on(
    state: T,
    stateMachineOrSubscriber: StateMachine<any> | Subscriber,
    timeout = 0,
    tick = 200,
  ) {
    if (!this.states.hasOwnProperty(state)) this.states[state] = []
    this.states[state].push([stateMachineOrSubscriber, timeout, tick])
    return this
  }

  onTick(callback: OnTick<T>) {
    if (this.onTickCallback) throw Error('just allow one TickHandler')
    this.onTickCallback = callback
    return this
  }

  onError(callback: OnError) {
    if (this.onErrorCallback) throw Error('just allow one ErrorHandler')
    this.onErrorCallback = callback
    return this
  }

  onTimeout(callback: OnTimeout<T>) {
    if (this.onTimeoutCallback) throw Error('just allow one TimeoutHandler')
    this.onTimeoutCallback = callback
    return this
  }

  start(tick: number = 200) {
    let isFirstTick = true
    this.lastState = undefined
    this.mainLoop = new PromiseInterval(tick)
    this.mainLoop.start(
      () => {
        const _isFirstTick = isFirstTick
        if (isFirstTick) isFirstTick = false
        return this.publish(_isFirstTick)
      },
      (e) => this.errorHandle(e),
    )
  }

  stop() {
    if (this.mainLoop) this.mainLoop.stop()
    this.stopRunner()
    this.stopTimeoutChecker()
  }
}
