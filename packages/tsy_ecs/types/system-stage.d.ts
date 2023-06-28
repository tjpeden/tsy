import { Stage } from './stage';
import { IntoSystemDescriptor } from './system';
import { SystemSet } from './system-set';
import { World } from './world';
export declare class SystemStage implements Stage {
    private stageRunCriteria;
    private systems;
    addSystem(system: IntoSystemDescriptor): this;
    addSystemSet(systemSet: SystemSet): this;
    run(world: World): void;
}
