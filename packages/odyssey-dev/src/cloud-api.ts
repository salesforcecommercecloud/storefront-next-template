// Using built-in fetch (Node.js 18+)
import { URL } from 'url'
import type { Credentials, Bundle, CloudAPIResponse } from './types.js'
import pkg from '../package.json' with { type: 'json' }

export class CloudAPIClient {
  private credentials: Credentials
  private origin: string

  constructor({ credentials, origin }: { credentials: Credentials; origin: string }) {
    this.credentials = credentials
    this.origin = origin
  }

  private getAuthHeader() {
    const { username, api_key } = this.credentials
    const encoded = Buffer.from(`${username}:${api_key}`, 'binary').toString('base64')
    return { Authorization: `Basic ${encoded}` }
  }

  private async getHeaders() {
    return {
      'User-Agent': `odyssey-dev@${pkg.version}`,
      ...this.getAuthHeader()
    }
  }

  /**
   * Push bundle to Managed Runtime
   */
  async push(bundle: Bundle, projectSlug: string, target?: string): Promise<CloudAPIResponse> {
    const base = `api/projects/${projectSlug}/builds/`
    const pathname = target ? base + `${target}/` : base
    const url = new URL(this.origin)
    url.pathname = pathname

    const body = Buffer.from(JSON.stringify(bundle))
    const headers = {
      ...(await this.getHeaders()),
      'Content-Length': body.length.toString()
    }

    const res = await fetch(url.toString(), {
      body,
      method: 'POST',
      headers
    })

    if (res.status >= 400) {
      const bodyText = await res.text()
      let errorData: any
      try {
        errorData = JSON.parse(bodyText)
      } catch {
        errorData = { message: bodyText }
      }

      throw new Error(
        `HTTP ${res.status}: ${errorData.message || bodyText}\n` +
        `For more information visit https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/guide/pushing-and-deploying-bundles.html`
      )
    }

    return await res.json() as CloudAPIResponse
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeploy(project: string, environment: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const delay = 30000 // 30 seconds

      const check = async () => {
        const url = new URL(
          `/api/projects/${project}/target/${environment}`,
          this.origin
        )
        const res = await fetch(url, { headers: await this.getHeaders() })

        if (!res.ok) {
          const text = await res.text()
          let json: any
          try {
            if (text) json = JSON.parse(text)
          } catch (_) {}
          const message = json?.detail ?? text
          const detail = message ? `: ${message}` : ''
          throw new Error(`${res.status} ${res.statusText}${detail}`)
        }

        const data = await res.json() as CloudAPIResponse
        if (typeof data.state !== 'string') {
          return reject(new Error('An unknown state occurred when polling the deployment.'))
        }

        switch (data.state) {
          case 'CREATE_IN_PROGRESS':
          case 'PUBLISH_IN_PROGRESS':
            setTimeout(() => check().catch(reject), delay)
            return
          case 'CREATE_FAILED':
          case 'PUBLISH_FAILED':
            return reject(new Error('Deployment failed.'))
          case 'ACTIVE':
            return resolve()
          default:
            return reject(new Error(`Unknown deployment state "${data.state}".`))
        }
      }

      setTimeout(() => check().catch(reject), delay)
    })
  }
}
