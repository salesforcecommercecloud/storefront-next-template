export declare type IsAny<T> = 0 extends 1 & T ? true : false;

export declare type IsFn<T> = T extends (...args: any[]) => any ? true : false;

export declare type Ctor = new (...args: any[]) => any;

export declare type SafeCtor<T> = IsAny<T> extends true ? never : T extends Ctor ? T : never;

export declare type LiteralKeys<T> = {
    [K in keyof T]-?: string extends K ? never : number extends K ? never : symbol extends K ? never : K;
}[keyof T];

declare type SafeMethodKeysOf<T> =
    IsAny<T> extends true
        ? never
        : {
              [K in LiteralKeys<T>]: IsFn<T[K]> extends true ? K : never;
          }[LiteralKeys<T>] &
              string;

declare type SafePropertiesKeysOf<T> =
    IsAny<T> extends true
        ? never
        : {
              [K in LiteralKeys<T>]: IsFn<T[K]> extends true ? never : K;
          }[LiteralKeys<T>] &
              string;

export declare type InstanceMethodKeysOf<C> = C extends Ctor ? SafeMethodKeysOf<InstanceType<C>> : never;

export declare type InstancePropertiesKeysOf<C> = C extends Ctor ? SafePropertiesKeysOf<InstanceType<C>> : never;

export declare type StaticMethodKeysOf<C> = C extends Ctor ? SafeMethodKeysOf<C> : never;

export declare type InstanceMethodParams<C extends Ctor, K extends InstanceMethodKeysOf<C>> = Parameters<
    InstanceType<C>[K]
>;

export declare type InstanceMethodReturn<C extends Ctor, K extends InstanceMethodKeysOf<C>> = ReturnType<
    InstanceType<C>[K]
>;

declare type JsonPrimitive = string | number | boolean | null;
declare type JsonArray = Json[] | readonly Json[];
declare type JsonObject = {
    [Key in string]: Json;
} & {
    [Key in string]?: Json | undefined;
};
export declare type Json = JsonPrimitive | JsonArray | JsonObject;
