export declare type Maybe<T> = T | undefined;
export declare type Class<T> = Function & {
    new (...args: any[]): T;
};
export interface WithType {
    type: string;
}
export declare const ID: () => string;
