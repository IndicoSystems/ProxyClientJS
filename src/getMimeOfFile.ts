import * as FileType from 'file-type'
async function getMimeOfFile(
  b: string | Parameters<typeof FileType['fromStream']>[0]
) {
  const f =
    typeof b === 'string'
      ? await FileType.fromFile(b)
      : await FileType.fromStream(b)
  if (!f) {
    throw new Error('Failed to get mimeType of file')
  }
  return f
}

export default getMimeOfFile
