import { ID } from "./utilities"

export type Entity = string

export class Entities {
  private entities = new Set<Entity>()

  public alloc(): Entity {
    const entity = ID()

    this.entities.add(entity)

    return entity
  }

  public free(entity: Entity): void {
    this.entities.delete(entity)
  }

  public contains(entity: Entity): boolean {
    return this.entities.has(entity)
  }

  public all(): Entity[] {
    return [...this.entities]
  }
}
