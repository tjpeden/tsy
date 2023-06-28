import { World } from "./world";
export declare enum ShouldRun {
    Yes = 0,
    No = 1,
    YesAndCheckAgain = 2,
    NoAndCheckAgain = 3
}
interface RunCriteriaSystem {
    (world: World): ShouldRun;
}
export interface RunCriteria {
    shouldRun: RunCriteriaSystem;
}
export declare class BaseRunCriteria implements RunCriteria {
    private system?;
    set(criteriaSystem: RunCriteriaSystem): this;
    shouldRun(world: World): ShouldRun;
}
export declare class RunOnce implements RunCriteria {
    private ran;
    shouldRun(): ShouldRun;
}
export {};
