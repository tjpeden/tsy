"use strict";

var _app = require("@tsy/app");

var _ecs = require("@tsy/ecs");

class Time extends _ecs.Component {
  ticks = 0;
}

function udpateTime(_commands, query) {
  const time = query.resource(Time);
  time.ticks++;
}

class TimePlugin {
  build(app) {
    app.insertResource(new Time()).addSystemToStage(_app.CoreStage.First, udpateTime);
  }

}

class Sprite extends _ecs.Component {
  index = 0;
  offset = 0;
  colorkey = -1;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class Transform extends _ecs.Component {
  x = 0;
  y = 0;
  scale = 1;
  flip = 0;
  rotate = 0;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class GlobalTransform extends Transform {}

class SpriteBundle extends _ecs.Bundle {
  sprite = new Sprite();
  transform = new Transform();
  globalTransform = new GlobalTransform();

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

var RenderStage;

(function (RenderStage) {
  RenderStage["PreRender"] = "PreRender";
  RenderStage["Render"] = "Render";
})(RenderStage || (RenderStage = {}));

function prerender() {
  cls(1);
  map();
}

function render(_commands, query) {
  const entities = query.entities(Sprite, GlobalTransform);

  for (const entity of entities) {
    const {
      index,
      offset,
      colorkey
    } = query.component(entity, Sprite);
    const {
      x,
      y,
      scale,
      flip,
      rotate
    } = query.component(entity, GlobalTransform);
    spr(index + offset, x, y, colorkey, scale, flip, rotate);
  }
}

class RenderPlugin {
  build(app) {
    app.addStage('Render', new _ecs.Schedule().addStage(RenderStage.PreRender, new _ecs.SystemStage().addSystem(prerender)).addStage(RenderStage.Render, new _ecs.SystemStage().addSystem(render)));
  }

}

class DefaultPlugins {
  build(app) {
    app.addPlugin(new TimePlugin()).addPlugin(new RenderPlugin());
  }

}

class AnimationProgress extends _ecs.Component {
  value = 0;
  step = 0.125;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

function shouldUpdateAnimationRun(world) {
  const {
    value
  } = world.getResource(AnimationProgress);

  if (value < 1) {
    return _ecs.ShouldRun.Yes;
  }

  world.getResource(_ecs.State.withLabel('AppState')).pop();
  return _ecs.ShouldRun.No;
}

function updateAnimationProgress(_commands, query) {
  const animationProgress = query.resource(AnimationProgress);
  const {
    value,
    step
  } = animationProgress;
  animationProgress.value = Math.min(1, value + step);
}

class AnimationPlugin {
  build(app) {
    app.insertResource(new AnimationProgress()).addSystem(new _ecs.SystemDescriptor(updateAnimationProgress, new _ecs.BaseRunCriteria().set(shouldUpdateAnimationRun)));
  }

}

class MoveCharacteristics extends _ecs.Component {
  characteristics = [{
    axis: 'y',
    delta: -1
  }, {
    axis: 'y',
    delta: 1
  }, {
    axis: 'x',
    delta: -1
  }, {
    axis: 'x',
    delta: 1
  }];
}

class SpriteAnimation extends _ecs.Component {
  frames = 2;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class TransformAnimation extends _ecs.Component {
  x = 0;
  y = 0;
  progress = 0;

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

class Player extends _ecs.Component {}

class PlayerBundle extends _ecs.Bundle {
  sprite = new SpriteBundle();
  spriteAnimation = new SpriteAnimation();
  transformAnimation = new TransformAnimation();
  player = new Player();

  constructor(initial = {}) {
    super();
    Object.assign(this, initial);
  }

}

var AppState;

(function (AppState) {
  AppState[AppState["Turn"] = 0] = "Turn";
  AppState[AppState["Walk"] = 1] = "Walk";
  AppState[AppState["Bump"] = 2] = "Bump";
  AppState[AppState["GameOver"] = 3] = "GameOver";
})(AppState || (AppState = {}));

const app = _app.App.default();

app.addPlugin(new DefaultPlugins()).addPlugin(new AnimationPlugin()).addState('AppState', AppState.Turn).insertResource(new MoveCharacteristics()).insertResource(new AnimationProgress()).addStartupSystem(setup).addSystemToStage(_app.CoreStage.PostUpdate, animateSprites).addSystemToStage(_app.CoreStage.PostUpdate, calculateMovement).addSystemSet(_ecs.SystemSet.onUpdate('AppState', AppState.Turn).withSystem(movePlayer)).addSystemSet(_ecs.SystemSet.onEnter('AppState', AppState.Walk).withSystem(initializeWalkAnimation)).addSystemSet(_ecs.SystemSet.onUpdate('AppState', AppState.Walk).withSystem(updateWalkAnimation)) // .addSystemSet(
//   SystemSet
//   .onExit('AppState', AppState.Walk)
//   .withSystem(resetTransformAnimation)
// )
.addSystemSet(_ecs.SystemSet.onEnter('AppState', AppState.Bump).withSystem(initializeBumpAnimation)).addSystemSet(_ecs.SystemSet.onUpdate('AppState', AppState.Bump).withSystem(updateBumpAnimation)); // .addSystemSet(
//   SystemSet
//   .onExit('AppState', AppState.Bump)
//   .withSystem(resetTransformAnimation)
// )

function setup(commands) {
  commands.spawnBundle(new PlayerBundle({
    sprite: new SpriteBundle({
      sprite: new Sprite({
        index: 256
      }),
      transform: new Transform({
        x: 8,
        y: 5
      })
    }),
    spriteAnimation: new SpriteAnimation({
      frames: 4
    })
  }));
}

function movePlayer(_commands, query) {
  const state = query.resource(_ecs.State.withLabel('AppState'));
  const {
    characteristics
  } = query.resource(MoveCharacteristics);
  const characteristic = characteristics.find((_, i) => btnp(i, 12, 6));

  if (characteristic) {
    const entities = query.entities(Transform, TransformAnimation, Player);
    const {
      axis,
      delta
    } = characteristic;

    for (const entity of entities) {
      const transform = query.component(entity, Transform);
      const transformAnimation = query.component(entity, TransformAnimation);
      const next = Object.assign({}, transform);
      next[axis] += delta;
      const tile = mget(next.x, next.y);

      if (axis === 'x') {
        transform.flip = delta < 0 ? 1 : 0;
      }

      transformAnimation[axis] = delta;

      if (fget(tile, 0)) {
        state.push(AppState.Bump);
      } else {
        state.push(AppState.Walk);
      }
    }
  }
}

function animateSprites(_commands, query) {
  const {
    ticks
  } = query.resource(Time);
  const entities = query.entities(Sprite, SpriteAnimation);

  for (const entity of entities) {
    const sprite = query.component(entity, Sprite);
    const {
      frames
    } = query.component(entity, SpriteAnimation);
    sprite.offset = Math.floor(ticks / 15) % frames;
  }
}

function initializeWalkAnimation(_commands, query) {
  const animationProgress = query.resource(AnimationProgress);
  const entities = query.entities(Transform, TransformAnimation);
  animationProgress.value = 0;

  for (const entity of entities) {
    const transform = query.component(entity, Transform);
    const transformAnimation = query.component(entity, TransformAnimation);
    const {
      x,
      y
    } = transformAnimation;
    transform.x += x;
    transform.y += y;
    transformAnimation.x = -x | 0;
    transformAnimation.y = -y | 0;
    transformAnimation.progress = 1;
  }
}

function updateWalkAnimation(_commands, query) {
  const {
    value: progress
  } = query.resource(AnimationProgress);
  const entities = query.entities(TransformAnimation);

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);
    transformAnimation.progress = 1 - progress;
  }
}

function initializeBumpAnimation(_commands, query) {
  const animationProgress = query.resource(AnimationProgress);
  const entities = query.entities(Transform, TransformAnimation);
  animationProgress.value = 0;

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);
    const {
      x,
      y
    } = transformAnimation;
    transformAnimation.x = x;
    transformAnimation.y = y;
    transformAnimation.progress = 0;
  }
}

function updateBumpAnimation(_commands, query) {
  const {
    value: progress
  } = query.resource(AnimationProgress);
  const entities = query.entities(TransformAnimation);

  for (const entity of entities) {
    const transformAnimation = query.component(entity, TransformAnimation);

    if (progress < 0.5) {
      transformAnimation.progress = progress;
    } else {
      transformAnimation.progress = 1 - progress;
    }
  }
} // function resetTransformAnimation(_commands: Commands, query: Query) {
//   const entities = query.entities(TransformAnimation)
//   for (const entity of entities) {
//     const transformAnimation = query.component(entity, TransformAnimation)!
//     transformAnimation.x = 0
//     transformAnimation.y = 0
//   }
// }


function calculateMovement(_commands, query) {
  const entities = query.entities(Transform, TransformAnimation, GlobalTransform);

  for (const entity of entities) {
    const transform = query.component(entity, Transform);
    const {
      x,
      y
    } = query.component(entity, TransformAnimation);
    const globalTransform = query.component(entity, GlobalTransform);
    Object.assign(globalTransform, transform, {
      x: x * 8 + transform.x * 8,
      y: y * 8 + transform.y * 8
    });
  }
}

function TIC() {
  app.run();
}

function map(...args) {
  console.log(`map(${args.join(', ')})`);
}

function mget(...args) {
  const result = Math.floor(Math.random() * 128);
  console.log(`mget(${args.join(', ')}) => ${result}`);
  return result;
}

function fget(...args) {
  const result = Math.random() > 0.75;
  console.log(`fget(${args.join(', ')}) => ${result}`);
  return result;
}

function cls(...args) {
  console.log(`cls(${args.join(', ')})`);
}

function spr(...args) {
  console.log(`spr(${args.join(', ')})`);
}

function btnp(...args) {
  const result = Math.random() > 0.75;
  console.log(`btnp(${args.join(', ')}) => ${result}`);
  return result;
}

for (let i = 0; i < 10; i++) {
  TIC();
  console.dir(app, {
    depth: null
  });
}