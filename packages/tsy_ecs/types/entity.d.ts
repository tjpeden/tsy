export declare type Entity = string;
export declare class Entities {
    private entities;
    alloc(): Entity;
    free(entity: Entity): void;
    contains(entity: Entity): boolean;
    all(): Entity[];
}
