import got, { Response as GotResponse, OptionsOfJSONResponseBody } from 'got'
import { createServerHash } from './serverHash'
import { If, StringEqual } from 'simplytyped'
import {
  Announcer,
  CreateMultiResult,
  IProxyError,
  MultiResult,
  MultiUpload,
  PapiForm,
  ProxyError,
  ProxyFeatures,
  ValidatePayload,
  ValidateResponse,
} from './types'
import { Upload } from './upload'

interface Base64Coder {
  b64ToString: (b: string) => string
}

const extractProxyError = async <T extends {}>(res: GotResponse<{}>) => {
  const error = res.body as unknown
  // This could happen if the service we are talking to is not really proxy,
  // but perhaps nginx.
  if (error && typeof error === 'object') {
    const proxyError = error as IProxyError
    if (proxyError.title) {
      return new ProxyError(proxyError)
    }
    console.warn('could not parse this error')
  }
  throw new ProxyError({
    status: res.statusCode,
    detail: JSON.stringify({ body: res.body, headers: res.headers }) || '',
    title: res.statusMessage || 'unknown error',
    instance: res.statusMessage || '',
    type: 'unknown',
  })
}

const formFormat = {
  raw: '',
  papi: 'papi',
  ft4: 'ft4',
}
const mockBase64Coder = {
  b64ToString: () => 'mock',
  mock: true,
}
class ProxyClient {
  public headers: Record<string, string> = {
    'Tus-resumable': '1.0.0',
  }
  public announcer: undefined | Announcer
  public features: ProxyFeatures | null = null
  public clientId: string = ''
  public serverHash: string = ''
  base64Coder: Base64Coder = mockBase64Coder
  constructor(
    public url: string,
    options: {
      announcer?: Announcer
      serverHash?: string
      base64Coder?: Base64Coder
      authorization?:
        | { clientId: string; clientSecret: string }
        | { authorization: string }
    }
  ) {
    this.url = url.replace(/\/$/, '')
    if (options.base64Coder) {
      this.base64Coder = options.base64Coder
    }
    if (typeof window !== 'undefined' && (window as any).btoa) {
      this.base64Coder = {
        b64ToString: window.atob,
      }
    }
    if (typeof Buffer !== 'undefined') {
      this.base64Coder = {
        b64ToString: (b: string) => Buffer.from(b).toString('base64'),
      }
    }
    if ((this.base64Coder as any).mock) {
      throw new Error('No Base64Coder added. Please add one.')
    }
    if (options.announcer) {
      this.announcer = options.announcer
    }
    if (!this.announcer) {
      console.warn('there is no announcer')
    }
    if (options.authorization) {
      if ('authorization' in options.authorization) {
        this.headers.authorization = options.authorization.authorization
        const basicAuth = options.authorization.authorization.replace(
          'Basic ',
          ''
        )
        this.clientId = this.base64Coder.b64ToString(basicAuth).split(':')[0]
      } else if ('clientId' in options.authorization) {
        this.clientId = options.authorization.clientId
        this.headers.authorization = `Basic ${btoa(
          [
            options.authorization.clientId,
            options.authorization.clientSecret,
          ].join(':')
        )}`
      }
    }
    if (!options.serverHash) {
      this.serverHash = createServerHash(this.url, this.clientId)
    }
  }
  public getServerHash = () => {
    return this.serverHash
  }
  checkConnection = async (
    { throwOnError }: { throwOnError?: boolean } = { throwOnError: false }
  ) => {
    const result = await got<ProxyFeatures>(this.url, {
      timeout: 5e3,
      method: 'OPTIONS',
      responseType: 'json',
      headers: this.headers,
      throwHttpErrors: false,
    })
    const v = await ProxyClient.verifyConnection(result)
    if (!v || !v.valid) {
      if (throwOnError) {
        throw v.error || new Error('unknown error')
      }
      return v
    }
    if ('features' in v) {
      this.features = v.features
    }
    return v
  }
  static verifyConnection = async (
    res: GotResponse<ProxyFeatures>
  ): Promise<
    | { valid: true; features: ProxyFeatures }
    | { valid: false; error?: ProxyError }
  > => {
    if (res.statusCode < 200 || res.statusCode > 300) {
      try {
        const err = await extractProxyError(res)
        return { valid: false, error: err }
      } catch (err) {
        console.error(err)
      }
      return { valid: false }
    }
    const h = headerExtractor(res.headers)
    try {
      // const maxChunkSize = res.headers.get('max-chunk-size')
      // const minChunkSize = res.headers.get('min-chunk-size')
      const indicoServer = h('indico-server')
      const features: ProxyFeatures = res.body
      const valid =
        indicoServer &&
        features &&
        (features.Search || features.RequiredFields || features.Validation)
      if (valid) {
        return { valid: true, features }
      }
      return { valid: false }
    } catch (err) {
      return { valid: false }
    }
  }
  async jsonRequest<R extends {}>(
    subpath: string,
    options?: OptionsOfJSONResponseBody
  ) {
    const res = await got(this.url + subpath.replace(/^\/?/, '/'), {
      method: 'POST',
      responseType: 'json',
      throwHttpErrors: false,
      headers: { ...this.headers, 'Content-type': 'application/json' },
      ...options,
    })
    const json: R = res.body as any
    if (res.statusCode > 299) {
      const jsonErr = json as any
      if (typeof jsonErr === 'string' || !jsonErr.stutus) {
        throw new ProxyError({
          status: res.statusCode,
          type: 'unknown',
          title: res.statusMessage || jsonErr || 'unknown',
          detail: jsonErr,
          instance: '',
        })
      }

      throw new ProxyError(json as any)
    }
    return json
  }
  async getForms<K extends keyof typeof formFormat>(
    kind: K
  ): Promise<
    If<
      StringEqual<K, 'papi'>,
      PapiForm,
      // TODO: add type for FT4
      If<StringEqual<K, 'ft4'>, { ft4: true }, unknown>
    >
  > {
    const str = formFormat[kind]
    const res = await this.jsonRequest('forms/' + str, { method: 'GET' })
    return res as any
  }
  async validate(payload: ValidatePayload) {
    if (!payload || !Object.keys(payload).length) {
      throw new Error('Payload cannot be empty')
    }
    if (!payload.As || !Object.keys(payload.As).length) {
      throw new Error('Must assign user to identify on behalf of. (As)')
    }
    const res = await this.jsonRequest<ValidateResponse>('validate/', {
      body: JSON.stringify(payload),
    })
    return res
  }
  async createMulti(uploadMetadatas: MultiUpload): Promise<CreateMultiResult> {
    if (!uploadMetadatas) {
      throw new Error('uploadMetadata is required')
    }
    if (!uploadMetadatas.multiId) {
      throw new Error('multi-id is required')
    }
    if (!uploadMetadatas.uploads.length) {
      throw new Error('uploadMetadata requires at least one upload')
    }
    if (uploadMetadatas.uploads.some((f) => !f.fileSize)) {
      throw new Error('uploads must have fileSize')
    }
    const seenClientMediaIds: Record<string, string> = {}
    for (const um of uploadMetadatas.uploads) {
      if (!um.clientMediaId) {
        console.error(uploadMetadatas)
        throw new Error('clientmediaId is required')
      }
      if (!um.filePath) {
        throw new Error('filePath is requiered')
      }
      if (seenClientMediaIds[um.clientMediaId]) {
        throw new Error('clientmediaId must be unique')
      }
      seenClientMediaIds[um.clientMediaId] = um.filePath
    }
    const res = await got<MultiResult>(this.url + '/multi/', {
      method: 'post',
      responseType: 'json',
      throwHttpErrors: false,
      headers: { ...this.headers, 'Content-type': 'application/json' },
      json: uploadMetadatas,
    })
    const json = res.body
    if (res.statusCode > 299) {
      console.error({ json })
      const jsonErr = json as any
      if (typeof jsonErr === 'string' || !jsonErr.stutus) {
        throw new ProxyError({
          status: res.statusCode,
          type: 'unknown',
          title: res.statusMessage || jsonErr || 'unknown',
          detail: jsonErr,
          instance: '',
        })
      }

      throw new ProxyError(json as any)
    }
    if (!json || !json.Files) {
      throw new Error(`No files returned, got :${JSON.stringify(json)}`)
    }
    const result = {
      ...json,
      Files: json.Files.map((f) => {
        return {
          ...f,
          filePath: seenClientMediaIds[f.ClientId],
        }
      }),
    }
    return result
  }
  /** if not supplying offset and fileSize, the offset will be checked automatically */
  fromUploadUrl = async (
    uploadUrl: string,
    multiId?: string,
    offset?: number,
    fileSize?: number
  ) => {
    const a = new Upload(
      multiId || '',
      {
        Location: uploadUrl,
        FileSize: fileSize || 0,
        'Upload-Offset': offset || 0,
      },
      this
    )
    if (!a.details.FileSize || (a.details['Upload-Offset'] === 0 && !offset)) {
      await a.checkUploadStatus()
    }
    if (!a.details.FileSize) {
      console.error(a)
      throw new Error('fileSize is zero')
    }
    return a
  }
  async checkMultiStatus(multiId: string) {
    if (!multiId) {
      throw new Error('multi have multiId tocheck multistatus')
    }
    const res = await got.get<MultiResult>(this.url + '/multi/' + multiId, {
      responseType: 'json',
      headers: this.headers,
    })
    if (res.statusCode > 299) {
      throw new Error(`${res.statusCode}`)
    }
    return res.body
  }
}

const headerExtractor = (headers: GotResponse['headers']) => (key: string) => {
  key = key.toLowerCase()
  const header = headers[key]
  if (!header) {
    return ''
  }
  if (Array.isArray(header)) {
    return header[0]
  }
  return header
}

export default ProxyClient
