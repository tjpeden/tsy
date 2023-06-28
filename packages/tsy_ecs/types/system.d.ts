import { Commands } from './commands';
import { Query } from './query';
import { RunCriteria } from './run-criteria';
import { World } from './world';
export declare type IntoSystemDescriptor = SystemFunction | SystemDescriptor;
export interface SystemFunction {
    (commands: Commands, query: Query): void;
}
export declare class SystemDescriptor {
    private system;
    runCriteria?: RunCriteria | undefined;
    private buffer;
    constructor(system: SystemFunction, runCriteria?: RunCriteria | undefined);
    run(world: World): void;
    applyBuffer(world: World): void;
}
export declare function intoSystemDescriptor(system: IntoSystemDescriptor): SystemDescriptor;
