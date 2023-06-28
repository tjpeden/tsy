import { WithType } from "./utilities";
export declare abstract class Component implements WithType {
    static get type(): string;
    get type(): string;
}
