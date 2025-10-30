// Base types for reuse
export type DependencyRecord = Record<string, string>
export type SSRParameters = Record<string, unknown>
export type FilePatterns = string[]

// Encoding type for bundle data
export type BundleEncoding = 'base64'

export interface Credentials {
  username: string
  api_key: string
}

// Bundle configuration (internal format - camelCase)
export interface BundleConfig {
  ssrParameters?: SSRParameters
  ssrOnly?: FilePatterns
  ssrShared?: FilePatterns
}

export interface BundleMetadata {
  dependencies: DependencyRecord
}

// Bundle format (API format - snake_case to match external API)
export interface Bundle {
  message: string
  encoding: BundleEncoding
  data: string
  ssr_parameters: SSRParameters
  ssr_only: FilePatterns
  ssr_shared: FilePatterns
  bundle_metadata: BundleMetadata
}

export interface PushOptions {
  projectDirectory: string
  buildDirectory?: string
  message?: string
  projectSlug?: string
  target?: string
  cloudOrigin?: string
  credentialsFile?: string
  user?: string
  key?: string
  wait?: boolean
}

export interface CloudAPIResponse {
  url?: string
  warnings?: string[]
  state?: string
}

export interface ProjectPackage {
  name?: string
  dependencies?: DependencyRecord
  devDependencies?: DependencyRecord
  ccExtensibility?: {
    overridesDir?: string
    extends?: string
  }
  mobify?: BundleConfig
}

interface DependencyNode {
  version?: string
  dependencies?: Record<string, DependencyNode>
}

export interface DependencyTree {
  dependencies?: Record<string, DependencyNode>
}

/**
 * Managed Runtime SSR Configuration
 * Defines which files are server-only vs shared between server and client
 */
export interface MrtSsrConfig {
  /** Files that should only be deployed to SSR functions (server-side only) */
  ssrOnly: string[]
  /** Files that should be shared between SSR and client (static assets, client bundles) */
  ssrShared: string[]
  /** SSR function parameters (e.g., Node.js version) */
  ssrParameters: {
    ssrFunctionNodeVersion: string
    [key: string]: string | number | boolean
  }
}
