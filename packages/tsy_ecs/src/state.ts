import { Component } from './component'
import {
  BaseRunCriteria,
  RunCriteria,
  ShouldRun,
} from './run-criteria'
import {
  IntoSystemDescriptor,
  SystemDescriptor,
} from './system'
import {
  Class,
  Maybe,
  WithType,
} from './utilities'
import { World } from './world'

const enum OperationType {
  Set,
  Replace,
  Push,
  Pop,
}

export interface SetOperation<T> {
  type: OperationType.Set
  state: T
}

export interface ReplaceOperation<T> {
  type: OperationType.Replace
  state: T
}

export interface PushOperation<T> {
  type: OperationType.Push
  state: T
}

export interface PopOperation {
  type: OperationType.Pop
}

export type ScheduledOperation<T> =
| SetOperation<T>
| ReplaceOperation<T>
| PushOperation<T>
| PopOperation

export const enum TransitionType {
  PreStartup,
  Startup,
  ExitingToResume,
  ExitingFull,
  Entering,
  Resuming,
  Pausing,
}

export interface PreStartup {
  type: TransitionType.PreStartup
}

export interface Startup {
  type: TransitionType.Startup
}

export interface ExitingToResume<T> {
  type: TransitionType.ExitingToResume
  leaving: T
  entering: T
}

export interface ExitingFull<T> {
  type: TransitionType.ExitingFull
  leaving: T
  entering: T
}

export interface Entering<T> {
  type: TransitionType.Entering
  leaving: T
  entering: T
}

export interface Resuming<T> {
  type: TransitionType.Resuming
  leaving: T
  entering: T
}

export interface Pausing<T> {
  type: TransitionType.Pausing
  leaving: T
  entering: T
}

export type StateTransition<T> =
| PreStartup
| Startup
| ExitingToResume<T>
| ExitingFull<T>
| Entering<T>
| Resuming<T>
| Pausing<T>

function shouldRunAdapter(endNextLoop: boolean, value: boolean): ShouldRun {
  if (endNextLoop) {
    return ShouldRun.No
  }

  return value ? ShouldRun.YesAndCheckAgain : ShouldRun.NoAndCheckAgain
}

function pipe(...fns: ((...args: any[]) => any)[]): (...args: any[]) => any {
  return fns.reduce((prev, next) => (...args: any[]) => next(prev(...args)))
}

function converge<TResult>(
  converging: (...args: any[]) => TResult,
  branches: ((...args: any[]) => any)[],
): (...args: any[]) => TResult {
  return (...args: any[]) => converging(...branches.map(fn => fn(...args)))
}

function getState<T>(label: string) {
  return (world: World): State<T> => {
    return world.getResource<State<T>>(State.withLabel(label))!
  }
}

function getEndNextLoop<T>(state: State<T>) {
  return state.endNextLoop
}

export class State<T> extends Component {
  public static onUpdate<T>(label: string, value: T): RunCriteria {
    return new BaseRunCriteria().set(
      pipe(
        getState<T>(label),
        converge(
          shouldRunAdapter,
          [
            getEndNextLoop,
            (state: State<T>) => {
              return state.current === value && !state.isTransitioning
            },
          ]
        )
      )
    )
  }

  public static onEnter<T>(label: string, value: T): RunCriteria {
    return new BaseRunCriteria().set(
      pipe(
        getState<T>(label),
        converge(
          shouldRunAdapter,
          [
            getEndNextLoop,
            (state: State<T>) => {
              switch (state.transition?.type) {
                case TransitionType.Entering: {
                  return state.transition.entering === value
                }
                default: return false
              }
            },
          ],
        )
      )
    )
  }

  public static onExit<T>(label: string, value: T): RunCriteria {
    return new BaseRunCriteria().set(
      pipe(
        getState<T>(label),
        converge(
          shouldRunAdapter,
          [
            getEndNextLoop,
            (state: State<T>) => {
              switch (state.transition?.type) {
                case TransitionType.ExitingToResume:
                case TransitionType.ExitingFull: {
                  return state.transition.leaving === value
                }
                default: return false
              }
            },
          ],
        )
      )
    )
  }

  public static onPause<T>(label: string, value: T): RunCriteria {
    return new BaseRunCriteria().set(
      pipe(
        getState<T>(label),
        converge(
          shouldRunAdapter,
          [
            getEndNextLoop,
            (state: State<T>) => {
              switch (state.transition?.type) {
                case TransitionType.Pausing: {
                  return state.transition.leaving === value
                }
                default: return false
              }
            },
          ],
        )
      )
    )
  }

  public static onResume<T>(label: string, value: T): RunCriteria {
    return new BaseRunCriteria().set(
      pipe(
        getState<T>(label),
        converge(
          shouldRunAdapter,
          [
            getEndNextLoop,
            (state: State<T>) => {
              switch (state.transition?.type) {
                case TransitionType.Resuming: {
                  return state.transition.entering === value
                }
                default: {
                  return false
                }
              }
            },
          ],
        )
      )
    )
  }

