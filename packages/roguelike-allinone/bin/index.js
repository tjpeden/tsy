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
    for (const label of this.order) {
      // console.log(`==> Start ${label} <==`)
      let stage = this.getStage(label);
      stage.run(world); // console.log(`==> End ${label} <==`)
    }
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
      return state.current === value && state.transition.isNone;
    }])));
  }

  static onEnter(label, value) {
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      return state.transition.map(transition => {
        switch (transition === null || transition === void 0 ? void 0 : transition.type) {
          case TransitionType.Entering:
            {
              return transition.entering === value;
            }

          default:
            return false;
        }
      });
    }])));
  }

  static onExit(label, value) {
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      return state.transition.map(transition => {
        switch (transition === null || transition === void 0 ? void 0 : transition.type) {
          case TransitionType.ExitingToResume:
          case TransitionType.ExitingFull:
            {
              return transition.leaving === value;
            }

          default:
            return false;
        }
      });
    }])));
  }

  static onPause(label, value) {
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      return state.transition.map(transition => {
        switch (transition === null || transition === void 0 ? void 0 : transition.type) {
          case TransitionType.Pausing:
            {
              return transition.leaving === value;
            }

          default:
            return false;
        }
      });
    }])));
  }

  static onResume(label, value) {
    return new BaseRunCriteria().set(pipe(getState(label), converge(shouldRunAdapter, [getEndNextLoop, state => {
      return state.transition.map(transition => {
        switch (transition === null || transition === void 0 ? void 0 : transition.type) {
          case TransitionType.Resuming:
            {
              return transition.entering === value;
            }

          default:
            {
              return false;
            }
        }
      });
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

  transition = None;
  scheduled = None;
  prepareExit = false;
  endNextLoop = false;

  get type() {
    return `${this.constructor.name}<${this.label}>`;
  }

  get current() {
    return this.stack[this.stack.length - 1];
  }

  constructor(label, initial) {
    super();
    this.label = label;
    this.stack = [initial];
  }

  set(value) {
    if (this.current !== value && this.scheduled.isNone) {
      this.scheduled = Some({
        type: OperationType.Set,
        state: value
      });
    }
  }

  replace(value) {
    if (this.current !== value && this.scheduled.isNone) {
      this.scheduled = Some({
        type: OperationType.Replace,
        state: value
      });
    }
  }

  push(value) {
    if (this.current !== value && this.scheduled.isNone) {
      this.scheduled = Some({
        type: OperationType.Push,
        state: value
      });
    }
  }

  immediatePush(value) {
    this.stack.push(value);
  }

  pop() {
    if (this.scheduled.isNone && this.stack.length > 1) {
      this.scheduled = Some({
        type: OperationType.Pop
      });
    }
  }

  update() {
    console.dir(this);

    if (this.prepareExit) {
      this.prepareExit = false;

      if (this.scheduled.isNone) {
        this.endNextLoop = true;
        return ShouldRun.YesAndCheckAgain;
      }
    } else if (this.endNextLoop) {
      this.endNextLoop = false;
      return ShouldRun.No;
    }

    const scheduled = this.scheduled.take();

    switch (scheduled === null || scheduled === void 0 ? void 0 : scheduled.type) {
      case OperationType.Set:
        {
          const {
            state: entering
          } = scheduled;
          const leaving = this.stack.pop();
          this.transition = Some({
            type: TransitionType.ExitingFull,
            leaving,
            entering
          });
          break;
        }

      case OperationType.Replace:
        {
          const {
            state: entering
          } = scheduled;

          if (this.stack.length <= 1) {
            const leaving = this.stack.pop();
            this.transition = Some({
              type: TransitionType.ExitingFull,
              leaving,
              entering
            });
          } else {
            const transition = this.transition.take();
            this.scheduled = Some({
              type: OperationType.Replace,
              state: entering
            });

            switch (transition === null || transition === void 0 ? void 0 : transition.type) {
              case TransitionType.ExitingToResume:
                {
                  this.stack.pop();
                  this.transition = Some({
                    type: TransitionType.Resuming,
                    leaving: transition.leaving,
                    entering: transition.entering
                  });
                  break;
                }

              default:
                {
                  this.transition = Some({
                    type: TransitionType.ExitingToResume,
                    leaving: this.stack[this.stack.length - 1],
                    entering: this.stack[this.stack.length - 2]
                  });
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
          this.transition = Some({
            type: TransitionType.Pausing,
            leaving: this.current,
            entering
          });
          break;
        }

      case OperationType.Pop:
        {
          this.transition = Some({
            type: TransitionType.ExitingToResume,
            leaving: this.stack[this.stack.length - 1],
            entering: this.stack[this.stack.length - 2]
          });
          break;
        }

      default:
        {
          const transition = this.transition.take();

          switch (transition === null || transition === void 0 ? void 0 : transition.type) {
            case TransitionType.ExitingFull:
              {
                const {
                  leaving,
                  entering
                } = transition;
                this.transition = Some({
                  type: TransitionType.Entering,
                  leaving,
                  entering
                });
                this.stack[this.stack.length - 1] = entering;
                break;
              }

            case TransitionType.Pausing:
              {
                const {
                  leaving,
                  entering
                } = transition;
                this.transition = Some({
                  type: TransitionType.Entering,
                  leaving,
                  entering
                });
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
                this.transition = Some({
                  type: TransitionType.Resuming,
                  leaving,
                  entering
                });
                break;
              }

            case TransitionType.PreStartup:
              {
                this.transition = Some({
                  type: TransitionType.Startup
                });
                break;
              }

            default:
              {}
          }

          break;
        }
    }

    if (this.transition.isNone) {
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
            // console.log(`Running system ${index}:`)
            // console.dir(system)
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
    this.system(query, commands);
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

class Option {
  get isSome() {
    return this.value !== undefined;
  }

  get isNone() {
    return !this.isSome;
  }

  constructor(value) {
    this.value = value;
  }

  take() {
    const {
      value
    } = this;
    this.value = undefined;
    return value;
  }

  map(predicate) {
    return predicate(this.value);
  }

}

function Some(value) {
  return new Option(value);
}

const None = new Option();

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

class Time extends Component {
  ticks = 0;
}

function udpateTime(query) {
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

class Window {
  get alive() {
    return this.duration === undefined || this.duration > 0;
  }

  set alive(value) {
    if (value) {
      this.duration = undefined;
    } else {
      this.duration = 0;
    }
  }

  constructor(x, y, width, height, foreground, background, text) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.foreground = foreground;
    this.background = background;
    this.text = text;
  }

  update() {
    if (this.duration !== undefined) {
      this.duration--;
    }
  }

  draw() {
    rect(this.x, this.y, this.width, this.height, this.background);
    rectb(this.x + 1, this.y + 1, this.width - 2, this.height - 2, this.foreground);
    let x = this.x + 4;
    let y = this.y + 4;
    clip(x, y, this.width - 8, this.height - 8);
    this.text.forEach(line => {
      print(line, x, y, this.foreground);
      y += 8;
    });
    clip();
  }

}

class Toast extends Window {
  constructor(message, duration) {
    const text = ` ${message} `;
    const width = print(text, 0, -8);
    super(120 - width / 2, 61, width, 14, 7, 0, [text]);
    this.duration = duration;
  }

}

class Dialog extends Window {
  constructor(text) {
    let maxWidth = 0;

    for (const line of text) {
      maxWidth = Math.max(maxWidth, print(line, 0, -8));
    }

    const width = Math.min(maxWidth, 120);
    const height = text.length * 8;
    super(120 - width / 2, 68 - height / 2, width, height, 7, 0, text);
  }

}

class WindowManager extends Component {
  windows = [];

  get currentDialog() {
    for (const window of this.windows) {
      if (window instanceof Dialog) {
        return window;
      }
    }
  }

  add(window) {
    this.windows.push(window);
  }

  toast(message, duration = 120) {
    this.add(new Toast(message, duration));
  }

  dialog(text) {
    if (this.currentDialog === undefined) {
      this.add(new Dialog(text));
    }
  }

  update() {
    this.windows.forEach(window => window.update());
    this.windows = this.windows.filter(window => window.alive);
  }

  draw() {
    this.windows.forEach(window => window.draw());
  }

}

function updateWindows(query) {
  const windows = query.resource(WindowManager);
  windows.update();
}

function clearScreen() {
  cls(1);
  map();
}

function render(query) {
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

function renderWindows(query) {
  const windowManager = query.resource(WindowManager);
  windowManager.draw();
}

var RenderStage;

(function (RenderStage) {
  RenderStage["Render"] = "Render";
  RenderStage["PostRender"] = "PostRender";
})(RenderStage || (RenderStage = {}));

class RenderPlugin {
  build(app) {
    app.insertResource(new WindowManager()).addStage('Render', new Schedule().addStage(RenderStage.Render, new SystemStage().addSystem(clearScreen).addSystem(render).addSystem(renderWindows))).addStage(RenderStage.PostRender, new SystemStage().addSystem(updateWindows));
  }

}

class DefaultPlugins {
  build(app) {
    app.addPlugin(new TimePlugin()).addPlugin(new RenderPlugin());
  }

}

class AnimationProgress extends Component {
  value = 1;
  step = 0.125;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

function updateAnimationProgress(query) {
  const animationProgress = query.resource(AnimationProgress);
  const {
    value,
    step
  } = animationProgress;
  animationProgress.value = Math.min(1, value + step);
}

function shouldUpdateAnimationProgressRun(world) {
  const {
    value
  } = world.getResource(AnimationProgress);

  if (value < 1) {
    return ShouldRun.Yes;
  }

  return ShouldRun.No;
}

function checkAnimationProgress(query) {
  const {
    value
  } = query.resource(AnimationProgress);

  if (value >= 1) {
    query.resource(State.withLabel('AppState')).pop();
  }
}

class AnimationPlugin {
  build(app) {
    app.insertResource(new AnimationProgress()).addSystem(new SystemDescriptor(updateAnimationProgress, new BaseRunCriteria().set(shouldUpdateAnimationProgressRun)));
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

class InputBuffer extends Component {
  value = None;
}

var AppState;

(function (AppState) {
  AppState[AppState["Turn"] = 0] = "Turn";
  AppState[AppState["Walk"] = 1] = "Walk";
  AppState[AppState["Bump"] = 2] = "Bump";
  AppState[AppState["IntroDialog"] = 3] = "IntroDialog";
  AppState[AppState["GameOver"] = 4] = "GameOver";
})(AppState || (AppState = {}));

const app = App.default();
app.addPlugin(new DefaultPlugins()).addPlugin(new AnimationPlugin()).addState('AppState', AppState.Turn).insertResource(new MoveCharacteristics()).insertResource(new InputBuffer()).addStartupSystem(setup).addSystem(bufferInput).addSystemSet(SystemSet.onUpdate('AppState', AppState.Turn).withSystem(movePlayer)).addSystemSet(SystemSet.onEnter('AppState', AppState.Walk).withSystem(initializeWalkAnimation)).addSystemSet(SystemSet.onUpdate('AppState', AppState.Walk).withSystem(updateWalkAnimation).withSystem(checkAnimationProgress)).addSystemSet(SystemSet.onExit('AppState', AppState.Walk).withSystem(resetTransformAnimation)).addSystemSet(SystemSet.onEnter('AppState', AppState.Bump).withSystem(() => trace('enter bump')).withSystem(initializeBumpAnimation)).addSystemSet(SystemSet.onUpdate('AppState', AppState.Bump).withSystem(updateBumpAnimation).withSystem(checkAnimationProgress)).addSystemSet(SystemSet.onExit('AppState', AppState.Bump).withSystem(() => trace('exit bump')).withSystem(resetTransformAnimation)).addSystemSet(SystemSet.onResume('AppState', AppState.IntroDialog).withSystem(() => trace('resume intro dialog')).withSystem(initializeIntroDialog)).addSystemSet(SystemSet.onUpdate('AppState', AppState.IntroDialog).withSystem(updateIntroDialog)).addSystemSet(SystemSet.onExit('AppState', AppState.IntroDialog).withSystem(() => trace('exit intro dialog'))).addSystemToStage(CoreStage.PostUpdate, animateSprites).addSystemToStage(CoreStage.PostUpdate, calculateMovement);

function setup(_query, commands) {
  commands.spawnBundle(new PlayerBundle({
    sprite: new SpriteBundle({
      sprite: new Sprite({
        index: 256
      }),
      transform: new Transform({
        x: 1,
        y: 1
      })
    }),
    spriteAnimation: new SpriteAnimation({
      frames: 4
    })
  }));
}

function bufferInput(query) {
  const buffer = query.resource(InputBuffer);

  if (buffer.value.isNone) {
    for (let i = 0; i < 8; i++) {
      if (btnp(i, 9, 1)) {
        buffer.value = Some(i);
        break;
      }
    }
  }
}

function movePlayer(query) {
  const {
    characteristics
  } = query.resource(MoveCharacteristics);
  const state = query.resource(State.withLabel('AppState'));
  const input = query.resource(InputBuffer).value.take();

  if (input !== undefined && input < characteristics.length) {
    const entities = query.entities(Transform, TransformAnimation, Player);
    const {
      axis,
      delta
    } = characteristics[input];

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
        if (fget(tile, 1)) {
          switch (tile) {
            case 6:
              {
                // sfx()
                state.immediatePush(AppState.IntroDialog);
                break;
              }

            case 7:
            case 8:
              {
                sfx(59);
                mset(next.x, next.y, 1);
                break;
              }

            case 10:
            case 12:
              {
                sfx(61);
                mset(next.x, next.y, tile - 1);
                break;
              }

            case 13:
              {
                sfx(62);
                mset(next.x, next.y, 1);
                break;
              }
          }
        }

        state.push(AppState.Bump);
      } else {
        sfx(63);
        state.push(AppState.Walk);
      }
    }
  }
}

function animateSprites(query) {
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

function initializeWalkAnimation(query) {
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

function updateWalkAnimation(query) {
  const {
    value: progress
  } = query.resource(AnimationProgress);
  const entities = query.entities(TransformAnimation);

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);
    transformAnimation.progress = 1 - progress;
  }
}

function initializeBumpAnimation(query) {
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

function updateBumpAnimation(query) {
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
}

function resetTransformAnimation(query) {
  const entities = query.entities(TransformAnimation);

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);
    transformAnimation.x = 0;
    transformAnimation.y = 0;
  }
}

function initializeIntroDialog(query) {
  const manager = query.resource(WindowManager);
  manager.dialog(['Welcome to the world', 'of Porklike!']);
}

function updateIntroDialog(query) {
  if (btn(4)) {
    const state = query.resource(State.withLabel('AppState'));
    const manager = query.resource(WindowManager);
    manager.currentDialog.alive = false;
    state.pop();
  }
}

function calculateMovement(query) {
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

let frame;
const tileData = [[false, false], // 0: Empty
[true, false], // 1: Floor
[false, false], // 2: Wall
[false, false], // 3: Empty
[false, false], // 4: Empty
[false, false], // 5: Empty
[true, true] // 6: Stone Tablet
];
const mapData = [[2, 2, 2], [2, 1, 2], [2, 6, 2], [2, 2, 2]];
const inputFrames = [[false, false, false, false, false, false, false, false, false, false, false], [true, false, false, false, false, false, false, false, false, false, false], [false, false, false, false, false, false, false, false, false, false, false], [false, false, false, false, false, false, false, false, false, false, false], [false, false, false, false, false, false, false, false, false, false, true], [false, false, false, false, false, false, false, false, false, false, false], [false, false, false, false, false, false, false, false, false, false, false], [false, false, false, false, false, false, false, false, false, false, false]];

function map(...args) {
  console.log(`map(${args.join(', ')})`);
}

function mset(...args) {
  console.log(`mset(${args.join(', ')})`);
}

function mget(...args) {
  const [x, y] = args;
  const result = mapData[y][x];
  console.log(`mget(${args.join(', ')}) => ${result}`);
  return result;
}

function fget(...args) {
  const [tile, flag] = args;
  const result = tileData[tile][flag];
  console.log(`fget(${args.join(', ')}) => ${result}`);
  return result;
}

function clip(...args) {
  console.log(`clip(${args.join(', ')})`);
}

function cls(...args) {
  console.log(`cls(${args.join(', ')})`);
}

function spr(...args) {
  console.log(`spr(${args.join(', ')})`);
}

function rect(...args) {
  console.log(`rect(${args.join(', ')})`);
}

function rectb(...args) {
  console.log(`rectb(${args.join(', ')})`);
}

function sfx(...args) {
  console.log(`sfx(${args.join(', ')})`);
}

function btn(...args) {
  const [button] = args;
  const result = inputFrames[button][frame];
  console.log(`btn(${args.join(', ')}) => ${result}`);
  return result;
}

function btnp(...args) {
  const [button] = args;
  const result = inputFrames[button][frame];
  console.log(`btnp(${args.join(', ')}) => ${result}`);
  return result;
}

function print(...args) {
  const result = args[0].length;
  console.log(`print(${args.join(', ')}) => ${result}`);
  return result;
}

function trace(...args) {
  console.log(...args);
}

for (frame = 0; frame < inputFrames[0].length; frame++) {
  console.log(`==> Start Frame: ${frame} <==`);
  TIC();
  console.log(`==> End Frame: ${frame} <==`);
}