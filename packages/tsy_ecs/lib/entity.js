"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Entities = void 0;

var _utilities = require("./utilities");

class Entities {
  entities = new Set();

  alloc() {
    const entity = (0, _utilities.ID)();
    this.entities.add(entity);
    return entity;
  }

  free(entity) {
    this.entities.delete(entity);
  }

  contains(entity) {
    return this.entities.has(entity);
  }

  all() {
    return [...this.entities];
  }

}

exports.Entities = Entities;