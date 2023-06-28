import { Component } from './component';
import { RunCriteria } from './run-criteria';
import { IntoSystemDescriptor } from './system';
import { Class, WithType } from './utilities';
declare const enum OperationType {
    Set = 0,
    Replace = 1,
    Push = 2,
    Pop = 3
}
export interface SetOperation<T> {
    type: OperationType.Set;
    state: T;
}
export interface ReplaceOperation<T> {
    type: OperationType.Replace;
    state: T;
}
export interface PushOperation<T> {
    type: OperationType.Push;
    state: T;
}
export interface PopOperation {
    type: OperationType.Pop;
}
export declare type ScheduledOperation<T> = SetOperation<T> | ReplaceOperation<T> | PushOperation<T> | PopOperation;
export declare const enum TransitionType {
    PreStartup = 0,
    Startup = 1,
    ExitingToResume = 2,
    ExitingFull = 3,
    Entering = 4,
    Resuming = 5,
    Pausing = 6
}
export interface PreStartup {
    type: TransitionType.PreStartup;
}
export interface Startup {
    type: TransitionType.Startup;
}
export interface ExitingToResume<T> {
    type: TransitionType.ExitingToResume;
    leaving: T;
    entering: T;
}
export interface ExitingFull<T> {
    type: TransitionType.ExitingFull;
    leaving: T;
    entering: T;
}
export interface Entering<T> {
    type: TransitionType.Entering;
    leaving: T;
    entering: T;
}
export interface Resuming<T> {
    type: TransitionType.Resuming;
    leaving: T;
    entering: T;
}
export interface Pausing<T> {
    type: TransitionType.Pausing;
    leaving: T;
    entering: T;
}
export declare type StateTransition<T> = PreStartup | Startup | ExitingToResume<T> | ExitingFull<T> | Entering<T> | Resuming<T> | Pausing<T>;
export declare class State<T> extends Component {
    private readonly label;
    static onUpdate<T>(label: string, value: T): RunCriteria;
    static onEnter<T>(label: string, value: T): RunCriteria;
    static onExit<T>(label: string, value: T): RunCriteria;
    static onPause<T>(label: string, value: T): RunCriteria;
    static onResume<T>(label: string, value: T): RunCriteria;
    static getDriver<T>(label: string): IntoSystemDescriptor;
    static withLabel(label: string): WithType & Class<any>;
    private stack;
    private transition;
    private scheduled;
    private prepareExit;
    endNextLoop: boolean;
    get type(): string;
    get current(): T;
    get isTransitioning(): boolean;
    constructor(label: string, initial: T);
    set(value: T): void;
    replace(value: T): void;
    push(value: T): void;
    pop(): void;
    private update;
}
export {};
