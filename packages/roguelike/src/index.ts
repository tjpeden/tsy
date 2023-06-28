import {
  App,
  CoreStage,
  Plugin,
} from '@tsy/app'
import {
  BaseRunCriteria,
  Bundle,
  Commands,
  Component,
  Query,
  Schedule,
  ShouldRun,
  State,
  SystemDescriptor,
  SystemSet,
  SystemStage,
  World,
} from '@tsy/ecs'

class Time extends Component {
  ticks: number = 0
}

function udpateTime(_commands: Commands, query: Query) {
  const time = query.resource(Time)!

  time.ticks++
}

class TimePlugin implements Plugin {
  public build(app: App): void {
    app
    .insertResource(new Time())
    .addSystemToStage(
      CoreStage.First,
      udpateTime,
    )
  }
}

class Sprite extends Component {
  public index = 0
  public offset = 0
  public colorkey = -1

  public constructor(initial: Partial<Sprite> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class Transform extends Component {
  public x = 0
  public y = 0
  public scale = 1
  public flip: 0 | 1 | 2 | 3 = 0
  public rotate: 0 | 1 | 2 | 3 = 0

  public constructor(initial: Partial<Transform> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class GlobalTransform extends Transform {}

class SpriteBundle extends Bundle {
  public sprite = new Sprite()
  public transform = new Transform()
  public globalTransform = new GlobalTransform()

  public constructor(initial: Partial<SpriteBundle> = {}) {
    super()
    Object.assign(this, initial)
  }
}

const enum RenderStage {
  PreRender = 'PreRender',
  Render = 'Render',
}

function prerender(): void {
  cls(1)
  map()
}

function render(_commands: Commands, query: Query): void {
  const entities = query.entities(Sprite, GlobalTransform)

  for (const entity of entities) {
    const {
      index,
      offset,
      colorkey,
    } = query.component(entity, Sprite)!
    const {
      x,
      y,
      scale,
      flip,
      rotate,
    } = query.component(entity, GlobalTransform)!

    spr(
      index + offset,
      x, y,
      colorkey,
      scale,
      flip,
      rotate,
    )
  }
}

class RenderPlugin implements Plugin {
  public build(app: App): void {
    app
    .addStage(
      'Render',
      new Schedule()
      .addStage(
        RenderStage.PreRender,
        new SystemStage().addSystem(prerender),
      )
      .addStage(
        RenderStage.Render,
        new SystemStage().addSystem(render),
      ),
    )
  }
}

class DefaultPlugins implements Plugin {
  public build(app: App): void {
    app
    .addPlugin(new TimePlugin())
    .addPlugin(new RenderPlugin())
  }
}

class AnimationProgress extends Component {
  public value = 0
  public step = 0.125

  public constructor(initial: Partial<AnimationProgress> = {}) {
    super()
    Object.assign(this, initial)
  }
}

function shouldUpdateAnimationRun(world: World): ShouldRun {
  const { value } = world.getResource(AnimationProgress)!

  if (value < 1) {
    return ShouldRun.Yes
  }

  world.getResource<State<AppState>>(State.withLabel('AppState'))!.pop()

  return ShouldRun.No
}

function updateAnimationProgress(_commands: Commands, query: Query) {
  const animationProgress = query.resource(AnimationProgress)!
  const { value, step } = animationProgress

  animationProgress.value = Math.min(1, value + step)
}

class AnimationPlugin implements Plugin {
  public build(app: App): void {
    app
    .insertResource(new AnimationProgress())
    .addSystem(
      new SystemDescriptor(
        updateAnimationProgress,
        new BaseRunCriteria().set(shouldUpdateAnimationRun),
      )
    )
  }
}

interface MoveCharacteristic {
  axis: 'x' | 'y'
  delta: -1 | 1
}

class MoveCharacteristics extends Component {
  public characteristics: MoveCharacteristic[] = [
    {
      axis: 'y',
      delta: -1,
    },
    {
      axis: 'y',
      delta: 1,
    },
    {
      axis: 'x',
      delta: -1,
    },
    {
      axis: 'x',
      delta: 1,
    },
  ]
}

class SpriteAnimation extends Component {
  public frames = 2

  public constructor(initial: Partial<SpriteAnimation> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class TransformAnimation extends Component {
  public x = 0
  public y = 0
  public progress = 0

  public constructor(initial: Partial<TransformAnimation> = {}) {
    super()
    Object.assign(this, initial)
  }
}

class Player extends Component {}

class PlayerBundle extends Bundle {
  public sprite = new SpriteBundle()
  public spriteAnimation = new SpriteAnimation()
  public transformAnimation = new TransformAnimation()
  public player = new Player()

  public constructor(initial: Partial<PlayerBundle> = {}) {
    super()
    Object.assign(this, initial)
  }
}

const enum AppState {
  Turn,
  Walk,
  Bump,
  GameOver,
}

const app = App.default()

app
.addPlugin(new DefaultPlugins())
.addPlugin(new AnimationPlugin())
.addState<AppState>('AppState', AppState.Turn)
.insertResource(new MoveCharacteristics())
.insertResource(new AnimationProgress())
.addStartupSystem(setup)
.addSystemToStage(
  CoreStage.PostUpdate,
  animateSprites,
)
.addSystemToStage(
  CoreStage.PostUpdate,
  calculateMovement,
)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.Turn)
  .withSystem(movePlayer)
)
.addSystemSet(
  SystemSet
  .onEnter('AppState', AppState.Walk)
  .withSystem(initializeWalkAnimation)
)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.Walk)
  .withSystem(updateWalkAnimation)
)
// .addSystemSet(
//   SystemSet
//   .onExit('AppState', AppState.Walk)
//   .withSystem(resetTransformAnimation)
// )
.addSystemSet(
  SystemSet
  .onEnter('AppState', AppState.Bump)
  .withSystem(initializeBumpAnimation)
)
.addSystemSet(
  SystemSet
  .onUpdate('AppState', AppState.Bump)
  .withSystem(updateBumpAnimation)
)
// .addSystemSet(
//   SystemSet
//   .onExit('AppState', AppState.Bump)
//   .withSystem(resetTransformAnimation)
// )

function setup(commands: Commands) {
  commands
  .spawnBundle(
    new PlayerBundle({
      sprite: new SpriteBundle({
        sprite: new Sprite({ index: 256 }),
        transform: new Transform({ x: 8, y: 5 }),
      }),
      spriteAnimation: new SpriteAnimation({ frames: 4 }),
    })
  )
}

function movePlayer(_commands: Commands, query: Query) {
  const state = query.resource<State<AppState>>(State.withLabel('AppState'))!
  const { characteristics } = query.resource(MoveCharacteristics)!
  const characteristic = characteristics.find((_, i) => btnp(i, 12, 6))

  if (characteristic) {
    const entities = query.entities(Transform, TransformAnimation, Player)
    const { axis, delta } = characteristic

    for (const entity of entities) {
      const transform = query.component(entity, Transform)!
      const transformAnimation = query.component(entity, TransformAnimation)!
      const next = Object.assign({}, transform)

      next[axis] += delta

      const tile = mget(next.x, next.y)

      if (axis === 'x') {
        transform.flip = delta < 0 ? 1 : 0
      }

      transformAnimation[axis] = delta

      if (fget(tile, 0)) {
        state.push(AppState.Bump)
      } else {
        state.push(AppState.Walk)
      }
    }
  }
}

function animateSprites(_commands: Commands, query: Query) {
  const { ticks } = query.resource(Time)!
  const entities = query.entities(Sprite, SpriteAnimation)

  for (const entity of entities) {
    const sprite = query.component(entity, Sprite)!
    const { frames } = query.component(entity, SpriteAnimation)!

    sprite.offset = Math.floor(ticks / 15) % frames
  }
}

function initializeWalkAnimation(_commands: Commands, query: Query) {
  const animationProgress = query.resource(AnimationProgress)!
  const entities = query.entities(Transform, TransformAnimation)

  animationProgress.value = 0

  for (const entity of entities) {
    const transform = query.component(entity, Transform)!
    const transformAnimation = query.component(entity, TransformAnimation)!
    const { x, y } = transformAnimation

    transform.x += x
    transform.y += y
    transformAnimation.x = -x | 0
    transformAnimation.y = -y | 0
    transformAnimation.progress = 1
  }
}

function updateWalkAnimation(_commands: Commands, query: Query) {
  const { value: progress } = query.resource(AnimationProgress)!
  const entities = query.entities(TransformAnimation)

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!

    transformAnimation.progress = 1 - progress
  }
}

function initializeBumpAnimation(_commands: Commands, query: Query) {
  const animationProgress = query.resource(AnimationProgress)!
  const entities = query.entities(Transform, TransformAnimation)

  animationProgress.value = 0

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!
    const { x, y } = transformAnimation

    transformAnimation.x = x
    transformAnimation.y = y
    transformAnimation.progress = 0
  }
}

