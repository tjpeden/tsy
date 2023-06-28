"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Query = void 0;

class Query {
  constructor(world) {
    this.world = world;
  }

  entities(...components) {
    return this.world.entities.all().filter(entity => {
      return components.every(component => this.world.getComponent(entity, component) !== undefined);
    });
  }

  component(entity, component) {
    return this.world.getComponent(entity, component);
  }

  resource(component) {
    return this.world.getResource(component);
  }

}

exports.Query = Query;