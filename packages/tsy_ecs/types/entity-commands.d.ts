import { Bundle } from './bundle';
import { Commands } from './commands';
import { Component } from './component';
import { Entity } from './entity';
import { Class, WithType } from './utilities';
export declare class EntityCommands {
    private readonly commands;
    private readonly entity;
    constructor(commands: Commands, entity: Entity);
    id(): Entity;
    insert(component: Component): this;
    remove(component: WithType & Class<Component>): this;
    insertBundle(bundle: Bundle): this;
    despawn(): this;
}
