type START_ECS = undefined

abstract class Bundle {
  public get components(): Component[] {
    const self: Record<string, Component | Bundle> = this as any

    return Object
    .getOwnPropertyNames(self)
    .reduce(
      (components: Component[], key) => {
        const component = self[key]

        if (component instanceof Component) {
          components.push(component)
        } else if (component instanceof Bundle) {
          components.push(...component.components)
        }

        return components
      },
      [],
    )
  }
}

const enum CommandType {
  SpawnEntity,
  DespawnEntity,
  InsertResource,
  RemoveResource,
  InsertComponent,
  RemoveComponent,
  InsertBundle,
}

interface SpawnEntity {
  type: CommandType.SpawnEntity
  entity: Entity
}

interface DespawnEntity {
  type: CommandType.DespawnEntity
  entity: Entity
}

interface InsertResource {
  type: CommandType.InsertResource
  resource: Component
}

interface RemoveResource {
  type: CommandType.RemoveResource
  resource: WithType & Class<Component>
}

interface InsertComponent {
  type: CommandType.InsertComponent
  entity: Entity
  component: Component
}

interface RemoveComponent {
  type: CommandType.RemoveComponent
  entity: Entity
  component: WithType & Class<Component>
}

interface InsertBundle {
  type: CommandType.InsertBundle
  entity: Entity
  bundle: Bundle
}

type Command =
| SpawnEntity
| DespawnEntity
| InsertResource
| RemoveResource
| InsertComponent
| RemoveComponent
| InsertBundle

class Commands {
  private entities: Entities

  public constructor(
    world: World,
    private queue: Command[] = [],
  ) {
    this.entities = world.entities
  }

  public add(command: Command): void {
    this.queue.push(command)
  }

  public insertResource(resource: Component): void {
    this.add({
      type: CommandType.InsertResource,
      resource,
    })
  }

  public removeResource(resource: WithType & Class<Component>): void {
    this.add({
      type: CommandType.RemoveResource,
      resource,
    })
  }

  public entity(entity: Entity): EntityCommands {
    if (!this.entities.contains(entity)) {
      throw new Error(`Entity ${entity} does not exist in the world.`)
    }

    return new EntityCommands(this, entity)
  }

  public getOrSpawn(entity: Entity): EntityCommands {
    if (this.entities.contains(entity)) {
      return this.entity(entity)
    }

    return this.spawn()
  }

  public spawn(): EntityCommands {
    const entity = this.entities.alloc()

    this.add({
      type: CommandType.SpawnEntity,
      entity,
    })

    return this.entity(entity)
  }

  public spawnBundle(bundle: Bundle): EntityCommands {
    return this.spawn().insertBundle(bundle)
  }
}

abstract class Component implements WithType {
  public static get type() {
    return this.name
  }

  public get type() {
    return (this.constructor as typeof Component).type
  }
}

class EntityCommands {
  public constructor(
    private readonly commands: Commands,
    private readonly entity: Entity,
  ) {}

  public id(): Entity {
    return this.entity
  }

  public insert(component: Component): this {
    this.commands.add({
      type: CommandType.InsertComponent,
      entity: this.entity,
      component,
    })

    return this
  }

  public remove(component: WithType & Class<Component>): this {
    this.commands.add({
      type: CommandType.RemoveComponent,
      entity: this.entity,
      component,
    })

    return this
  }

  public insertBundle(bundle: Bundle): this {
    this.commands.add({
      type: CommandType.InsertBundle,
      entity: this.entity,
      bundle,
    })

    return this
  }

  public despawn(): this {
    this.commands.add({
      type: CommandType.DespawnEntity,
      entity: this.entity,
    })

    return this
  }
}

type Entity = string

class Entities {
  private entities: Entity[] = []

  public alloc(): Entity {
    const entity = ID()

    this.entities.push(entity)

    return entity
  }

  public free(entity: Entity): void {
    const index = this.entities.indexOf(entity)

    if (index !== -1) {
      this.entities.splice(index, 1)
    }
  }

  public contains(entity: Entity): boolean {
    return this.entities.indexOf(entity) !== -1
  }

  public all(): Entity[] {
    return [...this.entities]
  }
}

class Query {
  public constructor(
    private readonly world: World,
  ) {}

  public entities(...components: (WithType & Class<Component>)[]): Entity[] {
    return this.world.entities.all().filter(entity => {
      return components.every(
        component => this.world.getComponent(entity, component) !== undefined,
      )
    })
  }

  public component<T extends Component>(entity: Entity, component: WithType & Class<T>): Maybe<T> {
    return this.world.getComponent(entity, component)
  }

  public resource<T extends Component>(resource: WithType & Class<T>): Maybe<T> {
    return this.world.getResource(resource)
  }
}

enum ShouldRun {
  Yes,
  No,
  YesAndCheckAgain,
  NoAndCheckAgain,
}

interface RunCriteriaSystem {
  (world: World): ShouldRun
}

interface RunCriteria {
  shouldRun: RunCriteriaSystem
}

class BaseRunCriteria implements RunCriteria {
  private system?: RunCriteriaSystem

