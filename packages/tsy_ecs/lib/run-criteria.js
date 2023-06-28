"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ShouldRun = exports.RunOnce = exports.BaseRunCriteria = void 0;
let ShouldRun;
exports.ShouldRun = ShouldRun;

(function (ShouldRun) {
  ShouldRun[ShouldRun["Yes"] = 0] = "Yes";
  ShouldRun[ShouldRun["No"] = 1] = "No";
  ShouldRun[ShouldRun["YesAndCheckAgain"] = 2] = "YesAndCheckAgain";
  ShouldRun[ShouldRun["NoAndCheckAgain"] = 3] = "NoAndCheckAgain";
})(ShouldRun || (exports.ShouldRun = ShouldRun = {}));

class BaseRunCriteria {
  set(criteriaSystem) {
    this.system = criteriaSystem;
    return this;
  }

  shouldRun(world) {
    if (this.system) {
      return this.system(world);
    }

    return ShouldRun.Yes;
  }

}

exports.BaseRunCriteria = BaseRunCriteria;

class RunOnce {
  ran = false;

  shouldRun() {
    if (this.ran) {
      return ShouldRun.No;
    }

    this.ran = true;
    return ShouldRun.Yes;
  }

}

exports.RunOnce = RunOnce;