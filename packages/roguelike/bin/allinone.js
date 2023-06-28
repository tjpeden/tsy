"use strict";

class Bundle {
  get components() {
    const self = this;
    return Object.getOwnPropertyNames(self).reduce((components, key) => {
      const component = self[key];

      if (component instanceof Component) {
        components.push(component);
      } else if (component instanceof Bundle) {
        components.push(...component.components);
      }

      return components;
    }, []);
  }

}

var CommandType;

(function (CommandType) {
  CommandType[CommandType["SpawnEntity"] = 0] = "SpawnEntity";
  CommandType[CommandType["DespawnEntity"] = 1] = "DespawnEntity";
  CommandType[CommandType["InsertResource"] = 2] = "InsertResource";
  CommandType[CommandType["RemoveResource"] = 3] = "RemoveResource";
  CommandType[CommandType["InsertComponent"] = 4] = "InsertComponent";
  CommandType[CommandType["RemoveComponent"] = 5] = "RemoveComponent";
  CommandType[CommandType["InsertBundle"] = 6] = "InsertBundle";
})(CommandType || (CommandType = {}));

class Commands {
  constructor(world, queue = []) {
    this.queue = queue;
    this.entities = world.entities;
  }

  add(command) {
    this.queue.push(command);
  }

  insertResource(resource) {
    this.add({
      type: CommandType.InsertResource,
      resource
    });
  }

  removeResource(resource) {
    this.add({
      type: CommandType.RemoveResource,
      resource
    });
  }

  entity(entity) {
    if (!this.entities.contains(entity)) {
      throw new Error(`Entity ${entity} does not exist in the world.`);
    }

    return new EntityCommands(this, entity);
  }

  getOrSpawn(entity) {
    if (this.entities.contains(entity)) {
      return this.entity(entity);
    }

    return this.spawn();
  }

  spawn() {
    const entity = this.entities.alloc();
    this.add({
      type: CommandType.SpawnEntity,
      entity
    });
    return this.entity(entity);
  }

  spawnBundle(bundle) {
    return this.spawn().insertBundle(bundle);
  }

}

class Component {
  static get type() {
    return this.name;
  }

  get type() {
    return this.constructor.type;
  }

}

class EntityCommands {
  constructor(commands, entity) {
    this.commands = commands;
    this.entity = entity;
  }

  id() {
    return this.entity;
  }

  insert(component) {
    this.commands.add({
      type: CommandType.InsertComponent,
      entity: this.entity,
      component
    });
    return this;
  }

  remove(component) {
    this.commands.add({
      type: CommandType.RemoveComponent,
      entity: this.entity,
      component
    });
    return this;
  }

  insertBundle(bundle) {
    this.commands.add({
      type: CommandType.InsertBundle,
      entity: this.entity,
      bundle
    });
    return this;
  }

  despawn() {
    this.commands.add({
      type: CommandType.DespawnEntity,
      entity: this.entity
    });
    return this;
  }

}

class Entities {
  entities = [];

  alloc() {
    const entity = ID();
    this.entities.push(entity);
    return entity;
  }

  free(entity) {
    const index = this.entities.indexOf(entity);

    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  contains(entity) {
    return this.entities.indexOf(entity) !== -1;
  }

  all() {
    return [...this.entities];
  }

}

class Query {
  constructor(world) {
    this.world = world;
  }

  entities(...components) {
    return this.world.entities.all().filter(entity => {
      return components.every(component => this.world.getComponent(entity, component) !== undefined);
    });
  }

  component(entity, component) {
    return this.world.getComponent(entity, component);
  }

  resource(resource) {
    return this.world.getResource(resource);
  }

}

var ShouldRun;

(function (ShouldRun) {
  ShouldRun[ShouldRun["Yes"] = 0] = "Yes";
  ShouldRun[ShouldRun["No"] = 1] = "No";
  ShouldRun[ShouldRun["YesAndCheckAgain"] = 2] = "YesAndCheckAgain";
  ShouldRun[ShouldRun["NoAndCheckAgain"] = 3] = "NoAndCheckAgain";
})(ShouldRun || (ShouldRun = {}));

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

class Schedule {
  order = [];
  stages = {};

