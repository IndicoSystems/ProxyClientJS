import ProxyClient from './proxyClient'

import * as fs from 'fs'
import getMimeOfFile from './getMimeOfFile'
const btoa = (b: string) => Buffer.from(b).toString('base64')
const testFile = './video'
const b = fs.statSync(testFile).size
const mockDate = new Date(1800, 0, 0, 0, 0, 0, 0)
const fileType = getMimeOfFile(testFile)
const fileSha =
  'ed58a80eeeeecb8cf9ac69fadf4b5fcf9a204e02c3453b516d8c18207fd53fe4'
const MegaByte = 1024 * 1024
// jest.mock('got')
jest.setTimeout(3e3)
const announcer = jest.fn(
  (...args) => false && console.log('[Announce]:', args)
)

describe('proxy-client', () => {
  const credentials = {
    url: process.env.PROXY_TEST_URL || 'http://localhost:8086',
    authorization: `Basic ${btoa(
      [
        process.env.PROXY_CLIENT_ID || 'test-client',
        process.env.PROXY_CLIENT_SECRET || 'abc123',
      ].join(':')
    )}`,
  }
  const client = new ProxyClient(credentials.url, {
    announcer,
    authorization: credentials,
  })

  it('should verify connection', async () => {
    const result = await client.checkConnection()
    expect(result).toBeDefined()
    expect(result?.valid).toBeTruthy()
  })
  it('should request forms raw', async (done) => {
    const result = (await client.getForms('raw')) as any
    expect(result).toBeDefined()
    expect(result.raw).toBe(true)
    done()
  })
  it('should request forms papi', async (done) => {
    const result = await client.getForms('papi')
    expect(result).toBeDefined()
    expect(result.form?.id).toBe('mock-papi-form')
    done()
  })
  it('should request forms ft4', async (done) => {
    const result = await client.getForms('ft4')
    expect(result).toBeDefined()
    expect(result.ft4 === true)
    // expect(result.form.id).toBe('mock-papi-form')
    done()
  })
  it('should send validation-payload', async () => {
    const result = await client.validate({
      As: { UserName: 'moc123' },
      CaseID: '1000-0000',
    })
    // For the test, we dont really care much what the response is, since it is mocked
    // But we should check that we got the expected result
    expect(result).toBeDefined()
    expect(result?.CaseID).toBeTruthy()
    expect(result?.CaseID?.Details).toBeFalsy()
    expect(result?.CaseID?.Error).toBeTruthy()
    expect(result?.CaseID?.Error?.Title).toBe('Saken ble ikke funnet')
  })
  it('should not verify connection as valid', async () => {
    const c = new ProxyClient(credentials.url, {
      announcer,
      authorization: { authorization: 'test' },
    })
    const result = await c.checkConnection()
    expect(result).toBeDefined()
    expect(result?.valid).toBeFalsy()
  })
  it('should throw on invalid connection', async () => {
    const c = new ProxyClient(credentials.url, {
      announcer,
      authorization: { authorization: 'test' },
    })
    let didThrow = false
    try {
      await c.checkConnection({ throwOnError: true })
    } catch (rejected) {
      expect(rejected.name).toBe('ProxyError')
      expect(rejected.status).toBe(401)
      expect(rejected.detail.startsWith('Authorization'))
      didThrow = true
    }
    expect(didThrow).toBe(true)
  })
  it('should create multi-upload', async () => {
    const file = await fileType
    expect(file).toBeDefined()
    const result = await client.createMulti({
      multiId: 'multi-abc',
      uploads: [
        {
          caseNumber: '66661234',
          userId: 'abc123',
          clientMediaId: '123',
          fileType: file.mime,
          capturedAt: mockDate,
          filePath: testFile,
          fileSize: 2000,
          displayName: 'Title',
          equipmentId: 'test',
          creator: {},
          parent: {
            batchId: '123',
            name: 'abc',
          },
        },
      ],
    })
    expect(result).toBeDefined()
    expect(result.MultiID).toBe('multi-abc')
    expect(result.Files.length).toBe(1)
    expect(result.Files[0].Location).toBeDefined()
  })
  it('should create multi-upload, with multiple chunks, using u.uploadFile', async () => {
    const file = await fileType

    const result = await client.createMulti({
      multiId: 'multi-abc' + Math.random(),
      uploads: [
        {
          caseNumber: '66661234',
          userId: 'abc123',
          clientMediaId: '123' + Math.random(),
          fileType: file.mime,
          filePath: testFile,
          capturedAt: mockDate,
          fileSize: b,
          displayName: 'Title',
          equipmentId: 'test',
          creator: {},
          parent: {
            batchId: '123',
            name: 'abc',
          },
        },
      ],
    })
    expect(result.Files.length).toBe(1)
    const f = result.Files[0]
    const u = await client.fromUploadUrl(f.Location)
    expect(f.Location).toBeDefined()
    const status = await u.checkUploadStatus()
    expect(status).toBeDefined()
    expect(status.details['Upload-Offset']).toBeDefined()
    await u.uploadFile(testFile, { chunkSize: 20 * MegaByte })
    expect(u.details['Upload-Offset']).toBe(u?.details.FileSize)
  })

  it('should create multi-upload, with no chunks, using u.uploadFile', async () => {
    const file = await fileType

    const result = await client.createMulti({
      multiId: 'multi-abc' + Math.random(),
      uploads: [
        {
          caseNumber: '66661234',
          userId: 'abc123',
          clientMediaId: '123' + Math.random(),
          fileType: file.mime,
          capturedAt: mockDate,
          fileSize: b,
          filePath: testFile,
          equipmentId: 'test',
          creator: {},
          displayName: 'Title',
          parent: {
            batchId: '123',
            name: 'abc',
          },
        },
      ],
    })
    expect(result.Files.length).toBe(1)
    const f = result.Files[0]
    const u = await client.fromUploadUrl(f.Location)
    u.setChecksum(fileSha)
    expect(f.Location).toBeDefined()
    const status = await u.checkUploadStatus()
    expect(status).toBeDefined()
    expect(status.details['Upload-Offset']).toBeDefined()
    await u.uploadFile(testFile)
    await u.verifyUpload()
    expect(u.details.ShaSumMatch).toBe(true)
  })
})
