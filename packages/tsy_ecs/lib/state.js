"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TransitionType = exports.State = void 0;

var _component = require("./component");

var _runCriteria = require("./run-criteria");

var _system = require("./system");

var OperationType;

(function (OperationType) {
  OperationType[OperationType["Set"] = 0] = "Set";
  OperationType[OperationType["Replace"] = 1] = "Replace";
  OperationType[OperationType["Push"] = 2] = "Push";
  OperationType[OperationType["Pop"] = 3] = "Pop";
})(OperationType || (OperationType = {}));

let TransitionType;
exports.TransitionType = TransitionType;

(function (TransitionType) {
  TransitionType[TransitionType["PreStartup"] = 0] = "PreStartup";
  TransitionType[TransitionType["Startup"] = 1] = "Startup";
  TransitionType[TransitionType["ExitingToResume"] = 2] = "ExitingToResume";
  TransitionType[TransitionType["ExitingFull"] = 3] = "ExitingFull";
  TransitionType[TransitionType["Entering"] = 4] = "Entering";
  TransitionType[TransitionType["Resuming"] = 5] = "Resuming";
  TransitionType[TransitionType["Pausing"] = 6] = "Pausing";
})(TransitionType || (exports.TransitionType = TransitionType = {}));

function shouldRunAdapter(endNextLoop, value) {
  if (endNextLoop) {
    return _runCriteria.ShouldRun.No;
  }

  return value ? _runCriteria.ShouldRun.YesAndCheckAgain : _runCriteria.ShouldRun.NoAndCheckAgain;
}

function pipe(...fns) {
  return fns.reduce((prev, next) => (...args) => next(prev(...args)));
}

function converge(converging, branches) {
  return (...args) => converging(...branches.map(fn => fn(...args)));
}

function getState(label) {
  return world => {
    return world.getResource(State.withLabel(label));
  };
}

function getEndNextLoop(state) {
  return state.endNextLoop;
}

