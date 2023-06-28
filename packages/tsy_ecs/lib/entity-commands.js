"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EntityCommands = void 0;

var _commands = require("./commands");

class EntityCommands {
  constructor(commands, entity) {
    this.commands = commands;
    this.entity = entity;
  }

  id() {
    return this.entity;
  }

  insert(component) {
    this.commands.add({
      type: _commands.CommandType.InsertComponent,
      entity: this.entity,
      component
    });
    return this;
  }

  remove(component) {
    this.commands.add({
      type: _commands.CommandType.RemoveComponent,
      entity: this.entity,
      component
    });
    return this;
  }

  insertBundle(bundle) {
    this.commands.add({
      type: _commands.CommandType.InsertBundle,
      entity: this.entity,
      bundle
    });
    return this;
  }

  despawn() {
    this.commands.add({
      type: _commands.CommandType.DespawnEntity,
      entity: this.entity
    });
    return this;
  }

}

exports.EntityCommands = EntityCommands;