  public set(criteriaSystem: RunCriteriaSystem): this {
    this.system = criteriaSystem

    return this
  }

  public shouldRun(world: World): ShouldRun {
    if (this.system) {
      return this.system(world)
    }

    return ShouldRun.Yes
  }
}

class RunOnce implements RunCriteria {
  private ran = false

  public shouldRun(): ShouldRun {
    if (this.ran) {
      return ShouldRun.No
    }

    this.ran = true

    return ShouldRun.Yes
  }
}

class Schedule implements Stage {
  private order: string[] = []
  private stages: Record<string, Stage> = {}

  public constructor(
    private readonly runCriteria: RunCriteria = new BaseRunCriteria(),
  ) {}

  public addStage(label: string, stage: Stage): this {
    this.order.push(label)
    this.stages[label] = stage

    return this
  }

  public getStage<S extends Stage>(label: string): Maybe<S> {
    return this.stages[label] as S
  }

  public stage<S extends Stage>(label: string, action: (stage: S) => void): this {
    const stage = this.getStage<S>(label)

    if (stage) {
      action(stage)
    }

    return this
  }

  public addSystemToStage(label: string, system: IntoSystemDescriptor): this {
    const stage = this.getStage<SystemStage>(label)

    if (stage) {
      stage.addSystem(system)
    }

    return this
  }

  public addSystemSetToStage(label: string, systemSet: SystemSet): void {
    this.stage(label, (stage: SystemStage) => {
      stage.addSystemSet(systemSet)
    })
  }

  public runOnce(world: World): void {
    for (const label of this.order) {
      let stage = this.getStage(label)!

      stage.run(world)
    }
  }

  public run(world: World): void {
    for (;;) {
      switch (this.runCriteria.shouldRun(world)) {
        case ShouldRun.No: return
        case ShouldRun.Yes: {
          this.runOnce(world)
          return
        }
        case ShouldRun.YesAndCheckAgain: {
          this.runOnce(world)
          break
        }
        case ShouldRun.NoAndCheckAgain: {
          throw new Error("`NoAndCheckAgain` would loop infinitely in this situation.")
        }
      }
    }
  }
}

interface Stage {
  run(world: World): void
}

const enum OperationType {
  Set,
  Replace,
  Push,
  Pop,
}

interface SetOperation<T> {
  type: OperationType.Set
  state: T
}

interface ReplaceOperation<T> {
  type: OperationType.Replace
  state: T
}

interface PushOperation<T> {
  type: OperationType.Push
  state: T
}

interface PopOperation {
  type: OperationType.Pop
}

type ScheduledOperation<T> =
| SetOperation<T>
| ReplaceOperation<T>
| PushOperation<T>
| PopOperation

const enum TransitionType {
  PreStartup,
  Startup,
  ExitingToResume,
  ExitingFull,
  Entering,
  Resuming,
  Pausing,
}

interface PreStartup {
  type: TransitionType.PreStartup
}

interface Startup {
  type: TransitionType.Startup
}

interface ExitingToResume<T> {
  type: TransitionType.ExitingToResume
  leaving: T
  entering: T
}

interface ExitingFull<T> {
  type: TransitionType.ExitingFull
  leaving: T
  entering: T
}

interface Entering<T> {
  type: TransitionType.Entering
  leaving: T
  entering: T
}

interface Resuming<T> {
  type: TransitionType.Resuming
  leaving: T
  entering: T
}

interface Pausing<T> {
  type: TransitionType.Pausing
  leaving: T
  entering: T
}

type StateTransition<T> =
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

