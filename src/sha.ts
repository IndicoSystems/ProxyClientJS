import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { ArgsAsTuple } from 'simplytyped'

const memory: Record<string, Promise<{ type: string; value: string }>> = {}
const sha = (path: string, hashType = 'sha256') => {
  const key = path + '_' + hashType
  if (memory[key]) {
    return memory[key]
  }
  const prom = new Promise<{ type: string; value: string }>(
    (resolve, reject) => {
      const hash = createHash(hashType)
      const rs = createReadStream(path)
      rs.on('error', reject)
      rs.on('data', (chunk) => hash.update(chunk))
      rs.on('end', () => {
        const result = { type: hashType as hash, value: hash.digest('hex') }
        return resolve(result)
      })
    }
  )
  memory[key] = prom

  return prom
}

export default sha

type hash =
  | 'DSA'
  | 'DSA-SHA'
  | 'DSA-SHA1'
  | 'DSA-SHA1-old'
  | 'RSA-MD4'
  | 'RSA-MD5'
  | 'RSA-MDC2'
  | 'RSA-RIPEMD160'
  | 'RSA-SHA'
  | 'RSA-SHA1'
  | 'RSA-SHA1-2'
  | 'RSA-SHA224'
  | 'RSA-SHA256'
  | 'RSA-SHA384'
  | 'RSA-SHA512'
  | 'dsaEncryption'
  | 'dsaWithSHA'
  | 'dsaWithSHA1'
  | 'dss1'
  | 'ecdsa-with-SHA1'
  | 'md4'
  | 'md4WithRSAEncryption'
  | 'md5'
  | 'md5WithRSAEncryption'
  | 'mdc2'
  | 'mdc2WithRSA'
  | 'ripemd'
  | 'ripemd160'
  | 'ripemd160WithRSA'
  | 'rmd160'
  | 'sha'
  | 'sha1'
  | 'sha1WithRSAEncryption'
  | 'sha224'
  | 'sha224WithRSAEncryption'
  | 'sha256'
  | 'sha256WithRSAEncryption'
  | 'sha384'
  | 'sha384WithRSAEncryption'
  | 'sha512'
  | 'sha512WithRSAEncryption'
  | 'shaWithRSAEncryption'
  | 'ssl2-md5'
  | 'ssl3-md5'
  | 'ssl3-sha1'
  | 'whirlpool'

export const shaString = (
  str: string,
  {
    hashType = 'sha256',
    encoding = 'hex',
  }: {
    hashType?: hash
    encoding?: ArgsAsTuple<ReturnType<typeof createHash>['digest']>[0]
  } = {}
) => createHash(hashType).update(str).digest(encoding)
