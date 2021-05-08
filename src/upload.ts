import { createReadStream } from 'fs'
import { promisify } from 'util'
import ProxyClient from './proxyClient'
import got from 'got'
import { Announcer, ProxyError, ProxyFile } from './types'
import * as stream from 'stream'

type Headers = Record<string, string | string[] | undefined>

const headerExtractor = (headers: Headers) => (key: string) => {
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

export class Upload {
  constructor(
    public multiId: string,
    public details: Pick<ProxyFile, 'Location' | 'FileSize'> &
      Partial<ProxyFile>,
    private proxyClient: ProxyClient
  ) {
    if (!this.details['Upload-Offset']) {
      this.details['Upload-Offset'] = 0
    }
  }

  async setChecksum(value: string, checksumType = 'sha256') {
    if (!value) {
      return
    }
    if (!this.details.LocalChecksums) {
      this.details.LocalChecksums = []
    }
    if (this.details.LocalChecksums.find((c) => c.value === value)) {
      return
    }
    this.details.LocalChecksums.push({ value, checksumType })
    return this
  }
  async checkUploadStatus() {
    const res = await got.head(this.details.Location, {
      headers: this.proxyClient.headers,
    })
    this.updateFileFromGotResponse(res)
    return this
  }
  private updateFileFromGotResponse(res: {
    headers: Record<string, string | string[] | undefined>
  }) {
    const h = headerExtractor(res.headers)

    const errorMessage = h('error-message')

    const offset = Number(h('upload-offset') || '0')
    const clientMediaId = h('client-media-id')
    const serverChecksum = h('checksum')
    if (serverChecksum) {
      this.details.ServerChecksum = serverChecksum
    }
    const fileSize = Number(h('upload-length'))
    if (offset > 0) {
      this.details['Upload-Offset'] = offset
    }
    if (fileSize > 0) {
      this.details.FileSize = fileSize
    }
    if (clientMediaId) {
      this.details.ClientId = clientMediaId
    }
    if (h('external-completed-upload').includes('Confirmed')) {
      this.details.ExternalCompleted = true
    }
    const parentId = h('external-parent-id')
    if (parentId) {
      this.details.ParentId = parentId
    }
    if (errorMessage) {
      throw new Error(errorMessage)
    }
    return this
  }
  async uploadFile(filePath: string, options?: UploadOptions) {
    if (!this.details.FileSize) {
      throw new Error('filesize is zero in record.')
    }
    while ((this.details['Upload-Offset'] || 0) < this.details.FileSize) {
      await this.uploadChunk(filePath, options)
    }
    return this
  }
  /** Will verify that the current upload is done, and resolve once it is */
  async verifyUpload(): Promise<Upload> {
    // TODO: use websockets to get the upload-status
    await this.checkUploadStatus()
    if (this.details.ServerChecksum && this.details.LocalChecksums) {
      const found = this.details.LocalChecksums.find(
        (c) => c.value === this.details.ServerChecksum
      )
      if (found) {
        this.details.ShaSumMatch = true
        return this
      }
    }
    if (this.details.ExternalCompleted) {
      return this
    }
    if (
      this.details['Upload-Offset'] &&
      this.details['Upload-Length'] &&
      this.details['Upload-Length'] > this.details['Upload-Offset']
    ) {
      throw new ProxyError({
        status: 488,
        type: 'upload-not-complete',
        title: 'Upload is not completed',
        instance: '',
        detail: JSON.stringify({
          offset: this.details['Upload-Offset'],
          uploadLength: this.details['Upload-Length'],
        }),
      })
    }
    await new Promise((res) => setTimeout(res, 2e3))
    return this.verifyUpload()
  }
  async uploadChunk(filePath: string, options?: UploadOptions) {
    const offset = this.details['Upload-Offset'] || 0
    if (offset === this.details.FileSize) {
      throw new Error('Already uploaded everything for this file')
    }
    const readStream = this.createReadStreamFromFilePath(
      filePath,
      options || {}
    )

    return new Promise<Upload>((resolve, reject) => {
      pipeline(
        readStream,
        got.stream
          .patch(this.details.Location, {
            headers: {
              ...this.proxyClient.headers,
              'Upload-Offset': String(offset),
              'Content-type': 'application/offset+octet-stream',
            },
          })
          .on('response', (d) => {
            // this parsing is only used in tests.
            const parsed = typeof d === 'string' ? JSON.parse(d) : d
            resolve(
              this.updateFileFromGotResponse(
                parsed
                // typeof d === 'string' ? JSON.parse(d) : d
              )
            )
          })
          .on('error', (d: Error) => {
            reject(d)
          })
      )
    })
  }
  private createReadStreamFromFilePath(
    filePath: string,
    { chunkSize = 1 * GigaByte, progress }: UploadOptions
  ) {
    if (!this.details.FileSize) {
      throw new Error('Cannot upload when fileSize is 0')
    }
    const offset = this.details['Upload-Offset'] || 0
    const end = Math.min(offset + chunkSize, this.details.FileSize)
    const sliceLength = end - offset
    if (!sliceLength) {
      throw new Error('Cannot upload when length is 0')
    }

    let read = 0
    const readStream = createReadStream(filePath, {
      start: offset,
      end,
      autoClose: true,
      highWaterMark: 20 * KiloByte,
    })
    if (this.proxyClient.announcer || progress) {
      readStream.on('data' as any, (b: Buffer) => {
        read += b.length
        const o = offset + read
        const f = o / this.details.FileSize
        if (progress) {
          progress(this.details as ProxyFile, {
            offset: this.details['Upload-Offset'] || 0,
            total: this.details.FileSize,
            fraction: f,
            current: o,
          })
        }
        if (this.proxyClient.announcer) {
          this.proxyClient.announcer(this.details as ProxyFile, {
            offset: this.details['Upload-Offset'] || 0,
            total: this.details.FileSize,
            fraction: f,
            current: o,
          })
        }
      })
    }
    return readStream
  }
}

const KiloByte = 1024
const MegaByte = 1024 * KiloByte
const GigaByte = 1024 * MegaByte
const pipeline = promisify(stream.pipeline)

type UploadOptions = {
  chunkSize?: number
  progress?: Announcer
}
