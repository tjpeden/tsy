import { RunCriteria } from './run-criteria'
import { State } from './state'
import {
  IntoSystemDescriptor,
  SystemDescriptor,
} from './system'
import { Maybe } from './utilities'

export class SystemSet {
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

  private systems: Set<IntoSystemDescriptor> = new Set()
  private runCriteria: Maybe<RunCriteria>

  public withRunCriteria(runCriteria: RunCriteria): this {
    this.runCriteria = runCriteria

    return this
  }

  public withSystem(system: IntoSystemDescriptor): this {
    this.systems.add(system)

    return this
  }

  public bake(): SystemDescriptor[] {
    const { systems, runCriteria } = this

    return [...systems].map(system => {
      if (system instanceof SystemDescriptor) {
        if (runCriteria) {
          system.runCriteria = runCriteria
        }

        return system
      }

      return new SystemDescriptor(system, runCriteria)
    })
  }
}
