"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SystemDescriptor = void 0;
exports.intoSystemDescriptor = intoSystemDescriptor;

var _commands = require("./commands");

var _query = require("./query");

class SystemDescriptor {
  buffer = [];

  constructor(system, runCriteria) {
    this.system = system;
    this.runCriteria = runCriteria;
  }

  run(world) {
    const commands = new _commands.Commands(world, this.buffer);
    const query = new _query.Query(world);
    this.system(commands, query);
  }

  applyBuffer(world) {
    for (const command of this.buffer) {
      switch (command.type) {
        case _commands.CommandType.SpawnEntity:
          {
            world.components.set(command.entity, new Map());
            break;
          }

        case _commands.CommandType.DespawnEntity:
          {
            world.despawn(command.entity);
            break;
          }

        case _commands.CommandType.InsertResource:
          {
            world.insertResource(command.resource);
            break;
          }

        case _commands.CommandType.RemoveResource:
          {
            world.removeResource(command.resource);
            break;
          }

        case _commands.CommandType.InsertComponent:
          {
            world.insertComponent(command.entity, command.component);
            break;
          }

        case _commands.CommandType.RemoveComponent:
          {
            world.removeComponent(command.entity, command.component);
            break;
          }

        case _commands.CommandType.InsertBundle:
          {
            world.insertBundle(command.entity, command.bundle);
            break;
          }
      }
    }

    this.buffer = [];
  }

}

exports.SystemDescriptor = SystemDescriptor;

function intoSystemDescriptor(system) {
  return system instanceof SystemDescriptor ? system : new SystemDescriptor(system);
}