class State extends _component.Component {
  static onUpdate(label, value) {
    return new _runCriteria.BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      return state.current === value && !state.isTransitioning;
    }])));
  }

  static onEnter(label, value) {
    return new _runCriteria.BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      var _state$transition;

      switch ((_state$transition = state.transition) === null || _state$transition === void 0 ? void 0 : _state$transition.type) {
        case TransitionType.Entering:
          {
            return state.transition.entering === value;
          }

        default:
          return false;
      }
    }])));
  }

  static onExit(label, value) {
    return new _runCriteria.BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      var _state$transition2;

      switch ((_state$transition2 = state.transition) === null || _state$transition2 === void 0 ? void 0 : _state$transition2.type) {
        case TransitionType.ExitingToResume:
        case TransitionType.ExitingFull:
          {
            return state.transition.leaving === value;
          }

        default:
          return false;
      }
    }])));
  }

  static onPause(label, value) {
    return new _runCriteria.BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      var _state$transition3;

      switch ((_state$transition3 = state.transition) === null || _state$transition3 === void 0 ? void 0 : _state$transition3.type) {
        case TransitionType.Pausing:
          {
            return state.transition.leaving === value;
          }

        default:
          return false;
      }
    }])));
  }

  static onResume(label, value) {
    return new _runCriteria.BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      var _state$transition4;

      switch ((_state$transition4 = state.transition) === null || _state$transition4 === void 0 ? void 0 : _state$transition4.type) {
        case TransitionType.Resuming:
          {
            return state.transition.entering === value;
          }

        default:
          {
            return false;
          }
      }
    }])));
  }

  static getDriver(label) {
    const noop = () => {};

    function driver(world) {
      const state = world.getResource(State.withLabel(label));
      return state.update();
    }

    return new _system.SystemDescriptor(noop, new _runCriteria.BaseRunCriteria().set(driver));
  }

  static withLabel(label) {
    return class {
      static type = `${State.name}<${label}>`;
    };
  }

  prepareExit = false;
  endNextLoop = false;

  get type() {
    return `${this.constructor.name}<${this.label}>`;
  }

  get current() {
    return this.stack[this.stack.length - 1];
  }

  get isTransitioning() {
    return this.transition !== undefined;
  }

  constructor(label, initial) {
    super();
    this.label = label;
    this.stack = [initial];
  }

  set(value) {
    if (this.current !== value && this.scheduled === undefined) {
      this.scheduled = {
        type: OperationType.Set,
        state: value
      };
    }
  }

  replace(value) {
    if (this.current !== value && this.scheduled === undefined) {
      this.scheduled = {
        type: OperationType.Replace,
        state: value
      };
    }
  }

  push(value) {
    if (this.current !== value && this.scheduled === undefined) {
      this.scheduled = {
        type: OperationType.Push,
        state: value
      };
    }
  }

  pop() {
    if (this.scheduled === undefined && this.stack.length > 1) {
      this.scheduled = {
        type: OperationType.Pop
      };
    }
  }

  update() {
    if (this.prepareExit) {
      this.prepareExit = false;

      if (this.scheduled === undefined) {
        this.endNextLoop = true;
        return _runCriteria.ShouldRun.YesAndCheckAgain;
      }
    } else if (this.endNextLoop) {
      this.endNextLoop = false;
      return _runCriteria.ShouldRun.No;
    }

    const {
      scheduled
    } = this;
    this.scheduled = undefined;

    switch (scheduled === null || scheduled === void 0 ? void 0 : scheduled.type) {
      case OperationType.Set:
        {
          const {
            state: entering
          } = scheduled;
          const leaving = this.stack.pop();
          this.transition = {
            type: TransitionType.ExitingFull,
            leaving,
            entering
          };
          break;
        }

      case OperationType.Replace:
        {
          const {
            state: entering
          } = scheduled;

          if (this.stack.length <= 1) {
            const leaving = this.stack.pop();
            this.transition = {
              type: TransitionType.ExitingFull,
              leaving,
              entering
            };
          } else {
            const {
              transition
            } = this;
            this.transition = undefined;
            this.scheduled = {
              type: OperationType.Replace,
              state: entering
            };

            switch (transition === null || transition === void 0 ? void 0 : transition.type) {
              case TransitionType.ExitingToResume:
                {
                  this.stack.pop();
                  this.transition = {
                    type: TransitionType.Resuming,
                    leaving: transition.leaving,
                    entering: transition.entering
                  };
                  break;
                }

              default:
                {
                  this.transition = {
                    type: TransitionType.ExitingToResume,
                    leaving: this.stack[this.stack.length - 1],
                    entering: this.stack[this.stack.length - 2]
                  };
                  break;
                }
            }
          }

          break;
        }

      case OperationType.Push:
        {
          const {
            state: entering
          } = scheduled;
          this.transition = {
            type: TransitionType.Pausing,
            leaving: this.current,
            entering
          };
          break;
        }

      case OperationType.Pop:
        {
          this.transition = {
            type: TransitionType.ExitingToResume,
            leaving: this.stack[this.stack.length - 1],
            entering: this.stack[this.stack.length - 2]
          };
          break;
        }

      default:
        {
          const {
            transition
          } = this;
          this.transition = undefined;

          switch (transition === null || transition === void 0 ? void 0 : transition.type) {
            case TransitionType.ExitingFull:
              {
                const {
                  leaving,
                  entering
                } = transition;
                this.transition = {
                  type: TransitionType.Entering,
                  leaving,
                  entering
                };
                this.stack[this.stack.length - 1] = entering;
                break;
              }

            case TransitionType.Pausing:
              {
                const {
                  leaving,
                  entering
                } = transition;
                this.transition = {
                  type: TransitionType.Entering,
                  leaving,
                  entering
                };
                this.stack.push(entering);
                break;
              }

            case TransitionType.ExitingToResume:
              {
                const {
                  leaving,
                  entering
                } = transition;
                this.stack.pop();
                this.transition = {
                  type: TransitionType.Resuming,
                  leaving,
                  entering
                };
                break;
              }

            case TransitionType.PreStartup:
              {
                this.transition = {
                  type: TransitionType.Startup
                };
                break;
              }

            default:
              {}
          }

          break;
        }
    }

    if (this.transition === undefined) {
      this.prepareExit = true;
    }

    return _runCriteria.ShouldRun.YesAndCheckAgain;
  }

}

exports.State = State;