class State<T> extends Component {
  public static onUpdate<T>(label: string, value: T): RunCriteria {
    return new BaseRunCriteria().set(
      pipe(
        getState<T>(label),
        converge(
          shouldRunAdapter,
          [
            getEndNextLoop,
            (state: State<T>) => {
              return state.current === value && state.transition.isNone
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
            (state: State<T>): boolean => {
              return state.transition
              .map((transition?: StateTransition<T>) => {
                switch (transition?.type) {
                  case TransitionType.Entering: {
                    return transition.entering === value
                  }
                  default: return false
                }
              })
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
            (state: State<T>): boolean => {
              return state.transition
              .map((transition?: StateTransition<T>) => {
                switch (transition?.type) {
                  case TransitionType.ExitingToResume:
                  case TransitionType.ExitingFull: {
                    return transition.leaving === value
                  }
                  default: return false
                }
              })
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
            (state: State<T>): boolean => {
              return state.transition
              .map((transition?: StateTransition<T>) => {
                switch (transition?.type) {
                  case TransitionType.Pausing: {
                    return transition.leaving === value
                  }
                  default: return false
                }
              })
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
            (state: State<T>): boolean => {
              return state.transition
              .map((transition?: StateTransition<T>) => {
                switch (transition?.type) {
                  case TransitionType.Resuming: {
                    return transition.entering === value
                  }
                  default: {
                    return false
                  }
                }
              })
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
  private transition: Option<StateTransition<T>> = None
  private scheduled: Option<ScheduledOperation<T>> = None
  private prepareExit = false

  public endNextLoop = false

  public get type(): string {
    return `${this.constructor.name}<${this.label}>`
  }

  public get current(): T {
    return this.stack[this.stack.length - 1]
  }

  public constructor(
    private readonly label: string,
    initial: T,
  ) {
    super()

    this.stack = [initial]
  }

  public set(value: T): void {
    if (this.current !== value && this.scheduled.isNone) {
      this.scheduled = Some({
        type: OperationType.Set,
        state: value,
      })
    }
  }

  public replace(value: T): void {
    if (this.current !== value && this.scheduled.isNone) {
      this.scheduled = Some({
        type: OperationType.Replace,
        state: value,
      })
    }
  }

  public push(value: T): void {
    if (this.current !== value && this.scheduled.isNone) {
      this.scheduled = Some({
        type: OperationType.Push,
        state: value,
      })
    }
  }

  public immediatePush(value: T): void {
    this.stack.push(value)
  }

  public pop(): void {
    if (this.scheduled.isNone && this.stack.length > 1) {
      this.scheduled = Some({
        type: OperationType.Pop,
      })
    }
  }

  private update() {
    if (this.prepareExit) {
      this.prepareExit = false
      if (this.scheduled.isNone) {
        this.endNextLoop = true

        return ShouldRun.YesAndCheckAgain
      }
    } else if (this.endNextLoop) {
      this.endNextLoop = false

      return ShouldRun.No
    }

    const scheduled = this.scheduled.take()

    switch (scheduled?.type) {
      case OperationType.Set: {
        const { state: entering } = scheduled
        const leaving = this.stack.pop()!

        this.transition = Some({
          type: TransitionType.ExitingFull,
          leaving,
          entering,
        })

        break
      }
      case OperationType.Replace: {
        const { state: entering } = scheduled

        if (this.stack.length <= 1) {
          const leaving = this.stack.pop()!

          this.transition = Some({
            type: TransitionType.ExitingFull,
            leaving,
            entering,
          })
        } else {
          const transition = this.transition.take()

          this.scheduled = Some({
            type: OperationType.Replace,
            state: entering,
          })

          switch (transition?.type) {
            case TransitionType.ExitingToResume: {
              this.stack.pop()

              this.transition = Some({
                type: TransitionType.Resuming,
                leaving: transition.leaving,
                entering: transition.entering,
              })

              break
            }
            default: {
              this.transition = Some({
                type: TransitionType.ExitingToResume,
                leaving: this.stack[this.stack.length - 1],
                entering: this.stack[this.stack.length - 2],
              })

              break
            }
          }
        }

        break
      }
      case OperationType.Push: {
        const { state: entering } = scheduled

        this.transition = Some({
          type: TransitionType.Pausing,
          leaving: this.current,
          entering,
        })

        break
      }
      case OperationType.Pop: {
        this.transition = Some({
          type: TransitionType.ExitingToResume,
          leaving: this.stack[this.stack.length - 1],
          entering: this.stack[this.stack.length - 2],
        })

        break
      }
      default: {
        const transition = this.transition.take()

        switch (transition?.type) {
          case TransitionType.ExitingFull: {
            const {
              leaving,
              entering,
            } = transition

            this.transition = Some({
              type: TransitionType.Entering,
              leaving,
              entering,
            })

            this.stack[this.stack.length - 1] = entering

            break
          }
          case TransitionType.Pausing: {
            const {
              leaving,
              entering,
            } = transition

            this.transition = Some({
              type: TransitionType.Entering,
              leaving,
              entering,
            })

            this.stack.push(entering)

            break
          }
          case TransitionType.ExitingToResume: {
            const {
              leaving,
              entering,
            } = transition

            this.stack.pop()

            this.transition = Some({
              type: TransitionType.Resuming,
              leaving,
              entering,
            })

            break
          }
          case TransitionType.PreStartup: {
            this.transition = Some({
              type: TransitionType.Startup,
            })

            break
          }
          default: {}
        }

        break
      }
    }

    if (this.transition.isNone) {
      this.prepareExit = true
    }

    return ShouldRun.YesAndCheckAgain
  }
}

class SystemSet {
  public static onUpdate<T>(label: string, value: T): SystemSet {
    return new SystemSet().withRunCriteria(State.onUpdate(label, value))
  }

  public static onEnter<T>(label: string, value: T): SystemSet {
    return new SystemSet().withRunCriteria(State.onEnter(label, value))
  }

  public static onExit<T>(label: string, value: T): SystemSet {
    return new SystemSet().withRunCriteria(State.onExit(label, value))
  }

  public static onPause<T>(label: string, value: T): SystemSet {
    return new SystemSet().withRunCriteria(State.onPause(label, value))
  }

  public static onResume<T>(label: string, value: T): SystemSet {
    return new SystemSet().withRunCriteria(State.onResume(label, value))
  }

  private systems: IntoSystemDescriptor[] = []
  private runCriteria: Maybe<RunCriteria>

  public withRunCriteria(runCriteria: RunCriteria): this {
    this.runCriteria = runCriteria

    return this
  }

  public withSystem(system: IntoSystemDescriptor): this {
    this.systems.push(system)

    return this
  }

  public bake(): SystemDescriptor[] {
    const { systems, runCriteria } = this

    return systems.map(system => {
      if (system instanceof SystemDescriptor) {
        system.runCriteria = runCriteria

        return system
      }

      return new SystemDescriptor(system, runCriteria)
    })
  }
}

class SystemStage implements Stage {
  private stageRunCriteria = new BaseRunCriteria()
  private systems: SystemDescriptor[] = []

  public addSystem(system: IntoSystemDescriptor): this {
    this.systems.push(intoSystemDescriptor(system))

    return this
  }

  public addSystemSet(systemSet: SystemSet): this {
    systemSet.bake().forEach(system => this.addSystem(system))

    return this
  }

  public run(world: World): void {
    const { systems } = this
    let runStageLoop = true

    while (runStageLoop) {
      const shouldRun = this.stageRunCriteria.shouldRun(world)

      switch (shouldRun) {
        case ShouldRun.No: return
        case ShouldRun.Yes: {
          runStageLoop = false

          break
        }
        case ShouldRun.NoAndCheckAgain: continue
        case ShouldRun.YesAndCheckAgain: break
      }

      const runCriteria = systems.map(system => system.runCriteria?.shouldRun(world))

      let runSystemLoop
      let defaultShouldRun = ShouldRun.Yes

      do {
        runSystemLoop = false

        const shouldRun = (value?: ShouldRun): boolean => {
          switch (value ?? defaultShouldRun) {
            case ShouldRun.Yes:
            case ShouldRun.YesAndCheckAgain: return true
            default: return false
          }
        }

        systems.forEach(
          (system, index) => {
            if (shouldRun(runCriteria[index])) {
              system.run(world)
            }
          }
        )

        systems.forEach(
          (system, index) => {
            if (shouldRun(runCriteria[index])) {
              system.applyBuffer(world)
            }
          }
        )

        runCriteria.forEach(
          (value, index) => {
            switch (value) {
              case ShouldRun.Yes: {
                runCriteria[index] = ShouldRun.No

                break
              }
              case ShouldRun.YesAndCheckAgain:
              case ShouldRun.NoAndCheckAgain: {
                runCriteria[index] = systems[index].runCriteria!.shouldRun(world)

                switch (runCriteria[index]) {
                  case ShouldRun.Yes:
                  case ShouldRun.YesAndCheckAgain:
                  case ShouldRun.NoAndCheckAgain: {
                    runSystemLoop = true
                  }
                  default: return
                }
              }
              default: return
            }
          }
        )

        defaultShouldRun = ShouldRun.No
      } while (runSystemLoop)
    }
  }
}

type IntoSystemDescriptor = SystemFunction | SystemDescriptor

interface SystemFunction {
  (
    query: Query,
    commands: Commands,
  ): void
}

class SystemDescriptor {
  private buffer: Command[] = []

  public constructor(
    private system: SystemFunction,
    public runCriteria?: RunCriteria,
  ) {}

  public run(world: World) {
    const commands = new Commands(world, this.buffer)
    const query = new Query(world)

    this.system(
      query,
      commands,
    )
  }

  public applyBuffer(world: World) {
    for (const command of this.buffer) {
      switch (command.type) {
        case CommandType.SpawnEntity: {
          world.components[command.entity] = {}
          break
        }
        case CommandType.DespawnEntity: {
          world.despawn(command.entity)
          break
        }
        case CommandType.InsertResource: {
          world.insertResource(command.resource)
          break
        }
        case CommandType.RemoveResource: {
          world.removeResource(command.resource)
          break
        }
        case CommandType.InsertComponent: {
          world.insertComponent(command.entity, command.component)
          break
        }
        case CommandType.RemoveComponent: {
          world.removeComponent(command.entity, command.component)
          break
        }
        case CommandType.InsertBundle: {
          world.insertBundle(command.entity, command.bundle)
          break
        }
      }
    }

    this.buffer = []
  }
}

function intoSystemDescriptor(system: IntoSystemDescriptor): SystemDescriptor {
  return system instanceof SystemDescriptor ? system : new SystemDescriptor(system)
}

type Maybe<T> = T | undefined

class Option<T> {
  public get isSome(): boolean {
    return this.value !== undefined
  }

  public get isNone(): boolean {
    return !this.isSome
  }

  public constructor(
    private value?: T,
  ) {}

  public take(): Maybe<T> {
    const { value } = this

    this.value = undefined

    return value
  }

  public map<U>(predicate: (value?: T) => U): U {
    return predicate(this.value)
  }
}

function Some<T>(value: T): Option<T> {
  return new Option<T>(value)
}

const None = new Option<never>()

type Class<T> = Function & {
  new (...args: any[]): T
}

interface WithType {
  type: string
}

const ID = () => Math.random().toString(36).slice(2)

type ComponentStore = Record<string, Component>

class World {
  public readonly id = ID()

  public entities = new Entities()
  public components: Record<Entity, ComponentStore> = {}

  public constructor() {
    this.components[this.id] = {}
  }

  public spawn(): Entity {
    const entity = this.entities.alloc()

    this.components[entity] = {}

    return entity
  }

  public despawn(entity: Entity) {
    if (this.entities.contains(entity)) {
      this.entities.free(entity)
      delete this.components[entity]
    }
  }

  public insertBundle(entity: Entity, bundle: Bundle) {
    for (const component of bundle.components) {
      this.insertComponent(entity, component)
    }
  }

  public insertComponent(entity: Entity, component: Component) {
    this.components[entity][component.type] = component
  }

  public removeComponent(entity: Entity, component: WithType) {
    delete this.components[entity][component.type]
  }

  public getComponent<T extends Component>(entity: Entity, component: WithType & Class<T>): Maybe<T> {
    return this.components[entity][component.type] as T
  }

  public insertResource(resource: Component) {
    this.components[this.id][resource.type] = resource
  }

  public removeResource(resource: WithType) {
    delete this.components[this.id][resource.type]
  }

  public getResource<T extends Component>(resource: WithType & Class<T>): Maybe<T> {
    return this.components[this.id][resource.type] as T
  }
}

type END_ECS = undefined
type START_APP = undefined

const enum CoreStage {
  First = 'First',
  Startup = 'Startup',
  PreUpdate = 'PreUpdate',
  Update = 'Update',
  PostUpdate = 'PostUpdate',
  Last = 'Last',
}

const enum StartupStage {
  PreStartup = 'PreStartup',
  Startup = 'Startup',
  PostStartup = 'PostStartup',
}

class App {
  private world: World = new World()
  private schedule: Schedule = new Schedule()
  private runner = runOnce

  public static default() {
    return new App().addDefaultStages()
  }

  public addDefaultStages(): this {
    this.schedule
    .addStage(CoreStage.First, new SystemStage())
    .addStage(
      CoreStage.Startup,
      new Schedule(new RunOnce())
      .addStage(StartupStage.PreStartup, new SystemStage())
      .addStage(StartupStage.Startup, new SystemStage())
      .addStage(StartupStage.PostStartup, new SystemStage()),
    )
    .addStage(CoreStage.PreUpdate, new SystemStage())
    .addStage(CoreStage.Update, new SystemStage())
    .addStage(CoreStage.PostUpdate, new SystemStage())
    .addStage(CoreStage.Last, new SystemStage())

    return this
  }

  public addPlugin(plugin: Plugin): this {
    plugin.build(this)

    return this
  }

  public addState<T>(label: string, initial: T): this {

    this.insertResource(new State<T>(label, initial))
    .addSystemToStage(
      CoreStage.Update,
      State.getDriver<T>(label),
    )

    return this
  }

  public addSystemSetToStage(label: string, systemSet: SystemSet): this {
    this.schedule.addSystemSetToStage(label, systemSet)

    return this
  }

  public addSystemSet(systemSet: SystemSet): this {
    this.addSystemSetToStage(CoreStage.Update, systemSet)

    return this
  }

  public addStage(label: string, stage: Stage): this {
    this.schedule.addStage(label, stage)

    return this
  }

  public addStartupSystemToStage(label: string, system: IntoSystemDescriptor): this {
    this.schedule.stage(
      CoreStage.Startup,
      (stage: Schedule) => {
        stage.addSystemToStage(label, system)
      },
    )

    return this
  }

  public addStartupSystem(system: IntoSystemDescriptor) {
    return this.addStartupSystemToStage(StartupStage.Startup, system)
  }

  public addSystemToStage(label: string, system: IntoSystemDescriptor): this {
    this.schedule.addSystemToStage(label, system)

    return this
  }

  public addSystem(system: IntoSystemDescriptor) {
    return this.addSystemToStage(CoreStage.Update, system)
  }

  public insertResource(resource: Component) {
    this.world.insertResource(resource)

    return this
  }

  public setRunner(runner: (app: App) => void): this {
    this.runner = runner

    return this
  }

  public update(): void {
    this.schedule.run(this.world)
  }

  public run() {
    this.runner(this)
  }
}

function runOnce(app: App): void {
  app.update()
}

interface Plugin {
  build(app: App): void
}

type END_APP = undefined

class Time extends Component {
  ticks: number = 0
}

function udpateTime(query: Query) {
  const time = query.resource(Time)!

  time.ticks++
}

class TimePlugin implements Plugin {
  public build(app: App): void {
    app
    .insertResource(new Time())
    .addSystemToStage(
      CoreStage.First,
      udpateTime,
    )
  }
}

class Sprite extends Component {
  public index = 0
  public offset = 0
  public colorkey = -1

  public constructor(initial: Partial<Sprite> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class Transform extends Component {
  public x = 0
  public y = 0
  public scale = 1
  public flip: 0 | 1 | 2 | 3 = 0
  public rotate: 0 | 1 | 2 | 3 = 0

  public constructor(initial: Partial<Transform> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class GlobalTransform extends Transform {}

class SpriteBundle extends Bundle {
  public sprite = new Sprite()
  public transform = new Transform()
  public globalTransform = new GlobalTransform()

  public constructor(initial: Partial<SpriteBundle> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class Window {
  protected duration?: number

  public get alive(): boolean {
    return this.duration === undefined || this.duration > 0
  }

  public set alive(value: boolean) {
    if (value) {
      this.duration = undefined
    } else {
      this.duration = 0
    }
  }

  public constructor(
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private foreground: number,
    private background: number,
    private text: string[],
  ) {}

  public update(): void {
    if (this.duration !== undefined) {
      this.duration--
    }
  }

  public draw(): void {
    rect(
      this.x,
      this.y,
      this.width,
      this.height,
      this.background,
    )
    rectb(
      this.x + 1,
      this.y + 1,
      this.width - 2,
      this.height - 2,
      this.foreground,
    )

    let x = this.x + 4
    let y = this.y + 4

    clip(x, y, this.width - 8, this.height - 8)

    this.text.forEach(
      (line) => {
        print(line, x, y, this.foreground)
        y += 8
      }
    )

    clip()
  }
}

class Toast extends Window {
  public constructor(message: string, duration: number) {
    const text = ` ${message} `
    const width = print(text, 0, -8)

    super(
      120 - width / 2, 61,
      width, 14,
      7, 0,
      [text],
    )

    this.duration = duration
  }
}

class Dialog extends Window {
  public constructor(text: string[]) {
    let maxWidth = 0

    for (const line of text) {
      maxWidth = Math.max(maxWidth, print(line, 0, -8))
    }

    const width = Math.min(maxWidth, 120)
    const height = text.length * 8

    super(
      120 - width / 2,
      68 - height / 2,
      width,
      height,
      7, 0,
      text,
    )
  }
}

class WindowManager extends Component {
  private windows: Window[] = []

  public get currentDialog(): Dialog | undefined {
    for (const window of this.windows) {
      if (window instanceof Dialog) {
        return window
      }
    }
  }

  public add(window: Window) {
    this.windows.push(window)
  }

  public toast(message: string, duration: number = 120): void {
    this.add(new Toast(message, duration))
  }

  public dialog(text: string[]): void {
    if (this.currentDialog === undefined) {
      this.add(new Dialog(text))
    }
  }

  public update(): void {
    this.windows.forEach(
      window => window.update()
    )

    this.windows = this.windows.filter(window => window.alive)
  }

  public draw(): void {
    this.windows.forEach(
      window => window.draw()
    )
  }
}

function updateWindows(query: Query): void {
  const windows = query.resource(WindowManager)!

  windows.update()
}

function clearScreen(): void {
  cls(1)
  map()
}

function render(query: Query): void {
  const entities = query.entities(Sprite, GlobalTransform)

  for (const entity of entities) {
    const {
      index,
      offset,
      colorkey,
    } = query.component(entity, Sprite)!
    const {
      x,
      y,
      scale,
      flip,
      rotate,
    } = query.component(entity, GlobalTransform)!

    spr(
      index + offset,
      x, y,
      colorkey,
      scale,
      flip,
      rotate,
    )
  }
}

function renderWindows(query: Query): void {
  const windowManager = query.resource(WindowManager)!

  windowManager.draw()
}

const enum RenderStage {
  Render = 'Render',
  PostRender = 'PostRender',
}

class RenderPlugin implements Plugin {
  public build(app: App): void {
    app
    .insertResource(new WindowManager())
    .addStage(
      'Render',
      new Schedule()
      .addStage(
        RenderStage.Render,
        new SystemStage()
        .addSystem(clearScreen)
        .addSystem(render)
        .addSystem(renderWindows),
      ),
    )
    .addStage(
      RenderStage.PostRender,
      new SystemStage().addSystem(updateWindows),
    )
  }
}

class DefaultPlugins implements Plugin {
  public build(app: App): void {
    app
    .addPlugin(new TimePlugin())
    .addPlugin(new RenderPlugin())
  }
}

class AnimationProgress extends Component {
  public value = 1
  public step = 0.125

  public constructor(initial: Partial<AnimationProgress> = {}) {
    super()
    Object.assign(this, initial)
  }
}

function updateAnimationProgress(query: Query): void {
  const animationProgress = query.resource(AnimationProgress)!
  const { value, step } = animationProgress

  animationProgress.value = Math.min(1, value + step)
}

function shouldUpdateAnimationProgressRun(world: World): ShouldRun {
  const { value } = world.getResource(AnimationProgress)!

  if (value < 1) {
    return ShouldRun.Yes
  }

  return ShouldRun.No
}

function checkAnimationProgress(query: Query): void {
  const { value } = query.resource(AnimationProgress)!

  if (value >= 1) {
    query.resource<State<AppState>>(State.withLabel('AppState'))!.pop()
  }
}

class AnimationPlugin implements Plugin {
  public build(app: App): void {
    app
    .insertResource(new AnimationProgress())
    .addSystem(
      new SystemDescriptor(
        updateAnimationProgress,
        new BaseRunCriteria()
        .set(shouldUpdateAnimationProgressRun),
      )
    )
  }
}

interface MoveCharacteristic {
  axis: 'x' | 'y'
  delta: -1 | 1
}

class MoveCharacteristics extends Component {
  public characteristics: MoveCharacteristic[] = [
    {
      axis: 'y',
      delta: -1,
    },
    {
      axis: 'y',
      delta: 1,
    },
    {
      axis: 'x',
      delta: -1,
    },
    {
      axis: 'x',
      delta: 1,
    },
  ]
}

class SpriteAnimation extends Component {
  public frames = 2

  public constructor(initial: Partial<SpriteAnimation> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class TransformAnimation extends Component {
  public x = 0
  public y = 0
  public progress = 0

  public constructor(initial: Partial<TransformAnimation> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class Player extends Component {}

class PlayerBundle extends Bundle {
  public sprite = new SpriteBundle()
  public spriteAnimation = new SpriteAnimation()
  public transformAnimation = new TransformAnimation()
  public player = new Player()

  public constructor(initial: Partial<PlayerBundle> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class InputBuffer extends Component {
  public value: Option<number> = None
}

const enum AppState {
  Turn,
  Walk,
  Bump,
  IntroDialog,
  GameOver,
}

const app = App.default()

app
.addPlugin(new DefaultPlugins())
.addPlugin(new AnimationPlugin())
.addState<AppState>('AppState', AppState.Turn)
.insertResource(new MoveCharacteristics())
.insertResource(new InputBuffer())
.addStartupSystem(setup)
.addSystem(bufferInput)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.Turn)
  .withSystem(movePlayer)
)
.addSystemSet(
  SystemSet
  .onEnter('AppState', AppState.Walk)
  .withSystem(initializeWalkAnimation)
)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.Walk)
  .withSystem(updateWalkAnimation)
  .withSystem(checkAnimationProgress)
)
.addSystemSet(
  SystemSet
  .onExit('AppState', AppState.Walk)
  .withSystem(resetTransformAnimation)
)
.addSystemSet(
  SystemSet
  .onEnter('AppState', AppState.Bump)
  .withSystem(initializeBumpAnimation)
)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.Bump)
  .withSystem(updateBumpAnimation)
  .withSystem(checkAnimationProgress)
)
.addSystemSet(
  SystemSet
  .onExit('AppState', AppState.Bump)
  .withSystem(resetTransformAnimation)
)
.addSystemSet(
  SystemSet
  .onResume('AppState', AppState.IntroDialog)
  .withSystem(initializeIntroDialog)
)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.IntroDialog)
  .withSystem(updateIntroDialog)
)
.addSystemSet(
  SystemSet
  .onExit('AppState', AppState.IntroDialog)
)
.addSystemToStage(
  CoreStage.PostUpdate,
  animateSprites,
)
.addSystemToStage(
  CoreStage.PostUpdate,
  calculateMovement,
)

function setup(
  _query: Query,
  commands: Commands,
): void {
  commands
  .spawnBundle(
    new PlayerBundle({
      sprite: new SpriteBundle({
        sprite: new Sprite({ index: 256 }),
        transform: new Transform({ x: 1, y: 1 }),
      }),
      spriteAnimation: new SpriteAnimation({ frames: 4 }),
    })
  )
}

function bufferInput(query: Query): void {
  const buffer = query.resource(InputBuffer)!

  if (buffer.value.isNone) {
    for (let i = 0; i < 8; i++) {
      if (btnp(i, 9, 1)) {
        buffer.value = Some(i)

        break
      }
    }
  }
}

function movePlayer(query: Query): void {
  const { characteristics } = query.resource(MoveCharacteristics)!
  const state = query.resource<State<AppState>>(State.withLabel('AppState'))!
  const input = query.resource(InputBuffer)!.value.take()

  if (input !== undefined && input < characteristics.length) {
    const entities = query.entities(Transform, TransformAnimation, Player)
    const { axis, delta } = characteristics[input]

    for (const entity of entities) {
      const transform = query.component(entity, Transform)!
      const transformAnimation = query.component(entity, TransformAnimation)!
      const next = Object.assign({}, transform)

      next[axis] += delta

      const tile = mget(next.x, next.y)

      if (axis === 'x') {
        transform.flip = delta < 0 ? 1 : 0
      }

      transformAnimation[axis] = delta

      if (fget(tile, 0)) {
        if (fget(tile, 1)) {
          switch (tile) {
            case 6: {
              // sfx()

              state.immediatePush(AppState.IntroDialog)

              break
            }
            case 7:
            case 8: {
              sfx(59)
              mset(next.x, next.y, 1)

              break
            }
            case 10:
            case 12: {
              sfx(61)
              mset(next.x, next.y, tile - 1)

              break
            }
            case 13: {
              sfx(62)
              mset(next.x, next.y, 1)

              break
            }
          }
        }
        state.push(AppState.Bump)
      } else {
        sfx(63)
        state.push(AppState.Walk)
      }
    }
  }
}

function animateSprites(query: Query): void {
  const { ticks } = query.resource(Time)!
  const entities = query.entities(Sprite, SpriteAnimation)

  for (const entity of entities) {
    const sprite = query.component(entity, Sprite)!
    const { frames } = query.component(entity, SpriteAnimation)!

    sprite.offset = Math.floor(ticks / 15) % frames
  }
}

function initializeWalkAnimation(query: Query): void {
  const animationProgress = query.resource(AnimationProgress)!
  const entities = query.entities(Transform, TransformAnimation)

  animationProgress.value = 0

  for (const entity of entities) {
    const transform = query.component(entity, Transform)!
    const transformAnimation = query.component(entity, TransformAnimation)!
    const { x, y } = transformAnimation

    transform.x += x
    transform.y += y
    transformAnimation.x = -x | 0
    transformAnimation.y = -y | 0
    transformAnimation.progress = 1
  }
}

function updateWalkAnimation(query: Query): void {
  const { value: progress } = query.resource(AnimationProgress)!
  const entities = query.entities(TransformAnimation)

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!

    transformAnimation.progress = 1 - progress
  }
}

function initializeBumpAnimation(query: Query): void {
  const animationProgress = query.resource(AnimationProgress)!
  const entities = query.entities(Transform, TransformAnimation)

  animationProgress.value = 0

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!
    const { x, y } = transformAnimation

    transformAnimation.x = x
    transformAnimation.y = y
    transformAnimation.progress = 0
  }
}

function updateBumpAnimation(query: Query): void {
  const { value: progress } = query.resource(AnimationProgress)!
  const entities = query.entities(TransformAnimation)

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!

    if (progress < 0.5) {
      transformAnimation.progress = progress
    } else {
      transformAnimation.progress = 1 - progress
    }
  }
}

function resetTransformAnimation(query: Query): void {
  const entities = query.entities(TransformAnimation)

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!

    transformAnimation.x = 0
    transformAnimation.y = 0
  }
}

function initializeIntroDialog(query: Query): void {
  const manager = query.resource(WindowManager)!

  manager.dialog(
    [
      'Welcome to the world',
      'of Porklike!',
    ],
  )
}

function updateIntroDialog(query: Query): void {
  if (btn(4)) {
    const state = query.resource<State<AppState>>(State.withLabel('AppState'))!
    const manager = query.resource(WindowManager)!

    manager.currentDialog!.alive = false

    state.pop()
  }
}

function calculateMovement(query: Query): void {
  const entities = query.entities(Transform, TransformAnimation, GlobalTransform)

  for (const entity of entities) {
    const transform = query.component(entity, Transform)!
    const { x, y, progress } = query.component(entity, TransformAnimation)!
    const globalTransform = query.component(entity, GlobalTransform)!

    Object.assign(
      globalTransform,
      transform,
      {
        x: x * progress * 8 + transform.x * 8,
        y: y * progress * 8 + transform.y * 8,
      },
    )
  }
}

function TIC() {
  app.run()
}

let frame: number
const tileData = [
  [false, false], // 0: Empty
  [true, false], // 1: Floor
  [false, false], // 2: Wall
  [false, false], // 3: Empty
  [false, false], // 4: Empty
  [false, false], // 5: Empty
  [true, true], // 6: Stone Tablet
]
const mapData = [
  [2, 2, 2],
  [2, 1, 2],
  [2, 6, 2],
  [2, 2, 2]
]
const inputFrames = [
  [false, false, false, false, false, false, false, false, false, false, false],
  [true, false, false, false, false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false, false, false, false, true],
  [false, false, false, false, false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false, false, false, false, false],
]

function map(...args: any[]) {
  console.log(`map(${args.join(', ')})`)
}
function mset(...args: any[]) {
  console.log(`mset(${args.join(', ')})`)
}
function mget(...args: any[]) {
  const [x, y] = args
  const result = mapData[y][x]

  console.log(`mget(${args.join(', ')}) => ${result}`)

  return result
}
function fget(...args: any[]) {
  const [tile, flag] = args
  const result = tileData[tile][flag]

  console.log(`fget(${args.join(', ')}) => ${result}`)

  return result
}
function clip(...args: any[]) {
  console.log(`clip(${args.join(', ')})`)
}
function cls(...args: any[]) {
  console.log(`cls(${args.join(', ')})`)
}
function spr(...args: any[]) {
  console.log(`spr(${args.join(', ')})`)
}
function rect(...args: any[]) {
  console.log(`rect(${args.join(', ')})`)
}
function rectb(...args: any[]) {
  console.log(`rectb(${args.join(', ')})`)
}
function sfx(...args: any[]) {
  console.log(`sfx(${args.join(', ')})`)
}
function btn(...args: any[]) {
  const [button] = args
  const result = inputFrames[button][frame]

  console.log(`btn(${args.join(', ')}) => ${result}`)

  return result
}
function btnp(...args: any[]) {
  const [button] = args
  const result = inputFrames[button][frame]

  console.log(`btnp(${args.join(', ')}) => ${result}`)

  return result
}
function print(...args: any[]): number {
  const result = args[0].length

  console.log(`print(${args.join(', ')}) => ${result}`)

  return result
}
function trace(...args: any[]) {
  console.log(`trace(${args.join(', ')})`)
}

for (frame = 0; frame < inputFrames[0].length; frame++) {
  console.log(`==> Start Frame: ${frame} <==`)
  TIC()
  console.log(`==> End Frame: ${frame} <==`)
}
