"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.World = void 0;

var _entity = require("./entity");

var _utilities = require("./utilities");

class World {
  id = (0, _utilities.ID)();
  entities = new _entity.Entities();
  components = new Map();

  constructor() {
    this.components.set(this.id, new Map());
  }

  spawn() {
    const entity = this.entities.alloc();
    this.components.set(entity, new Map());
    return entity;
  }

  despawn(entity) {
    if (this.entities.contains(entity)) {
      this.entities.free(entity);
      this.components.delete(entity);
    }
  }

  insertBundle(entity, bundle) {
    for (const component of bundle.components) {
      this.insertComponent(entity, component);
    }
  }

  insertComponent(entity, component) {
    this.components.get(entity).set(component.type, component);
  }

  removeComponent(entity, component) {
    this.components.get(entity).delete(component.type);
  }

  getComponent(entity, component) {
    return this.components.get(entity).get(component.type);
  }

  insertResource(component) {
    this.components.get(this.id).set(component.type, component);
  }

  removeResource(component) {
    this.components.get(this.id).delete(component.type);
  }

  getResource(component) {
    return this.components.get(this.id).get(component.type);
  }

}

exports.World = World;