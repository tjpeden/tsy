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

class TimePlugin implements Plugin {
  public build(app: App): void {
    app.insertResource(
      new Time({
        ticks: 0,
      })
    )
    .addSystemToStage(
      CoreStage.First,
      (_commands: Commands, query: Query) => {
        const time = query.resource(Time)!

        time.ticks++
      },
    )
  }
}

class Sprite extends Component<Sprite> {
  public index!: number
  public offset!: number
  public colorkey!: number

  public constructor(properties: Partial<Sprite>) {
    super(
      {
        index: 0,
        offset: 0,
        colorkey: -1,
      },
      properties,
    )
  }
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

const enum RenderStage {
  PreRender = 'PreRender',
  Render = 'Render',
}

class RenderPlugin implements Plugin {
  public build(app: App): void {
    app
    .addStage(
      'Render',
      new Schedule()
      .addStage(
        RenderStage.PreRender,
        new SystemStage()
        .addSystem(
          () => {
            cls(0)
            map()
          },
        ),
      )
      .addStage(
        RenderStage.Render,
        new SystemStage()
        .addSystem(
          (_commands, query) => {
            const entities = query.entities(Sprite, Transform)

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
              } = query.component(entity, Transform)!

              spr(
                index + offset,
                x * 8,
                y * 8,
                colorkey,
                scale,
              )
            }
          },
        ),
      ),
    )
  }
}

class Maturity extends Component<Maturity> {
  public max!: number
  public period!: number

  public constructor(properties: Partial<Maturity>) {
    super(
      {
        max: 2,
        period: 1,
      },
      properties,
    )
  }
}

class Tree extends Component<Tree> {}

const app = App.default()

app
.addPlugin(new TimePlugin())
.addPlugin(new RenderPlugin())
.addStartupSystem(setup)
.addSystem(mature)

function setup(commands: Commands) {
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
      x: 16,
      y: 8,
    })
  )
  .insert(
    new Maturity({
      max: 3,
      period: 60,
    })
  )
  .insert(new Tree())
}

function mature(_commands: Commands, query: Query) {
  const entities = query.entities(Sprite, Maturity)
  const { ticks } = query.resource(Time)!

  for (const entity of entities) {
    const sprite = query.component(entity, Sprite)!
    const maturity = query.component(entity, Maturity)!

    if (ticks % maturity.period === 0 && sprite.offset < maturity.max) {
      sprite.offset++
    }
  }
}

function cls(_color: number) {}
function map() {}
function spr(_index: number, _x: number, _y: number, _colorkey: number, _scale: number) {}

for (let i = 0; i < 300; i++) {
  app.update()
}

console.dir(app, { depth: null })
