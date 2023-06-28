"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SystemStage = void 0;

var _runCriteria = require("./run-criteria");

var _system = require("./system");

class SystemStage {
  stageRunCriteria = new _runCriteria.BaseRunCriteria();
  systems = new Set();

  addSystem(system) {
    this.systems.add((0, _system.intoSystemDescriptor)(system));
    return this;
  }

  addSystemSet(systemSet) {
    systemSet.bake().forEach(system => this.addSystem(system));
    return this;
  }

  run(world) {
    const systems = [...this.systems];
    let runStageLoop = true;

    while (runStageLoop) {
      const shouldRun = this.stageRunCriteria.shouldRun(world);

      switch (shouldRun) {
        case _runCriteria.ShouldRun.No:
          return;

        case _runCriteria.ShouldRun.Yes:
          {
            runStageLoop = false;
            break;
          }

        case _runCriteria.ShouldRun.NoAndCheckAgain:
          continue;

        case _runCriteria.ShouldRun.YesAndCheckAgain:
          break;
      }

      const runCriteria = systems.map(system => {
        var _system$runCriteria;

        return (_system$runCriteria = system.runCriteria) === null || _system$runCriteria === void 0 ? void 0 : _system$runCriteria.shouldRun(world);
      });
      let runSystemLoop;
      let defaultShouldRun = _runCriteria.ShouldRun.Yes;

      do {
        runSystemLoop = false;

        function shouldRun(value) {
          switch (value ?? defaultShouldRun) {
            case _runCriteria.ShouldRun.Yes:
            case _runCriteria.ShouldRun.YesAndCheckAgain:
              return true;

            default:
              return false;
          }
        }

        systems.forEach((system, index) => {
          if (shouldRun(runCriteria[index])) {
            system.run(world);
          }
        });
        systems.forEach((system, index) => {
          if (shouldRun(runCriteria[index])) {
            system.applyBuffer(world);
          }
        });
        runCriteria.forEach((value, index) => {
          switch (value) {
            case _runCriteria.ShouldRun.Yes:
              {
                runCriteria[index] = _runCriteria.ShouldRun.No;
                break;
              }

            case _runCriteria.ShouldRun.YesAndCheckAgain:
            case _runCriteria.ShouldRun.NoAndCheckAgain:
              {
                runCriteria[index] = systems[index].runCriteria.shouldRun(world);

                switch (runCriteria[index]) {
                  case _runCriteria.ShouldRun.Yes:
                  case _runCriteria.ShouldRun.YesAndCheckAgain:
                  case _runCriteria.ShouldRun.NoAndCheckAgain:
                    {
                      runSystemLoop = true;
                    }

                  default:
                    return;
                }
              }

            default:
              return;
          }
        });
        defaultShouldRun = _runCriteria.ShouldRun.No;
      } while (runSystemLoop);
    }
  }

}

exports.SystemStage = SystemStage;