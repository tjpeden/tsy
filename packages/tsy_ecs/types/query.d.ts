import { Component } from './component';
import { Entity } from './entity';
import { Class, WithType } from './utilities';
import { World } from "./world";
export declare class Query {
    private readonly world;
    constructor(world: World);
    entities(...components: (WithType & Class<Component>)[]): Entity[];
    component<T extends Component>(entity: Entity, component: WithType & Class<T>): T | undefined;
    resource<T extends Component>(component: WithType & Class<T>): T | undefined;
}
