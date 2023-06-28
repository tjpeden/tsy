"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StartupStage = exports.CoreStage = exports.App = void 0;

var _ecs = require("@tsy/ecs");

let CoreStage;
exports.CoreStage = CoreStage;

(function (CoreStage) {
  CoreStage["First"] = "First";
  CoreStage["Startup"] = "Startup";
  CoreStage["PreUpdate"] = "PreUpdate";
  CoreStage["Update"] = "Update";
  CoreStage["PostUpdate"] = "PostUpdate";
  CoreStage["Last"] = "Last";
})(CoreStage || (exports.CoreStage = CoreStage = {}));

let StartupStage;
exports.StartupStage = StartupStage;

(function (StartupStage) {
  StartupStage["PreStartup"] = "PreStartup";
  StartupStage["Startup"] = "Startup";
  StartupStage["PostStartup"] = "PostStartup";
})(StartupStage || (exports.StartupStage = StartupStage = {}));

class App {
  world = new _ecs.World();
  schedule = new _ecs.Schedule();
  runner = runOnce;

  static default() {
    return new App().addDefaultStages();
  }

  addDefaultStages() {
    this.schedule.addStage(CoreStage.First, new _ecs.SystemStage()).addStage(CoreStage.Startup, new _ecs.Schedule(new _ecs.RunOnce()).addStage(StartupStage.PreStartup, new _ecs.SystemStage()).addStage(StartupStage.Startup, new _ecs.SystemStage()).addStage(StartupStage.PostStartup, new _ecs.SystemStage())).addStage(CoreStage.PreUpdate, new _ecs.SystemStage()).addStage(CoreStage.Update, new _ecs.SystemStage()).addStage(CoreStage.PostUpdate, new _ecs.SystemStage()).addStage(CoreStage.Last, new _ecs.SystemStage());
    return this;
  }

  addPlugin(plugin) {
    plugin.build(this);
    return this;
  }

  addState(label, initial) {
    this.insertResource(new _ecs.State(label, initial)).addSystemToStage(CoreStage.Update, _ecs.State.getDriver(label));
    return this;
  }

  addSystemSetToStage(label, systemSet) {
    this.schedule.addSystemSetToStage(label, systemSet);
    return this;
  }

  addSystemSet(systemSet) {
    this.addSystemSetToStage(CoreStage.Update, systemSet);
    return this;
  }

  addStage(label, stage) {
    this.schedule.addStage(label, stage);
    return this;
  }

  addStartupSystemToStage(label, system) {
    this.schedule.stage(CoreStage.Startup, stage => {
      stage.addSystemToStage(label, system);
    });
    return this;
  }

  addStartupSystem(system) {
    this.addStartupSystemToStage(StartupStage.Startup, system);
    return this;
  }

  addSystemToStage(label, system) {
    this.schedule.addSystemToStage(label, system);
    return this;
  }

  addSystem(system) {
    this.addSystemToStage(CoreStage.Update, system);
    return this;
  }

  insertResource(resource) {
    this.world.insertResource(resource);
    return this;
  }

  setRunner(runner) {
    this.runner = runner;
    return this;
  }

  update() {
    this.schedule.run(this.world);
  }

  run() {
    this.runner(this);
  }

}

exports.App = App;

function runOnce(app) {
  app.update();
}