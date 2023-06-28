import { Bundle } from './bundle'
import {
  Commands,
  CommandType,
} from './commands'
import { Component } from './component'
import { Entity } from './entity'
import {
  Class,
  WithType,
} from './utilities'

export class EntityCommands {
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
