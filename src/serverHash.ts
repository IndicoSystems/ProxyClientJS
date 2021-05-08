import { shaString } from './sha'

/**
 * * A server hash includes the servers endpoint (ignoring schema and trailing
 * slash for consistency) and a unique identifier for the user. */
export function createServerHash(
  endpoint: string,
  ...params: Array<string | null | undefined | false>
) {
  const raw = stripEndpoint(endpoint)
  const args = [raw, ...params.filter(Boolean).sort()]

  const sha = shaString(args.join(';'))
  return sha
}

export function stripEndpoint(endpoint: string, ...params: string[]) {
  return endpoint
    .trim()
    .replace(/^.*:\/\//, '')
    .replace(/\/$/, '')
}
