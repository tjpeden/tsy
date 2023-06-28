"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Commands = exports.CommandType = void 0;

var _entityCommands = require("./entity-commands");

let CommandType;
exports.CommandType = CommandType;

(function (CommandType) {
  CommandType[CommandType["SpawnEntity"] = 0] = "SpawnEntity";
  CommandType[CommandType["DespawnEntity"] = 1] = "DespawnEntity";
  CommandType[CommandType["InsertResource"] = 2] = "InsertResource";
  CommandType[CommandType["RemoveResource"] = 3] = "RemoveResource";
  CommandType[CommandType["InsertComponent"] = 4] = "InsertComponent";
  CommandType[CommandType["RemoveComponent"] = 5] = "RemoveComponent";
  CommandType[CommandType["InsertBundle"] = 6] = "InsertBundle";
})(CommandType || (exports.CommandType = CommandType = {}));

class Commands {
  constructor(world, queue) {
    this.queue = queue;
    this.entities = world.entities;
  }

  add(command) {
    this.queue.push(command);
  }

  insertResource(resource) {
    this.add({
      type: CommandType.InsertResource,
      resource
    });
  }

  removeResource(resource) {
    this.add({
      type: CommandType.RemoveResource,
      resource
    });
  }

  entity(entity) {
    if (!this.entities.contains(entity)) {
      throw new Error(`Entity ${entity} does not exist in the world.`);
    }

    return new _entityCommands.EntityCommands(this, entity);
  }

  getOrSpawn(entity) {
    if (this.entities.contains(entity)) {
      return this.entity(entity);
    }

    return this.spawn();
  }

  spawn() {
    const entity = this.entities.alloc();
    this.add({
      type: CommandType.SpawnEntity,
      entity
    });
    return this.entity(entity);
  }

  spawnBundle(bundle) {
    return this.spawn().insertBundle(bundle);
  }

}

exports.Commands = Commands;