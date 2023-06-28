import {
  Command,
  Commands,
  CommandType,
} from './commands'
import { Query } from './query'
import {
  BaseRunCriteria,
  RunCriteria,
} from './run-criteria'
import { World } from './world'

export type IntoSystemDescriptor = SystemFunction | SystemDescriptor

export interface SystemFunction {
  (commands: Commands, query: Query): void
}

export class SystemDescriptor {
  private buffer: Command[] = []

  public constructor(
    private system: SystemFunction,
    public runCriteria?: RunCriteria,
  ) {}

  public run(world: World) {
    const commands = new Commands(world, this.buffer)
    const query = new Query(world)

    this.system(commands, query)
  }

  public applyBuffer(world: World) {
    for (const command of this.buffer) {
      switch (command.type) {
        case CommandType.SpawnEntity: {
          world.components.set(command.entity, new Map())
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

export function intoSystemDescriptor(system: IntoSystemDescriptor): SystemDescriptor {
  return system instanceof SystemDescriptor ? system : new SystemDescriptor(system)
}
