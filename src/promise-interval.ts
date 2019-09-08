import setPromiseInterval, { clearPromiseInterval } from 'set-promise-interval'

type PromiseFun = () => Promise<any>

export default class PromiseInterval {
  private ms: number
  private timer?: number

  constructor(ms: number) {
    this.ms = ms
  }

  start(promiseFun: PromiseFun, onError?: (e: Error) => any) {
    if (this.timer === undefined) {
      this.timer = setPromiseInterval(async () => {
        try {
          await promiseFun()
        } catch (e) {
          this.stop()
          if (onError) onError(e)
          else throw e
        }
      }, this.ms)
    }
  }

  stop() {
    clearPromiseInterval(this.timer)
    this.timer = undefined
  }
}
