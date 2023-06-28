import {
  App,
  CoreStage,
  Plugin,
} from '@tsy/app'
import {
  Commands,
  Component,
  Entity,
  Query,
  Schedule,
  SystemStage,
} from '@tsy/ecs'

class Time extends Component<Time> {
  ticks: number = 0
}

class TimePlugin extends Plugin {
  public build(app: App): void {
    app
    .insertResource(new Time())
    .addSystemToStage(
      CoreStage.Last,
      (_commands: Commands, query: Query) => {
        const time = query.resource(Time)!

        time.ticks = (time.ticks + 1) % 60
      },
    )
  }
}

const enum RenderStage {
  PreRender = 'PreRender',
  Render = 'Render',
}

class RenderPlugin extends Plugin {
  public build(app: App): void {
    app
    .addStage(
      'Render',
      new Schedule()
      .addStage(
        RenderStage.PreRender,
        new SystemStage()
        .addSystem(() => {}),
      )
      .addStage(
        RenderStage.Render,
        new SystemStage()
        .addSystem(
          (_commands, query) => {
            const entities = query.entities(Sprite, Transform)

            for (const entity of entities) {
              // const sprite = query.component(entity, Sprite)
              // const transform = query.component(entity, Transform)

              let animation

              animation = query.component(entity, TimeAnimation)
              if (animation) {
                // spr(
                //   sprite.index + animation.steps,
                //   transform.x,
                //   transform.y,
                //   sprite.colorkey,
                //   transform.scale,
                // )

                return
              }

              animation = query.component(entity, StepAnimation)
              if (animation) {
                // spr(
                //   sprite.index + (animation[animation.direction] * animation.frames) + animation.steps,
                //   transform.x,
                //   transform.y,
                //   sprite.colorkey,
                //   transform.scale,
                // )

                return
              }

              // spr(
              //   sprite.index,
              //   transform.x,
              //   transform.y,
              //   sprite.colorkey,
              //   transform.scale,
              // )
            }
          },
        ),
      )
    )
  }
}

class Max extends Component<Max> {
  public x: number = 240
  public y: number = 136
}

class Unit extends Component<Unit> {
  value: number = 8
}

interface MoveCharacteristic {
  direction: 'N' | 'S' | 'W' | 'E'
  axis: 'x' | 'y'
  delta: -1 | 1
}

class MoveCharacteristics extends Component<MoveCharacteristics> {
  public characteristics!: MoveCharacteristic[]
}

class Transform extends Component<Transform> {
  public x!: number
  public y!: number
  public scale!: number

