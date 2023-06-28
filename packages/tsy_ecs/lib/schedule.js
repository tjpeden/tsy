"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Schedule = void 0;

var _runCriteria = require("./run-criteria");

class Schedule {
  order = [];
  stages = new Map();

  constructor(runCriteria = new _runCriteria.BaseRunCriteria()) {
    this.runCriteria = runCriteria;
  }

  addStage(label, stage) {
    this.order.push(label);
    this.stages.set(label, stage);
    return this;
  }

  getStage(label) {
    return this.stages.get(label);
  }

  stage(label, action) {
    const stage = this.getStage(label);

    if (stage) {
      action(stage);
    }

    return this;
  }

  addSystemToStage(label, system) {
    const stage = this.getStage(label);

    if (stage) {
      stage.addSystem(system);
    }
  }

  addSystemSetToStage(label, systemSet) {
    this.stage(label, stage => {
      stage.addSystemSet(systemSet);
    });
  }

  runOnce(world) {
    console.log('==> Schedule Start <==');

    for (const label of this.order) {
      console.log(`  ==> ${label} <==`);
      let stage = this.stages.get(label);
      stage.run(world);
    }

    console.log('==> Schedule End <==');
  }

  run(world) {
    for (;;) {
      switch (this.runCriteria.shouldRun(world)) {
        case _runCriteria.ShouldRun.No:
          return;

        case _runCriteria.ShouldRun.Yes:
          {
            this.runOnce(world);
            return;
          }

        case _runCriteria.ShouldRun.YesAndCheckAgain:
          {
            this.runOnce(world);
            break;
          }

        case _runCriteria.ShouldRun.NoAndCheckAgain:
          {
            throw new Error("`NoAndCheckAgain` would loop infinitely in this situation.");
          }
      }
    }
  }

}

exports.Schedule = Schedule;