function updateBumpAnimation(_commands: Commands, query: Query) {
  const { value: progress } = query.resource(AnimationProgress)!
  const entities = query.entities(TransformAnimation)

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation)!

    if (progress < 0.5) {
      transformAnimation.progress = progress
    } else {
      transformAnimation.progress = 1 - progress
    }
  }
}

// function resetTransformAnimation(_commands: Commands, query: Query) {
//   const entities = query.entities(TransformAnimation)

//   for (const entity of entities) {
//     const transformAnimation = query.component(entity, TransformAnimation)!

//     transformAnimation.x = 0
//     transformAnimation.y = 0
//   }
// }

function calculateMovement(_commands: Commands, query: Query) {
  const entities = query.entities(Transform, TransformAnimation, GlobalTransform)

  for (const entity of entities) {
    const transform = query.component(entity, Transform)!
    const { x, y } = query.component(entity, TransformAnimation)!
    const globalTransform = query.component(entity, GlobalTransform)!

    Object.assign(
      globalTransform,
      transform,
      {
        x: x * 8 + transform.x * 8,
        y: y * 8 + transform.y * 8,
      },
    )
  }
}

function TIC() {
  app.run()
}

function map(...args: any[]) {
  console.log(`map(${args.join(', ')})`)
}
function mget(...args: any[]) {
  const result = Math.floor(Math.random() * 128)

  console.log(`mget(${args.join(', ')}) => ${result}`)

  return result
}
function fget(...args: any[]) {
  const result = Math.random() > 0.75

  console.log(`fget(${args.join(', ')}) => ${result}`)

  return result
}
function cls(...args: any[]) {
  console.log(`cls(${args.join(', ')})`)
}
function spr(...args: any[]) {
  console.log(`spr(${args.join(', ')})`)
}
function btnp(...args: any[]) {
  const result = Math.random() > 0.75

  console.log(`btnp(${args.join(', ')}) => ${result}`)

  return result
}

for (let i = 0; i < 10; i++) {
  TIC()
  console.dir(app, { depth: null })
}
