const { PassThrough } = require('stream')
const { createHash } = require('crypto')

const outHeaders = (h) => ({
  ...h,
  'indico-server': 'mock-version',
})

const proxyStore = {
  multiUploads: {},
  files: {},
}

const proxyError = (statusCode, title) => {
  return {
    statusCode,
    headers: {},
    body: {
      type: 'https://httpstatuses.com/' + statusCode,
      title,
      status: statusCode,
      detail: '',
      instance: '',
    },
  }
}

function fileHeaders(file) {
  if (!file) {
    return
  }
  return {
    'upload-length': file.fileSize,
    'upload-offset': file.Offset,
    ...(!!file.serverChecksum && {
      checksum: file.serverChecksum,
    }),
    // 'external-completed-upload': 'Confirmed',
  }
}

const requiredHeaders = {
  'Tus-resumable': '1.0.0',
  authorization: 'Basic dGVzdC1jbGllbnQ6YWJjMTIz',
}
const got = (url, options) => {
  const base = 'http://localhost:8086'
  if (!url.startsWith(base)) {
    console.error('missing mock', url, options)
    throw new Error('No mock for this address: ' + url)
  }
  const { method: m, headers } = options
  const body =
    options.json ||
    (typeof options.body === 'string' ? JSON.parse(options.body) : options.body)
  const method = m.toUpperCase()
  for (const k of Object.keys(requiredHeaders)) {
    if (requiredHeaders[k] !== headers[k]) {
      return proxyError(401, 'Not authorizaed')
    }
  }
  const path = url.replace(base, '')

  if (path === '' && method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: outHeaders(),
      body: {
        Search: {},
        Validation: {
          UserID: true,
          UserName: true,
          Sid: true,
          ParentID: true,
          CaseID: true,
          GroupName: true,
          GroupID: true,
        },
        RequiredFields: [],
      },
    }
  }
  if (method === 'HEAD') {
    const file = proxyStore.files[url]
    if (!file) {
      return proxyError(404, 'Not found')
    }

    return {
      statusCode: 200,
      headers: outHeaders(fileHeaders(file)),
    }
  }
  if (method === 'PATCH' || method === 'PUT') {
    // console.log('pathcy', options)
    // const hash = createHash(hashType)
    // const rs = createReadStream(path)
    // rs.on('error', reject)
    // rs.on('data', chunk => hash.update(chunk))
    // rs.on('end', () => {
    //   return resolve({ type: hashType, value: hash.digest('hex') })
    // })
    const file = proxyStore.files[url]
    const mockedStream = new PassThrough()
    if (!file) {
      return proxyError(404, 'Not found')
    }
    if (!file.hash) {
      file.hash = createHash('sha256')
    }

    mockedStream.on('data', (d) => {
      // console.log('got data', d.length)
      file.hash.update(d)
      file.Offset += d.length
      if (file.Offset === file.fileSize) {
        file.__uploadCompleted = true
      }
    })
    mockedStream.on('end', (d) => {
      const hash = file.hash.digest('hex')
      file.serverChecksum = hash
      // console.dir('goodbye', hash)
      mockedStream.emit(
        'response',
        JSON.stringify({
          statusCode: 200,
          headers: outHeaders(fileHeaders(file)),
        })
      )
      mockedStream.end() //   <-- end. not close.
      mockedStream.destroy()
    })
    // mockedStream.on('error', d => {
    //   console.dir('err', d)
    // })
    mockedStream.on('response', (d) => {
      // console.dir('responsey-thing', d)
      return d
    })

    return mockedStream
  }
  if (path.startsWith('/forms/') && method === 'GET') {
    let forms
    switch (path) {
      case '/forms/':
        forms = { raw: true }
        break
      case '/forms/papi':
        forms = { form: { id: 'mock-papi-form' } }
        break
      case '/forms/ft4':
        forms = { ft4: true }
        break

      default:
        throw new Error('invalid form-type: ' + path)
    }
    return {
      body: forms,
    }
  }
  if (path === '/validate/' && method === 'POST') {
    if (!body) {
      return proxyError(400, 'missing body')
    }
    const { As, CaseID } = body
    if (!As) {
      return proxyError(400, 'missing As')
    }
    if (As.UserName !== 'moc123') {
      return proxyError(400, 'For mocks, only moc123 is a valid user')
    }
    if (!CaseID) {
      return proxyError(400, 'For mocks, only CaseID is implemented')
    }
    switch (CaseID[CaseID.length - 1]) {
      case '0':
        return {
          body: {
            CaseID: {
              Details: null,
              Error: {
                Title: 'Saken ble ikke funnet',
                Subtitle:
                  'Vennligst prøv igjen eller kontakt din administrator.',
                Details: null,
                Status: 'Ikke funnet – Not found',
                StatusCode: 84040,
              },
              ID: '10000000',
            },
          },
        }
      default:
    }
    return proxyError(400, 'For mocks, only case ending in 0 is implemented')
  }
  if (path === '/multi/' && method === 'POST') {
    // console.log(options)
    if (!body) {
      return proxyError(400, 'missing body')
    }
    const { multiId, uploads } = body
    if (!multiId) {
      return proxyError(400, 'missing multiId')
    }
    if (!uploads) {
      return proxyError(400, 'missing uploads')
    }
    if (!uploads.length) {
      return proxyError(400, 'empty uploads')
    }
    const Files = uploads.map((f) => ({
      ...f,
      Offset: 0,
      Location: base + '/' + String(Math.random()).replace('.', ''),
    }))
    proxyStore.multiUploads[multiId] = Files
    for (const f of Files) {
      proxyStore.files[f.Location] = f
    }

    const result = {
      body: {
        MultiID: multiId,
        Files,
      },
    }
    // console.log('result', result)
    return result
    // return proxyError(418, 'not  yet')
  }
  throw new Error(`Mock not implemented ${method} ${path}`)
}

got.stream = {
  patch: (url, rest) => got(url, { method: 'PATCH', ...rest }),
}

got.head = (url, rest) => got(url, { method: 'HEAD', ...rest })

exports.default = got
module.exports = got
// exports = { sdlkjf: true }
