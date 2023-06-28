import {
  Component,
  RunOnce,
  Schedule,
  State,
  IntoSystemDescriptor,
  SystemSet,
  SystemStage,
  World,
} from '@tsy/ecs'

import { Plugin } from './plugin'

export const enum CoreStage {
  First = 'First',
  Startup = 'Startup',
  PreUpdate = 'PreUpdate',
  Update = 'Update',
  PostUpdate = 'PostUpdate',
  Last = 'Last',
}

export const enum StartupStage {
  PreStartup = 'PreStartup',
  Startup = 'Startup',
  PostStartup = 'PostStartup',
}

export class App {
  private world = new World()
  private schedule = new Schedule()
  private runner = runOnce

  public static default(): App {
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

  public addStage(label: string, stage: Schedule): this {
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

  public addStartupSystem(system: IntoSystemDescriptor): this {
    this.addStartupSystemToStage(StartupStage.Startup, system)

    return this
  }

  public addSystemToStage(label: string, system: IntoSystemDescriptor): this {
    this.schedule.addSystemToStage(label, system)

    return this
  }

  public addSystem(system: IntoSystemDescriptor): this {
    this.addSystemToStage(CoreStage.Update, system)

    return this
  }

  public insertResource(resource: Component): this {
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

  public run(): void {
    this.runner(this)
  }
}

function runOnce(app: App): void {
  app.update()
}
