import { Component } from '../src/component'
import { Commands } from '../src/commands'
import { EntityCommands } from '../src/entity-commands'
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

describe('Commands', () => {
  test('insertResource', () => {
    const world = new World()
    const commands = new Commands(world)
    const time = new Time()

    commands.insertResource(time)
    commands.apply()

    expect(world.getResource(Time)).toBeDefined()
    expect(world.getResource(Time)).toBe(time)
  })

  test('removeResource', () => {
    const world = new World()
    const commands = new Commands(world)
    const time = new Time()

    commands.insertResource(time)
    commands.apply()

    expect(world.getResource(Time)).toBeDefined()
    expect(world.getResource(Time)).toBe(time)

    commands.removeResource(Time)
    commands.apply()

    expect(world.getResource(Time)).toBeUndefined()
  })

  test('entity', () => {
    const world = new World()
    const entity = world.spawn()
    const commands = new Commands(world)

    expect(commands.entity(entity)).toEqual(new EntityCommands(commands, entity))

    expect(() => commands.entity('invalid')).toThrow('Entity invalid does not exist in the world.')
  })

  test('getOrSpawn', () => {
    let entity: EntityCommands
    const world = new World()
    const commands = new Commands(world)

    entity = commands.getOrSpawn('invalid')

    const id = entity.id()

    expect(entity).toBeDefined()
    expect(id).not.toBe('invalid')
    expect(world.entities.has(id)).toBe(true)

    entity = commands.getOrSpawn(id)

    expect(entity).toBeDefined()
    expect(entity.id()).toBe(id)
    expect(world.entities.has(entity.id())).toBe(true)
  })

  test('spawn', () => {
    const world = new World()
    const commands = new Commands(world)
    const entity = commands.spawn()

    expect(entity).toBeDefined()
    expect(world.entities.has(entity.id())).toBe(true)
  })
})

describe('EntityCommands', () => {
  test('insert', () => {
    const world = new World()
    const entity = world.spawn()
    const commands = new Commands(world)
    const transform = new Transform()

    commands.entity(entity).insert(transform)
    commands.apply()

    expect(world.getComponent(entity, Transform)).toBeDefined()
    expect(world.getComponent(entity, Transform)).toBe(transform)
  })

  test('remove', () => {
    const world = new World()
    const entity = world.spawn()
    const commands = new Commands(world)
    const transform = new Transform()

    commands.entity(entity).insert(transform)
    commands.apply()

    commands.entity(entity).remove(Transform)
    commands.apply()

    expect(world.getComponent(entity, Transform)).toBeUndefined()
  })

  test('despawn', () => {
    const world = new World()
    const entity = world.spawn()
    const commands = new Commands(world)

    commands.entity(entity).despawn()
    commands.apply()

    expect(world.entities.has(entity)).toBe(false)
  })
})
