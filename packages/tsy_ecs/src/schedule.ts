import {
  BaseRunCriteria,
  RunCriteria,
  ShouldRun,
} from './run-criteria'
import { Stage } from './stage'
import { IntoSystemDescriptor } from './system'
import { SystemSet } from './system-set'
import { SystemStage } from './system-stage'
import { World } from './world'

export class Schedule implements Stage {
  private order: string[] = []
  private stages = new Map<string, Stage>()

  public constructor(
    private readonly runCriteria: RunCriteria = new BaseRunCriteria(),
  ) {}

  public addStage(label: string, stage: Stage): this {
    this.order.push(label)
    this.stages.set(label, stage)

    return this
  }

  public getStage<S extends Stage>(label: string): S | undefined {
    return this.stages.get(label) as S
  }

  public stage<S extends Stage>(label: string, action: (stage: S) => void): this {
    const stage = this.getStage<S>(label)

    if (stage) {
      action(stage)
    }

    return this
  }

  public addSystemToStage(label: string, system: IntoSystemDescriptor): void {
    const stage = this.getStage<SystemStage>(label)

    if (stage) {
      stage.addSystem(system)
    }
  }

  public addSystemSetToStage(label: string, systemSet: SystemSet): void {
    this.stage(label, (stage: SystemStage) => {
      stage.addSystemSet(systemSet)
    })
  }

  public runOnce(world: World): void {
    console.log('==> Schedule Start <==')
    for (const label of this.order) {
      console.log(`  ==> ${label} <==`)
      let stage = this.stages.get(label)!

      stage.run(world)
    }
    console.log('==> Schedule End <==')
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
