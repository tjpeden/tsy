"use strict";

var _app = require("@tsy/app");

var _ecs = require("@tsy/ecs");

class Time extends _ecs.Component {
  ticks = 0;
}

class TimePlugin {
  build(app) {
    app.insertResource(new Time({
      ticks: 0
    })).addSystemToStage(_app.CoreStage.First, (_commands, query) => {
      const time = query.resource(Time);
      time.ticks++;
    });
  }

}

class Sprite extends _ecs.Component {
  constructor(properties) {
    super({
      index: 0,
      offset: 0,
      colorkey: -1
    }, properties);
  }

}

class Transform extends _ecs.Component {
  constructor(properties) {
    super({
      x: 0,
      y: 0,
      scale: 1
    }, properties);
  }

}

var RenderStage;

(function (RenderStage) {
  RenderStage["PreRender"] = "PreRender";
  RenderStage["Render"] = "Render";
})(RenderStage || (RenderStage = {}));

class RenderPlugin {
  build(app) {
    app.addStage('Render', new _ecs.Schedule().addStage(RenderStage.PreRender, new _ecs.SystemStage().addSystem(() => {
      cls(0);
      map();
    })).addStage(RenderStage.Render, new _ecs.SystemStage().addSystem((_commands, query) => {
      const entities = query.entities(Sprite, Transform);

      for (const entity of entities) {
        const {
          index,
          offset,
          colorkey
        } = query.component(entity, Sprite);
        const {
          x,
          y,
          scale
        } = query.component(entity, Transform);
        spr(index + offset, x * 8, y * 8, colorkey, scale);
      }
    })));
  }

}

class Maturity extends _ecs.Component {
  constructor(properties) {
    super({
      max: 2,
      period: 1
    }, properties);
  }

}

class Tree extends _ecs.Component {}

const app = _app.App.default();

app.addPlugin(new TimePlugin()).addPlugin(new RenderPlugin()).addStartupSystem(setup).addSystem(mature);

function setup(commands) {
  commands.spawn().insert(new Sprite({
    index: 256,
    colorkey: 0
  })).insert(new Transform({
    x: 16,
    y: 8
  })).insert(new Maturity({
    max: 3,
    period: 60
  })).insert(new Tree());
}

function mature(_commands, query) {
  const entities = query.entities(Sprite, Maturity);
  const {
    ticks
  } = query.resource(Time);

  for (const entity of entities) {
    const sprite = query.component(entity, Sprite);
    const maturity = query.component(entity, Maturity);

    if (ticks % maturity.period === 0 && sprite.offset < maturity.max) {
      sprite.offset++;
    }
  }
}

function cls(_color) {}

function map() {}

function spr(_index, _x, _y, _colorkey, _scale) {}

for (let i = 0; i < 300; i++) {
  app.update();
}

console.dir(app, {
  depth: null
});