  public constructor(properties: Partial<Transform>) {
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

class Sprite extends Component<Sprite> {
  public index!: number
  public colorkey!: number

  public constructor(properties: Partial<Sprite>) {
    super(
      {
        index: 0,
        colorkey: -1,
      },
      properties,
    )
  }
}

class StepAnimation extends Component<StepAnimation> {
  public steps!: number
  public frames!: number
  public direction!: MoveCharacteristic['direction']
  public N!: number
  public S!: number
  public W!: number
  public E!: number

  public constructor(properties: Partial<StepAnimation>) {
    super(
      {
        steps: 0,
        frames: 1,
        direction: 'N',
        N: 0,
        S: 1,
        W: 2,
        E: 3,
      },
      properties,
    )
  }
}

class TimeAnimation extends Component<TimeAnimation> {
  public steps!: number
  public frames!: number

  public constructor(properties: Partial<TimeAnimation>) {
    super(
      {
        steps: 0,
        frames: 1,
      },
      properties,
    )
  }
}

class Pup extends Component<Pup> {}
class Wall extends Component<Wall> {}
class Flag extends Component<Flag> {}

class IsYou extends Component<IsYou> {}
class IsStop extends Component<IsStop> {}
class IsPush extends Component<IsPush> {}
class IsWin extends Component<IsWin> {}

const app = App.default()

app
.addPlugin(new TimePlugin())
.addPlugin(new RenderPlugin())
.insertResource(new Max())
.insertResource(new Unit())
.insertResource(
  new MoveCharacteristics({
    characteristics: [
      {
        direction: 'N',
        axis: 'y',
        delta: -1,
      },
      {
        direction: 'S',
        axis: 'y',
        delta: 1,
      },
      {
        direction: 'W',
        axis: 'x',
        delta: -1,
      },
      {
        direction: 'E',
        axis: 'x',
        delta: 1,
      },
    ],
  })
)
.addStartupSystem(setup)
.addSystem(moveIsYous)
.addSystem(advanceTimeAnimationFrame)
.run()

function setup(commands: Commands) {
  // Flag
  commands
  .spawn()
  .insert(
    new Sprite({
      index: 273,
    })
  )
  .insert(
    new Transform({
      x: 136,
      y: 64,
    })
  )
  .insert(
    new TimeAnimation({
      frames: 2,
    })
  )
  .insert(new Flag())

  // Walls
  for (let x = 80; x <= 152; x += 8) {
    for (let y = 48; y <= 80; y += 8) {
      if ([80, 152].indexOf(x) !== -1 || [48, 80].indexOf(y) !== -1) {
        commands
        .spawn()
        .insert(new Sprite({ index: 272 }))
        .insert(new Transform({ x, y }))
        .insert(new Wall())
      }
    }
  }

  // Pup
  commands
  .spawn()
  .insert(
    new Sprite({
      index: 256,
      colorkey: 0,
    })
  )
  .insert(
    new Transform({
      x: 96,
      y: 64,
    }),
  )
  .insert(
    new StepAnimation({
      frames: 4,
      direction: 'E',
    })
  )
  .insert(new Pup())
  .insert(new IsYou())
}

function moveIsYous(_commands: Commands, query: Query) {
  const { characteristics } = query.resource(MoveCharacteristics)!
  const characteristic = characteristics.find((_,  i) => btnp(i, 12, 6))

  if (characteristic) {
    const { value: UNIT } = query.resource(Unit)!
    const MAX = query.resource(Max)!
    const {
      direction,
      axis,
      delta,
    } = characteristic

    function move(entity: Entity, push = false) {
      const transform = query.component(entity, Transform)!
      const next: Transform = Object.assign({}, transform)

      next[axis] += delta * UNIT

      if (0 > next[axis] || next[axis] > (MAX[axis] - UNIT)) {
        return false
      }

      let stopped
      const stops = query.entities(Transform, IsStop)

      stopped = stops.some(stopEntity => {
        const stopTransform = query.component(stopEntity, Transform)!

        return stopTransform.x === next.x && stopTransform.y === next.y
      })

      if (stopped) {
        return false
      }

      const pushes = query.entities(Transform, IsPush)

      stopped = pushes.some(pushEntity => {
        const pushTransform = query.component(pushEntity, Transform)!

        if (pushTransform.x === next.x && pushTransform.y === next.y) {
          return !move(pushEntity, true)
        }

        return false
      })

      if (stopped) {
        return false
      }

      transform[axis] = next[axis]

      if (!push) {
        const stepAnimation = query.component(entity, StepAnimation)

        if (stepAnimation) {
          stepAnimation.direction = direction
          stepAnimation.steps = (stepAnimation.steps + 1) % stepAnimation.frames
        }
      }

      return true
    }

    const yous = query.entities(Transform, IsYou)

    for (const you of yous) {
      move(you)
    }
  }
}

function advanceTimeAnimationFrame(_commands: Commands, query: Query) {
  const { ticks } = query.resource(Time)!

  if (ticks % 15 === 0) {
    const entities = query.entities(TimeAnimation)

    for (const entity of entities) {
      const timeAnimation = query.component(entity, TimeAnimation)!

      timeAnimation.steps = (timeAnimation.steps + 1) % timeAnimation.frames
    }
  }
}

function btnp(_button: number, _hold: number, _period: number) {
  return Math.random() < 0.5
}

console.dir(app, { depth: null })
