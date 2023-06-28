import { Bundle } from './bundle';
import { Component } from './component';
import { Entity } from './entity';
import { EntityCommands } from './entity-commands';
import { Class, WithType } from './utilities';
import { World } from './world';
export declare const enum CommandType {
    SpawnEntity = 0,
    DespawnEntity = 1,
    InsertResource = 2,
    RemoveResource = 3,
    InsertComponent = 4,
    RemoveComponent = 5,
    InsertBundle = 6
}
export interface SpawnEntity {
    type: CommandType.SpawnEntity;
    entity: Entity;
}
export interface DespawnEntity {
    type: CommandType.DespawnEntity;
    entity: Entity;
}
export interface InsertResource {
    type: CommandType.InsertResource;
    resource: Component;
}
export interface RemoveResource {
    type: CommandType.RemoveResource;
    resource: WithType & Class<Component>;
}
export interface InsertComponent {
    type: CommandType.InsertComponent;
    entity: Entity;
    component: Component;
}
export interface RemoveComponent {
    type: CommandType.RemoveComponent;
    entity: Entity;
    component: WithType & Class<Component>;
}
export interface InsertBundle {
    type: CommandType.InsertBundle;
    entity: Entity;
    bundle: Bundle;
}
export declare type Command = SpawnEntity | DespawnEntity | InsertResource | RemoveResource | InsertComponent | RemoveComponent | InsertBundle;
export declare class Commands {
    private queue;
    private entities;
    constructor(world: World, queue: Command[]);
    add(command: Command): void;
    insertResource(resource: Component): void;
    removeResource(resource: WithType & Class<Component>): void;
    entity(entity: Entity): EntityCommands;
    getOrSpawn(entity: Entity): EntityCommands;
    spawn(): EntityCommands;
    spawnBundle(bundle: Bundle): EntityCommands;
}
