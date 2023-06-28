import { Component } from '../src/component'
import { World } from '../src/world'

class Time extends Component<Time> {
  public ticks = 0
}

class Transform extends Component<Transform> {
  public x!: number
  public y!: number
  public scale!: number

  public constructor(properties?: Partial<Transform>) {
    super(
      {
        x: 0,
        y: 0,
        scale: 1,
      },
      properties,
    )
  }
}

describe('World', () => {
  it('creates and destroys entities', () => {
    const world = new World()
    const entity = world.spawn()

    expect(entity).toBeDefined()
    expect(world.entities.has(entity)).toBe(true)

    world.despawn(entity)

    expect(world.entities.has(entity)).toBe(false)
    expect(world.entities.size).toBe(0)

    world.despawn(entity)

    expect(world.entities.has(entity)).toBe(false)
    expect(world.entities.size).toBe(0)
  })

  it('stores, retrieves and removes components', () => {
    const world = new World()
    const entity = world.spawn()
    const transform = new Transform({
      x: 96,
      y: 64,
    })

    world.insertComponent(entity, transform)

    expect(world.getComponent(entity, Transform)).toBeDefined()
    expect(world.getComponent(entity, Transform)).toBe(transform)
    expect(world.getComponent(entity, Transform)!.x).toBe(96)
    expect(world.getComponent(entity, Transform)!.y).toBe(64)

    world.removeComponent(entity, Transform)

    expect(world.getComponent(entity, Transform)).toBeUndefined()
  })

  it('stores, retrieves and removes resources', () => {
    const world = new World()
    const time = new Time()

    world.insertResource(time)

    expect(world.getResource(Time)).toBeDefined()
    expect(world.getResource(Time)).toBe(time)

    world.removeResource(Time)

    expect(world.getResource(Time)).toBeUndefined()
  })
})
