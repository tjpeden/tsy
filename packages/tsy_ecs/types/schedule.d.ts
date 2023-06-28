import { RunCriteria } from './run-criteria';
import { Stage } from './stage';
import { IntoSystemDescriptor } from './system';
import { SystemSet } from './system-set';
import { World } from './world';
export declare class Schedule implements Stage {
    private readonly runCriteria;
    private order;
    private stages;
    constructor(runCriteria?: RunCriteria);
    addStage(label: string, stage: Stage): this;
    getStage<S extends Stage>(label: string): S | undefined;
    stage<S extends Stage>(label: string, action: (stage: S) => void): this;
    addSystemToStage(label: string, system: IntoSystemDescriptor): void;
    addSystemSetToStage(label: string, systemSet: SystemSet): void;
    runOnce(world: World): void;
    run(world: World): void;
}
