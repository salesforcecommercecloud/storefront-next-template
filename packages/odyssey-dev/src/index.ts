import fs from 'fs-extra'
import { createBundle } from './bundle.js'
import { CloudAPIClient } from './cloud-api.js'
import { buildMrtConfig } from './config.js'
import {
  DEFAULT_CLOUD_ORIGIN,
  getDefaultBuildDir,
  getCredentialsFile,
  readCredentials,
  getProjectPkg,
  getMrtConfig,
  getDefaultMessage,
  info,
  success,
  warn,
  error,
  debug
} from './utils.js'
import type { PushOptions } from './types.js'

/**
 * Main function to push bundle to Managed Runtime
 */
export async function push(options: PushOptions): Promise<void> {
  // Get MRT configuration early for validation
  const mrtConfig = getMrtConfig(options.projectDirectory)
  const resolvedTarget = options.target ?? mrtConfig.defaultMrtTarget

  // Input validation (fail fast - don't catch these)
  if (options.wait && !resolvedTarget) {
    throw new Error('You must provide a target to deploy to when using --wait (via --target flag or .env MRT_TARGET)')
  }
  
  if ((options.user && !options.key) || (!options.user && options.key)) {
    throw new Error('You must provide both --user and --key together, or neither')
  }

  // Validate project directory exists
  if (!fs.existsSync(options.projectDirectory)) {
    throw new Error(`Project directory "${options.projectDirectory}" does not exist!`)
  }

  // Get project slug: CLI option -> .env -> package.json name
  let projectSlug = options.projectSlug ?? mrtConfig.defaultMrtProject
  if (!projectSlug || projectSlug.trim() === '') {
    throw new Error('Project slug could not be determined from CLI, .env, or package.json')
  }
  
  // Use the resolved target from validation
  const target = resolvedTarget

  // Set default build directory and validate it exists
  const buildDirectory = options.buildDirectory ?? getDefaultBuildDir(options.projectDirectory)
  if (!fs.existsSync(buildDirectory)) {
    throw new Error(`Build directory "${buildDirectory}" does not exist!`)
  }

  try {
    // Set deployment target environment variable
    if (target) {
      process.env.DEPLOY_TARGET = target
    }

    // Get credentials
    let credentials
    if (options.user && options.key) {
      credentials = {
        username: options.user,
        api_key: options.key
      }
    } else {
      const credentialsPath = getCredentialsFile(
        options.cloudOrigin ?? DEFAULT_CLOUD_ORIGIN,
        options.credentialsFile
      )
      credentials = await readCredentials(credentialsPath)
    }

    // Build SSR configuration for MRT bundle
    const config = buildMrtConfig(buildDirectory, options.projectDirectory)

    // Set default message
    const message = options.message ?? getDefaultMessage(options.projectDirectory)

    info(`Creating bundle for project: ${projectSlug}`)
    if (options.projectSlug) {
      debug('Using project slug from CLI argument')
    } else if (process.env.MRT_PROJECT) {
      debug('Using project slug from .env MRT_PROJECT')
    } else {
      debug('Using project slug from package.json name')
    }
    if (target) {
      info(`Target environment: ${target}`)
      if (options.target) {
        debug('Using target from CLI argument')
      } else {
        debug('Using target from .env')
      }
    }

    // Debug: Log configuration arrays for troubleshooting
    debug('SSR shared files', config.ssrShared)
    debug('SSR only files', config.ssrOnly)

    // Create bundle
    const bundle = await createBundle({
      message,
      ssr_parameters: config.ssrParameters,
      ssr_only: config.ssrOnly,
      ssr_shared: config.ssrShared,
      buildDirectory,
      projectDirectory: options.projectDirectory,
      projectSlug
    })

    // Create API client and push
    const client = new CloudAPIClient({
      credentials,
      origin: options.cloudOrigin ?? DEFAULT_CLOUD_ORIGIN
    })

    info(`Beginning upload to ${options.cloudOrigin ?? DEFAULT_CLOUD_ORIGIN}`)
    const data = await client.push(bundle, projectSlug, target)

    // Debug: Log API response for troubleshooting
    debug('API response', data)

    // Handle warnings
    const warnings = data.warnings || []
    warnings.forEach(warn)

    if (options.wait && target) {
      success('Bundle uploaded - waiting for deployment to complete')
      await client.waitForDeploy(projectSlug, target)
      success('Deployment complete!')
    } else {
      success('Bundle uploaded successfully!')
    }

    if (data.url) {
      info(`Bundle URL: ${data.url}`)
    }

  } catch (err) {
    error((err as Error).message || err?.toString() || 'Unknown error')
    throw err
  }
}

// Export only the public API needed for CLI and programmatic usage
export type { PushOptions } from './types.js'
