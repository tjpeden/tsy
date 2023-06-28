import { Component, Schedule, IntoSystemDescriptor, SystemSet } from '@tsy/ecs';
import { Plugin } from './plugin';
export declare const enum CoreStage {
    First = "First",
    Startup = "Startup",
    PreUpdate = "PreUpdate",
    Update = "Update",
    PostUpdate = "PostUpdate",
    Last = "Last"
}
export declare const enum StartupStage {
    PreStartup = "PreStartup",
    Startup = "Startup",
    PostStartup = "PostStartup"
}
export declare class App {
    private world;
    private schedule;
    private runner;
    static default(): App;
    addDefaultStages(): this;
    addPlugin(plugin: Plugin): this;
    addState<T>(label: string, initial: T): this;
    addSystemSetToStage(label: string, systemSet: SystemSet): this;
    addSystemSet(systemSet: SystemSet): this;
    addStage(label: string, stage: Schedule): this;
    addStartupSystemToStage(label: string, system: IntoSystemDescriptor): this;
    addStartupSystem(system: IntoSystemDescriptor): this;
    addSystemToStage(label: string, system: IntoSystemDescriptor): this;
    addSystem(system: IntoSystemDescriptor): this;
    insertResource(resource: Component): this;
    setRunner(runner: (app: App) => void): this;
    update(): void;
    run(): void;
}
