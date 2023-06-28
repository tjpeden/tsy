"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Component = void 0;

class Component {
  static get type() {
    return this.name;
  }

  get type() {
    return this.constructor.type;
  }

}

exports.Component = Component;