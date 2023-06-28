import { Commands } from './commands'
import { Query } from './query'
import {
  BaseRunCriteria,
  ShouldRun,
} from './run-criteria'
import { Stage } from './stage'
import {
  IntoSystemDescriptor,
  SystemDescriptor,
  intoSystemDescriptor,
} from './system'
import { SystemSet } from './system-set'
import { World } from './world'

export class SystemStage implements Stage {
  private stageRunCriteria = new BaseRunCriteria()
  private systems: Set<SystemDescriptor> = new Set()

  public addSystem(system: IntoSystemDescriptor): this {
    this.systems.add(intoSystemDescriptor(system))

    return this
  }

  public addSystemSet(systemSet: SystemSet): this {
    systemSet.bake().forEach(system => this.addSystem(system))

    return this
  }

  public run(world: World): void {
    const systems = [...this.systems]
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

        function shouldRun(value?: ShouldRun): boolean {
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