  constructor(runCriteria = new BaseRunCriteria()) {
    this.runCriteria = runCriteria;
  }

  addStage(label, stage) {
    this.order.push(label);
    this.stages[label] = stage;
    return this;
  }

  getStage(label) {
    return this.stages[label];
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

    return this;
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
      let stage = this.getStage(label);
      stage.run(world);
    }

    console.log('==> Schedule End <==');
  }

  run(world) {
    for (;;) {
      switch (this.runCriteria.shouldRun(world)) {
        case ShouldRun.No:
          return;

        case ShouldRun.Yes:
          {
            this.runOnce(world);
            return;
          }

        case ShouldRun.YesAndCheckAgain:
          {
            this.runOnce(world);
            break;
          }

        case ShouldRun.NoAndCheckAgain:
          {
            throw new Error("`NoAndCheckAgain` would loop infinitely in this situation.");
          }
      }
    }
  }

}

var OperationType;

(function (OperationType) {
  OperationType[OperationType["Set"] = 0] = "Set";
  OperationType[OperationType["Replace"] = 1] = "Replace";
  OperationType[OperationType["Push"] = 2] = "Push";
  OperationType[OperationType["Pop"] = 3] = "Pop";
})(OperationType || (OperationType = {}));

var TransitionType;

(function (TransitionType) {
  TransitionType[TransitionType["PreStartup"] = 0] = "PreStartup";
  TransitionType[TransitionType["Startup"] = 1] = "Startup";
  TransitionType[TransitionType["ExitingToResume"] = 2] = "ExitingToResume";
  TransitionType[TransitionType["ExitingFull"] = 3] = "ExitingFull";
  TransitionType[TransitionType["Entering"] = 4] = "Entering";
  TransitionType[TransitionType["Resuming"] = 5] = "Resuming";
  TransitionType[TransitionType["Pausing"] = 6] = "Pausing";
})(TransitionType || (TransitionType = {}));

function shouldRunAdapter(endNextLoop, value) {
  if (endNextLoop) {
    return ShouldRun.No;
  }

  return value ? ShouldRun.YesAndCheckAgain : ShouldRun.NoAndCheckAgain;
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

class State extends Component {
  static onUpdate(label, value) {
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      return state.current === value && !state.isTransitioning;
    }])));
  }

  static onEnter(label, value) {
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
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
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
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
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
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
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
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

    return new SystemDescriptor(noop, new BaseRunCriteria().set(driver));
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
        return ShouldRun.YesAndCheckAgain;
      }
    } else if (this.endNextLoop) {
      this.endNextLoop = false;
      return ShouldRun.No;
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

    return ShouldRun.YesAndCheckAgain;
  }

}

class SystemSet {
  static onUpdate(label, value) {
    return new SystemSet().withRunCriteria(State.onUpdate(label, value));
  }

  static onEnter(label, value) {
    return new SystemSet().withRunCriteria(State.onEnter(label, value));
  }

  static onExit(label, value) {
    return new SystemSet().withRunCriteria(State.onExit(label, value));
  }

  static onPause(label, value) {
    return new SystemSet().withRunCriteria(State.onPause(label, value));
  }

  static onResume(label, value) {
    return new SystemSet().withRunCriteria(State.onResume(label, value));
  }

  systems = [];

  withRunCriteria(runCriteria) {
    this.runCriteria = runCriteria;
    return this;
  }

  withSystem(system) {
    this.systems.push(system);
    return this;
  }

  bake() {
    const {
      systems,
      runCriteria
    } = this;
    return systems.map(system => {
      if (system instanceof SystemDescriptor) {
        system.runCriteria = runCriteria;
        return system;
      }

      return new SystemDescriptor(system, runCriteria);
    });
  }

}

class SystemStage {
  stageRunCriteria = new BaseRunCriteria();
  systems = [];

