"use strict";

var _app = require("@tsy/app");

var _ecs = require("@tsy/ecs");

class Time extends _ecs.Component {
  ticks = 0;
}

class TimePlugin extends _app.Plugin {
  build(app) {
    app.insertResource(new Time()).addSystemToStage(_app.CoreStage.Last, (_commands, query) => {
      const time = query.resource(Time);
      time.ticks = (time.ticks + 1) % 60;
    });
  }

}

var RenderStage;

(function (RenderStage) {
  RenderStage["PreRender"] = "PreRender";
  RenderStage["Render"] = "Render";
})(RenderStage || (RenderStage = {}));

class RenderPlugin extends _app.Plugin {
  build(app) {
    app.addStage('Render', new _ecs.Schedule().addStage(RenderStage.PreRender, new _ecs.SystemStage().addSystem(() => {})).addStage(RenderStage.Render, new _ecs.SystemStage().addSystem((_commands, query) => {
      const entities = query.entities(Sprite, Transform);

      for (const entity of entities) {
        // const sprite = query.component(entity, Sprite)
        // const transform = query.component(entity, Transform)
        let animation;
        animation = query.component(entity, TimeAnimation);

        if (animation) {
          // spr(
          //   sprite.index + animation.steps,
          //   transform.x,
          //   transform.y,
          //   sprite.colorkey,
          //   transform.scale,
          // )
          return;
        }

        animation = query.component(entity, StepAnimation);

        if (animation) {
          // spr(
          //   sprite.index + (animation[animation.direction] * animation.frames) + animation.steps,
          //   transform.x,
          //   transform.y,
          //   sprite.colorkey,
          //   transform.scale,
          // )
          return;
        } // spr(
        //   sprite.index,
        //   transform.x,
        //   transform.y,
        //   sprite.colorkey,
        //   transform.scale,
        // )

      }
    })));
  }

}

class Max extends _ecs.Component {
  x = 240;
  y = 136;
}

class Unit extends _ecs.Component {
  value = 8;
}

class MoveCharacteristics extends _ecs.Component {}

class Transform extends _ecs.Component {
  constructor(properties) {
    super({
      x: 0,
      y: 0,
      scale: 1
    }, properties);
  }

}

class Sprite extends _ecs.Component {
  constructor(properties) {
    super({
      index: 0,
      colorkey: -1
    }, properties);
  }

}

class StepAnimation extends _ecs.Component {
  constructor(properties) {
    super({
      steps: 0,
      frames: 1,
      direction: 'N',
      N: 0,
      S: 1,
      W: 2,
      E: 3
    }, properties);
  }

}

class TimeAnimation extends _ecs.Component {
  constructor(properties) {
    super({
      steps: 0,
      frames: 1
    }, properties);
  }

}

class Pup extends _ecs.Component {}

class Wall extends _ecs.Component {}

class Flag extends _ecs.Component {}

class IsYou extends _ecs.Component {}

class IsStop extends _ecs.Component {}

class IsPush extends _ecs.Component {}

class IsWin extends _ecs.Component {}

const app = _app.App.default();

app.addPlugin(new TimePlugin()).addPlugin(new RenderPlugin()).insertResource(new Max()).insertResource(new Unit()).insertResource(new MoveCharacteristics({
  characteristics: [{
    direction: 'N',
    axis: 'y',
    delta: -1
  }, {
    direction: 'S',
    axis: 'y',
    delta: 1
  }, {
    direction: 'W',
    axis: 'x',
    delta: -1
  }, {
    direction: 'E',
    axis: 'x',
    delta: 1
  }]
})).addStartupSystem(setup).addSystem(moveIsYous).addSystem(advanceTimeAnimationFrame).run();

function setup(commands) {
  // Flag
  commands.spawn().insert(new Sprite({
    index: 273
  })).insert(new Transform({
    x: 136,
    y: 64
  })).insert(new TimeAnimation({
    frames: 2
  })).insert(new Flag()); // Walls

  for (let x = 80; x <= 152; x += 8) {
    for (let y = 48; y <= 80; y += 8) {
      if ([80, 152].indexOf(x) !== -1 || [48, 80].indexOf(y) !== -1) {
        commands.spawn().insert(new Sprite({
          index: 272
        })).insert(new Transform({
          x,
          y
        })).insert(new Wall());
      }
    }
  } // Pup


  commands.spawn().insert(new Sprite({
    index: 256,
    colorkey: 0
  })).insert(new Transform({
    x: 96,
    y: 64
  })).insert(new StepAnimation({
    frames: 4,
    direction: 'E'
  })).insert(new Pup()).insert(new IsYou());
}

function moveIsYous(_commands, query) {
  const {
    characteristics
  } = query.resource(MoveCharacteristics);
  const characteristic = characteristics.find((_, i) => btnp(i, 12, 6));

  if (characteristic) {
    const {
      value: UNIT
    } = query.resource(Unit);
    const MAX = query.resource(Max);
    const {
      direction,
      axis,
      delta
    } = characteristic;

    function move(entity, push = false) {
      const transform = query.component(entity, Transform);
      const next = Object.assign({}, transform);
      next[axis] += delta * UNIT;

      if (0 > next[axis] || next[axis] > MAX[axis] - UNIT) {
        return false;
      }

      let stopped;
      const stops = query.entities(Transform, IsStop);
      stopped = stops.some(stopEntity => {
        const stopTransform = query.component(stopEntity, Transform);
        return stopTransform.x === next.x && stopTransform.y === next.y;
      });

      if (stopped) {
        return false;
      }

      const pushes = query.entities(Transform, IsPush);
      stopped = pushes.some(pushEntity => {
        const pushTransform = query.component(pushEntity, Transform);

        if (pushTransform.x === next.x && pushTransform.y === next.y) {
          return !move(pushEntity, true);
        }

        return false;
      });

      if (stopped) {
        return false;
      }

      transform[axis] = next[axis];

      if (!push) {
        const stepAnimation = query.component(entity, StepAnimation);

        if (stepAnimation) {
          stepAnimation.direction = direction;
          stepAnimation.steps = (stepAnimation.steps + 1) % stepAnimation.frames;
        }
      }

      return true;
    }

    const yous = query.entities(Transform, IsYou);

    for (const you of yous) {
      move(you);
    }
  }
}

function advanceTimeAnimationFrame(_commands, query) {
  const {
    ticks
  } = query.resource(Time);

  if (ticks % 15 === 0) {
    const entities = query.entities(TimeAnimation);

    for (const entity of entities) {
      const timeAnimation = query.component(entity, TimeAnimation);
      timeAnimation.steps = (timeAnimation.steps + 1) % timeAnimation.frames;
    }
  }
}

function btnp(_button, _hold, _period) {
  return Math.random() < 0.5;
}

console.dir(app, {
  depth: null
});