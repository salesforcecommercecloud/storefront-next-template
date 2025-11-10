//#region src/types.d.ts

interface PushOptions {
  projectDirectory: string;
  buildDirectory?: string;
  message?: string;
  projectSlug?: string;
  target?: string;
  cloudOrigin?: string;
  credentialsFile?: string;
  user?: string;
  key?: string;
  wait?: boolean;
}
//#endregion
//#region src/push.d.ts
/**
 * Main function to push bundle to Managed Runtime
 */
declare function push(options: PushOptions): Promise<void>;
//#endregion
export { type PushOptions, push };
//# sourceMappingURL=push-CxasFL6C.d.ts.map