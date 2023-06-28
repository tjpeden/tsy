import { Bundle } from './bundle';
import { Component } from './component';
import { Entities, Entity } from './entity';
import { Class, Maybe, WithType } from './utilities';
export declare type ComponentStore = Map<string, Component>;
export declare class World {
    readonly id: string;
    entities: Entities;
    components: Map<string, ComponentStore>;
    constructor();
    spawn(): Entity;
    despawn(entity: Entity): void;
    insertBundle(entity: Entity, bundle: Bundle): void;
    insertComponent(entity: Entity, component: Component): void;
    removeComponent(entity: Entity, component: WithType): void;
    getComponent<T extends Component>(entity: Entity, component: WithType & Class<T>): Maybe<T>;
    insertResource(component: Component): void;
    removeResource(component: WithType): void;
    getResource<T extends Component>(component: WithType & Class<T>): Maybe<T>;
}
