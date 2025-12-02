export type RecursivePartial<TObj> = TObj extends object
    ? {
          [TKey in keyof TObj]?: TObj[TKey] extends object ? RecursivePartial<TObj[TKey]> : TObj[TKey];
      }
    : never;
