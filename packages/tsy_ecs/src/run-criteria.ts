import { World } from "./world"

export enum ShouldRun {
  Yes,
  No,
  YesAndCheckAgain,
  NoAndCheckAgain,
}

interface RunCriteriaSystem {
  (world: World): ShouldRun
}

export interface RunCriteria {
  shouldRun: RunCriteriaSystem
}

export class BaseRunCriteria implements RunCriteria {
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

export class RunOnce implements RunCriteria {
  private ran = false

  public shouldRun(): ShouldRun {
    if (this.ran) {
      return ShouldRun.No
    }

    this.ran = true

    return ShouldRun.Yes
  }
}
