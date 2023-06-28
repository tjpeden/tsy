"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SystemSet = void 0;

var _state = require("./state");

var _system = require("./system");

class SystemSet {
  static onUpdate(label, value) {
    return new SystemSet().withRunCriteria(_state.State.onUpdate(label, value));
  }

  static onEnter(label, value) {
    return new SystemSet().withRunCriteria(_state.State.onEnter(label, value));
  }

  static onExit(label, value) {
    return new SystemSet().withRunCriteria(_state.State.onExit(label, value));
  }

  static onPause(label, value) {
    return new SystemSet().withRunCriteria(_state.State.onPause(label, value));
  }

  static onResume(label, value) {
    return new SystemSet().withRunCriteria(_state.State.onResume(label, value));
  }

  systems = new Set();

  withRunCriteria(runCriteria) {
    this.runCriteria = runCriteria;
    return this;
  }

  withSystem(system) {
    this.systems.add(system);
    return this;
  }

  bake() {
    const {
      systems,
      runCriteria
    } = this;
    return [...systems].map(system => {
      if (system instanceof _system.SystemDescriptor) {
        if (runCriteria) {
          system.runCriteria = runCriteria;
        }

        return system;
      }

      return new _system.SystemDescriptor(system, runCriteria);
    });
  }

}

exports.SystemSet = SystemSet;