  public static getDriver<T>(label: string): IntoSystemDescriptor {
    const noop = () => {}
    function driver(world: World): ShouldRun {
      const state: State<T> = world.getResource(State.withLabel(label))!

      return state.update()
    }

    return new SystemDescriptor(
      noop,
      new BaseRunCriteria().set(driver)
    )
  }

  public static withLabel(label: string): WithType & Class<any> {
    return class {
      public static type = `${State.name}<${label}>`
    }
  }

  private stack: T[]
  private transition: Maybe<StateTransition<T>>
  private scheduled: Maybe<ScheduledOperation<T>>
  private prepareExit = false

  public endNextLoop = false

  public get type(): string {
    return `${this.constructor.name}<${this.label}>`
  }

  public get current(): T {
    return this.stack[this.stack.length - 1]
  }

  public get isTransitioning(): boolean {
    return this.transition !== undefined
  }

  public constructor(
    private readonly label: string,
    initial: T,
  ) {
    super()

    this.stack = [initial]
  }

  public set(value: T): void {
    if (this.current !== value && this.scheduled === undefined) {
      this.scheduled = {
        type: OperationType.Set,
        state: value,
      }
    }
  }

  public replace(value: T): void {
    if (this.current !== value && this.scheduled === undefined) {
      this.scheduled = {
        type: OperationType.Replace,
        state: value,
      }
    }
  }

  public push(value: T): void {
    if (this.current !== value && this.scheduled === undefined) {
      this.scheduled = {
        type: OperationType.Push,
        state: value,
      }
    }
  }

  public pop(): void {
    if (this.scheduled === undefined && this.stack.length > 1) {
      this.scheduled = {
        type: OperationType.Pop,
      }
    }
  }

  private update(): ShouldRun {
    if (this.prepareExit) {
      this.prepareExit = false
      if (this.scheduled === undefined) {
        this.endNextLoop = true

        return ShouldRun.YesAndCheckAgain
      }
    } else if (this.endNextLoop) {
      this.endNextLoop = false

      return ShouldRun.No
    }

    const { scheduled } = this

    this.scheduled = undefined

    switch (scheduled?.type) {
      case OperationType.Set: {
        const { state: entering } = scheduled
        const leaving = this.stack.pop()!

        this.transition = {
          type: TransitionType.ExitingFull,
          leaving,
          entering,
        }
        break
      }
      case OperationType.Replace: {
        const { state: entering } = scheduled

        if (this.stack.length <= 1) {
          const leaving = this.stack.pop()!

          this.transition = {
            type: TransitionType.ExitingFull,
            leaving,
            entering,
          }
        } else {
          const { transition } = this

          this.transition = undefined

          this.scheduled = {
            type: OperationType.Replace,
            state: entering,
          }

          switch (transition?.type) {
            case TransitionType.ExitingToResume: {
              this.stack.pop()

              this.transition = {
                type: TransitionType.Resuming,
                leaving: transition.leaving,
                entering: transition.entering,
              }

              break
            }
            default: {
              this.transition = {
                type: TransitionType.ExitingToResume,
                leaving: this.stack[this.stack.length - 1],
                entering: this.stack[this.stack.length - 2],
              }

              break
            }
          }
        }
        break
      }
      case OperationType.Push: {
        const { state: entering } = scheduled

        this.transition = {
          type: TransitionType.Pausing,
          leaving: this.current,
          entering,
        }

        break
      }
      case OperationType.Pop: {
        this.transition = {
          type: TransitionType.ExitingToResume,
          leaving: this.stack[this.stack.length - 1],
          entering: this.stack[this.stack.length - 2],
        }

        break
      }
      default: {
        const { transition } = this

        this.transition = undefined

        switch (transition?.type) {
          case TransitionType.ExitingFull: {
            const {
              leaving,
              entering,
            } = transition

            this.transition = {
              type: TransitionType.Entering,
              leaving,
              entering,
            }

            this.stack[this.stack.length - 1] = entering

            break
          }
          case TransitionType.Pausing: {
            const {
              leaving,
              entering,
            } = transition

            this.transition = {
              type: TransitionType.Entering,
              leaving,
              entering,
            }

            this.stack.push(entering)

            break
          }
          case TransitionType.ExitingToResume: {
            const {
              leaving,
              entering,
            } = transition

            this.stack.pop()

            this.transition = {
              type: TransitionType.Resuming,
              leaving,
              entering,
            }

            break
          }
          case TransitionType.PreStartup: {
            this.transition = {
              type: TransitionType.Startup,
            }

            break
          }
          default: {}
        }

        break
      }
    }

    if (this.transition === undefined) {
      this.prepareExit = true
    }

    return ShouldRun.YesAndCheckAgain
  }
}