  addSystem(system) {
    this.systems.push(intoSystemDescriptor(system));
    return this;
  }

  addSystemSet(systemSet) {
    systemSet.bake().forEach(system => this.addSystem(system));
    return this;
  }

  run(world) {
    const {
      systems
    } = this;
    let runStageLoop = true;

    while (runStageLoop) {
      const shouldRun = this.stageRunCriteria.shouldRun(world);

      switch (shouldRun) {
        case ShouldRun.No:
          return;

        case ShouldRun.Yes:
          {
            runStageLoop = false;
            break;
          }

        case ShouldRun.NoAndCheckAgain:
          continue;

        case ShouldRun.YesAndCheckAgain:
          break;
      }

      const runCriteria = systems.map(system => {
        var _system$runCriteria;

        return (_system$runCriteria = system.runCriteria) === null || _system$runCriteria === void 0 ? void 0 : _system$runCriteria.shouldRun(world);
      });
      let runSystemLoop;
      let defaultShouldRun = ShouldRun.Yes;

      do {
        runSystemLoop = false;

        const shouldRun = value => {
          switch (value ?? defaultShouldRun) {
            case ShouldRun.Yes:
            case ShouldRun.YesAndCheckAgain:
              return true;

            default:
              return false;
          }
        };

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
            case ShouldRun.Yes:
              {
                runCriteria[index] = ShouldRun.No;
                break;
              }

            case ShouldRun.YesAndCheckAgain:
            case ShouldRun.NoAndCheckAgain:
              {
                runCriteria[index] = systems[index].runCriteria.shouldRun(world);

                switch (runCriteria[index]) {
                  case ShouldRun.Yes:
                  case ShouldRun.YesAndCheckAgain:
                  case ShouldRun.NoAndCheckAgain:
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
        defaultShouldRun = ShouldRun.No;
      } while (runSystemLoop);
    }
  }

}

class SystemDescriptor {
  buffer = [];

  constructor(system, runCriteria) {
    this.system = system;
    this.runCriteria = runCriteria;
  }

  run(world) {
    const commands = new Commands(world, this.buffer);
    const query = new Query(world);
    this.system(commands, query);
  }

  applyBuffer(world) {
    for (const command of this.buffer) {
      switch (command.type) {
        case CommandType.SpawnEntity:
          {
            world.components[command.entity] = {};
            break;
          }

        case CommandType.DespawnEntity:
          {
            world.despawn(command.entity);
            break;
          }

        case CommandType.InsertResource:
          {
            world.insertResource(command.resource);
            break;
          }

        case CommandType.RemoveResource:
          {
            world.removeResource(command.resource);
            break;
          }

        case CommandType.InsertComponent:
          {
            world.insertComponent(command.entity, command.component);
            break;
          }

        case CommandType.RemoveComponent:
          {
            world.removeComponent(command.entity, command.component);
            break;
          }

        case CommandType.InsertBundle:
          {
            world.insertBundle(command.entity, command.bundle);
            break;
          }
      }
    }

    this.buffer = [];
  }

}

function intoSystemDescriptor(system) {
  return system instanceof SystemDescriptor ? system : new SystemDescriptor(system);
}

const ID = () => Math.random().toString(36).slice(2);

class World {
  id = ID();
  entities = new Entities();
  components = {};

  constructor() {
    this.components[this.id] = {};
  }

  spawn() {
    const entity = this.entities.alloc();
    this.components[entity] = {};
    return entity;
  }

  despawn(entity) {
    if (this.entities.contains(entity)) {
      this.entities.free(entity);
      delete this.components[entity];
    }
  }

  insertBundle(entity, bundle) {
    for (const component of bundle.components) {
      this.insertComponent(entity, component);
    }
  }

  insertComponent(entity, component) {
    this.components[entity][component.type] = component;
  }

  removeComponent(entity, component) {
    delete this.components[entity][component.type];
  }

  getComponent(entity, component) {
    return this.components[entity][component.type];
  }

  insertResource(resource) {
    this.components[this.id][resource.type] = resource;
  }

  removeResource(resource) {
    delete this.components[this.id][resource.type];
  }

  getResource(resource) {
    return this.components[this.id][resource.type];
  }

}

var CoreStage;

(function (CoreStage) {
  CoreStage["First"] = "First";
  CoreStage["Startup"] = "Startup";
  CoreStage["PreUpdate"] = "PreUpdate";
  CoreStage["Update"] = "Update";
  CoreStage["PostUpdate"] = "PostUpdate";
  CoreStage["Last"] = "Last";
})(CoreStage || (CoreStage = {}));

var StartupStage;

(function (StartupStage) {
  StartupStage["PreStartup"] = "PreStartup";
  StartupStage["Startup"] = "Startup";
  StartupStage["PostStartup"] = "PostStartup";
})(StartupStage || (StartupStage = {}));

class App {
  world = new World();
  schedule = new Schedule();
  runner = runOnce;

  static default() {
    return new App().addDefaultStages();
  }

  addDefaultStages() {
    this.schedule.addStage(CoreStage.First, new SystemStage()).addStage(CoreStage.Startup, new Schedule(new RunOnce()).addStage(StartupStage.PreStartup, new SystemStage()).addStage(StartupStage.Startup, new SystemStage()).addStage(StartupStage.PostStartup, new SystemStage())).addStage(CoreStage.PreUpdate, new SystemStage()).addStage(CoreStage.Update, new SystemStage()).addStage(CoreStage.PostUpdate, new SystemStage()).addStage(CoreStage.Last, new SystemStage());
    return this;
  }

  addPlugin(plugin) {
    plugin.build(this);
    return this;
  }

  addState(label, initial) {
    this.insertResource(new State(label, initial)).addSystemToStage(CoreStage.Update, State.getDriver(label));
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
    return this.addStartupSystemToStage(StartupStage.Startup, system);
  }

  addSystemToStage(label, system) {
    this.schedule.addSystemToStage(label, system);
    return this;
  }

  addSystem(system) {
    return this.addSystemToStage(CoreStage.Update, system);
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

function runOnce(app) {
  app.update();
}

Object.assign(Array.prototype, {
  // Array.prototype.find polyfill
  find(predicate, thisArg) {
    for (let i = 0; i < this.length; i++) {
      if (predicate.call(thisArg, this[i], i, this)) {
        return this[i];
      }
    }

    return undefined;
  }

});

class Time extends Component {
  ticks = 0;
}

function udpateTime(_commands, query) {
  const time = query.resource(Time);
  time.ticks++;
}

class TimePlugin {
  build(app) {
    app.insertResource(new Time()).addSystemToStage(CoreStage.First, udpateTime);
  }

}

class Sprite extends Component {
  index = 0;
  offset = 0;
  colorkey = -1;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class Transform extends Component {
  x = 0;
  y = 0;
  scale = 1;
  flip = 0;
  rotate = 0;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class GlobalTransform extends Transform {}

class SpriteBundle extends Bundle {
  sprite = new Sprite();
  transform = new Transform();
  globalTransform = new GlobalTransform();

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

var RenderStage;

(function (RenderStage) {
  RenderStage["PreRender"] = "PreRender";
  RenderStage["Render"] = "Render";
})(RenderStage || (RenderStage = {}));

function prerender() {
  cls(1);
  map();
}

function render(_commands, query) {
  const entities = query.entities(Sprite, GlobalTransform);

  for (const entity of entities) {
    const {
      index,
      offset,
      colorkey
    } = query.component(entity, Sprite);
    const {
      x,
      y,
      scale,
      flip,
      rotate
    } = query.component(entity, GlobalTransform);
    spr(index + offset, x, y, colorkey, scale, flip, rotate);
  }
}

class RenderPlugin {
  build(app) {
    app.addStage('Render', new Schedule().addStage(RenderStage.PreRender, new SystemStage().addSystem(prerender)).addStage(RenderStage.Render, new SystemStage().addSystem(render)));
  }

}

class DefaultPlugins {
  build(app) {
    app.addPlugin(new TimePlugin()).addPlugin(new RenderPlugin());
  }

}

class AnimationProgress extends Component {
  value = 0;
  step = 0.125;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

function updateAnimationProgress(_commands, query) {
  const animationProgress = query.resource(AnimationProgress);
  const {
    value,
    step
  } = animationProgress;
  animationProgress.value = Math.min(1, value + step);
}

function shouldUpdateAnimationRun(world) {
  const {
    value
  } = world.getResource(AnimationProgress);

  if (value < 1) {
    return ShouldRun.Yes;
  }

  world.getResource(State.withLabel('AppState')).pop();
  return ShouldRun.No;
}

class AnimationPlugin {
  build(app) {
    app.insertResource(new AnimationProgress()).addSystem(new SystemDescriptor(updateAnimationProgress, new BaseRunCriteria().set(shouldUpdateAnimationRun)));
  }

}

class MoveCharacteristics extends Component {
  characteristics = [{
    axis: 'y',
    delta: -1
  }, {
    axis: 'y',
    delta: 1
  }, {
    axis: 'x',
    delta: -1
  }, {
    axis: 'x',
    delta: 1
  }];
}

class SpriteAnimation extends Component {
  frames = 2;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class TransformAnimation extends Component {
  x = 0;
  y = 0;
  progress = 0;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class Player extends Component {}

class PlayerBundle extends Bundle {
  sprite = new SpriteBundle();
  spriteAnimation = new SpriteAnimation();
  transformAnimation = new TransformAnimation();
  player = new Player();

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

var AppState;

(function (AppState) {
  AppState[AppState["Turn"] = 0] = "Turn";
  AppState[AppState["Walk"] = 1] = "Walk";
  AppState[AppState["Bump"] = 2] = "Bump";
  AppState[AppState["GameOver"] = 3] = "GameOver";
})(AppState || (AppState = {}));

const app = App.default();
app.addPlugin(new DefaultPlugins()).addState('AppState', AppState.Turn).insertResource(new MoveCharacteristics()).insertResource(new AnimationProgress()).addStartupSystem(setup).addSystemToStage(CoreStage.PostUpdate, animateSprites).addSystemToStage(CoreStage.PostUpdate, calculateMovement).addSystemSet(SystemSet.onUpdate('AppState', AppState.Turn).withSystem(movePlayer)).addSystemSet(SystemSet.onEnter('AppState', AppState.Walk).withSystem(initializeWalkAnimation)).addSystemSet(SystemSet.onUpdate('AppState', AppState.Walk).withSystem(updateWalkAnimation)) // .addSystemSet(
//   SystemSet
//   .onExit('AppState', AppState.Walk)
//   .withSystem(resetTransformAnimation)
// )
.addSystemSet(SystemSet.onEnter('AppState', AppState.Bump).withSystem(initializeBumpAnimation)).addSystemSet(SystemSet.onUpdate('AppState', AppState.Bump).withSystem(updateBumpAnimation)); // .addSystemSet(
//   SystemSet
//   .onExit('AppState', AppState.Bump)
//   .withSystem(resetTransformAnimation)
// )

function setup(commands) {
  commands.spawnBundle(new PlayerBundle({
    sprite: new SpriteBundle({
      sprite: new Sprite({
        index: 256
      }),
      transform: new Transform({
        x: 8,
        y: 5
      })
    }),
    spriteAnimation: new SpriteAnimation({
      frames: 4
    })
  }));
}

function movePlayer(_commands, query) {
  const state = query.resource(State.withLabel('AppState'));
  const {
    characteristics
  } = query.resource(MoveCharacteristics);
  const characteristic = characteristics.find((_, i) => btnp(i, 12, 6));

  if (characteristic) {
    const entities = query.entities(Transform, TransformAnimation, Player);
    const {
      axis,
      delta
    } = characteristic;

    for (const entity of entities) {
      const transform = query.component(entity, Transform);
      const transformAnimation = query.component(entity, TransformAnimation);
      const next = Object.assign({}, transform);
      next[axis] += delta;
      const tile = mget(next.x, next.y);

      if (axis === 'x') {
        transform.flip = delta < 0 ? 1 : 0;
      }

      transformAnimation[axis] = delta;

      if (fget(tile, 0)) {
        state.push(AppState.Bump);
      } else {
        state.push(AppState.Walk);
      }
    }
  }
}

function animateSprites(_commands, query) {
  const {
    ticks
  } = query.resource(Time);
  const entities = query.entities(Sprite, SpriteAnimation);

  for (const entity of entities) {
    const sprite = query.component(entity, Sprite);
    const {
      frames
    } = query.component(entity, SpriteAnimation);
    sprite.offset = Math.floor(ticks / 15) % frames;
  }
}

function initializeWalkAnimation(_commands, query) {
  const animationProgress = query.resource(AnimationProgress);
  const entities = query.entities(Transform, TransformAnimation);
  animationProgress.value = 0;

  for (const entity of entities) {
    const transform = query.component(entity, Transform);
    const transformAnimation = query.component(entity, TransformAnimation);
    const {
      x,
      y
    } = transformAnimation;
    transform.x += x;
    transform.y += y;
    transformAnimation.x = -x | 0;
    transformAnimation.y = -y | 0;
    transformAnimation.progress = 1;
  }
}

function updateWalkAnimation(_commands, query) {
  const {
    value: progress
  } = query.resource(AnimationProgress);
  const entities = query.entities(TransformAnimation);

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);
    transformAnimation.progress = 1 - progress;
  }
}

function initializeBumpAnimation(_commands, query) {
  const animationProgress = query.resource(AnimationProgress);
  const entities = query.entities(Transform, TransformAnimation);
  animationProgress.value = 0;

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);
    const {
      x,
      y
    } = transformAnimation;
    transformAnimation.x = x;
    transformAnimation.y = y;
    transformAnimation.progress = 0;
  }
}

function updateBumpAnimation(_commands, query) {
  const {
    value: progress
  } = query.resource(AnimationProgress);
  const entities = query.entities(TransformAnimation);

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);

    if (progress < 0.5) {
      transformAnimation.progress = progress;
    } else {
      transformAnimation.progress = 1 - progress;
    }
  }
} // function resetTransformAnimation(_commands: Commands, query: Query) {
//   const entities = query.entities(TransformAnimation)
//   for (const entity of entities) {
//     const transformAnimation = query.component(entity, TransformAnimation)!
//     transformAnimation.x = 0
//     transformAnimation.y = 0
//   }
// }


function calculateMovement(_commands, query) {
  const entities = query.entities(Transform, TransformAnimation, GlobalTransform);

  for (const entity of entities) {
    const transform = query.component(entity, Transform);
    const {
      x,
      y,
      progress
    } = query.component(entity, TransformAnimation);
    const globalTransform = query.component(entity, GlobalTransform);
    Object.assign(globalTransform, transform, {
      x: x * progress * 8 + transform.x * 8,
      y: y * progress * 8 + transform.y * 8
    });
  }
}

function TIC() {
  app.run();
}

function map(...args) {
  console.log(`map(${args.join(', ')})`);
}

function mget(...args) {
  const result = Math.floor(Math.random() * 128);
  console.log(`mget(${args.join(', ')}) => ${result}`);
  return result;
}

function fget(...args) {
  const result = Math.random() > 0.75;
  console.log(`fget(${args.join(', ')}) => ${result}`);
  return result;
}

function cls(...args) {
  console.log(`cls(${args.join(', ')})`);
}

function spr(...args) {
  console.log(`spr(${args.join(', ')})`);
}

function btnp(...args) {
  const result = Math.random() > 0.75;
  console.log(`btnp(${args.join(', ')}) => ${result}`);
  return result;
}

TIC();