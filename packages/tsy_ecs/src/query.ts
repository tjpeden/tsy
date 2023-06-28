import { Component } from './component'
import { Entity } from './entity'
import {
  Class,
  WithType,
} from './utilities'
import { World } from "./world"

export class Query {
  public constructor(
    private readonly world: World,
  ) {}

  public entities(...components: (WithType & Class<Component>)[]): Entity[] {
    return this.world.entities.all().filter(
      entity => {
        return components.every(
          component => this.world.getComponent(entity, component) !== undefined,
        )
      }
    )
  }

  public component<T extends Component>(entity: Entity, component: WithType & Class<T>): T | undefined {
    return this.world.getComponent(entity, component)
  }

  public resource<T extends Component>(component: WithType & Class<T>): T | undefined {
    return this.world.getResource(component)
  }
}
