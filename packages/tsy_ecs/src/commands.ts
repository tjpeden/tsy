import { Bundle } from './bundle'
import { Component } from './component'
import {
  Entities,
  Entity,
} from './entity'
import { EntityCommands } from './entity-commands'
import {
  Class,
  WithType,
} from './utilities'
import { World } from './world'

export const enum CommandType {
  SpawnEntity,
  DespawnEntity,
  InsertResource,
  RemoveResource,
  InsertComponent,
  RemoveComponent,
  InsertBundle,
}

export interface SpawnEntity {
  type: CommandType.SpawnEntity
  entity: Entity
}

export interface DespawnEntity {
  type: CommandType.DespawnEntity
  entity: Entity
}

export interface InsertResource {
  type: CommandType.InsertResource
  resource: Component
}

export interface RemoveResource {
  type: CommandType.RemoveResource
  resource: WithType & Class<Component>
}

export interface InsertComponent {
  type: CommandType.InsertComponent
  entity: Entity
  component: Component
}

export interface RemoveComponent {
  type: CommandType.RemoveComponent
  entity: Entity
  component: WithType & Class<Component>
}

export interface InsertBundle {
  type: CommandType.InsertBundle
  entity: Entity
  bundle: Bundle
}

export type Command =
| SpawnEntity
| DespawnEntity
| InsertResource
| RemoveResource
| InsertComponent
| RemoveComponent
| InsertBundle

export class Commands {
  private entities: Entities

  public constructor(
    world: World,
    private queue: Command[],
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
