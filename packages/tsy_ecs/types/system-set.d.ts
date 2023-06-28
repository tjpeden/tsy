import { RunCriteria } from './run-criteria';
import { IntoSystemDescriptor, SystemDescriptor } from './system';
export declare class SystemSet {
    static onUpdate<T>(label: string, value: T): SystemSet;
    static onEnter<T>(label: string, value: T): SystemSet;
    static onExit<T>(label: string, value: T): SystemSet;
    static onPause<T>(label: string, value: T): SystemSet;
    static onResume<T>(label: string, value: T): SystemSet;
    private systems;
    private runCriteria;
    withRunCriteria(runCriteria: RunCriteria): this;
    withSystem(system: IntoSystemDescriptor): this;
    bake(): SystemDescriptor[];
}
