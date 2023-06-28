import { Bundle } from './bundle'
import { Component } from './component'
import {
  Entities,
  Entity,
} from './entity'
import {
  Class,
  ID,
  Maybe,
  WithType,
} from './utilities'

export type ComponentStore = Map<string, Component>

export class World {
  public readonly id = ID()

  public entities = new Entities()
  public components = new Map<Entity, ComponentStore>()

  public constructor() {
    this.components.set(this.id, new Map())
  }

  public spawn(): Entity {
    const entity = this.entities.alloc()

    this.components.set(entity, new Map())

    return entity
  }

  public despawn(entity: Entity): void {
    if (this.entities.contains(entity)) {
      this.entities.free(entity)
      this.components.delete(entity)
    }
  }

  public insertBundle(entity: Entity, bundle: Bundle) {
    for (const component of bundle.components) {
      this.insertComponent(entity, component)
    }
  }

  public insertComponent(entity: Entity, component: Component): void {
    this.components.get(entity)!.set(component.type, component)
  }

  public removeComponent(entity: Entity, component: WithType): void {
    this.components.get(entity)!.delete(component.type)
  }

  public getComponent<T extends Component>(entity: Entity, component: WithType & Class<T>): Maybe<T> {
    return this.components.get(entity)!.get(component.type) as T
  }

  public insertResource(component: Component): void {
    this.components.get(this.id)!.set(component.type, component)
  }

  public removeResource(component: WithType): void {
    this.components.get(this.id)!.delete(component.type)
  }

  public getResource<T extends Component>(component: WithType & Class<T>): Maybe<T> {
    return this.components.get(this.id)!.get(component.type) as T
  }
}
