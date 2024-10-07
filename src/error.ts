const isRecord = (o: unknown): o is Record<string, unknown> =>
  !!o && typeof o === 'object'

const hasString = (o: Record<string, unknown>, key: string) =>
  key in o && typeof o[key] === 'string'

export const isFsError = (
  o: unknown,
): o is NodeJS.ErrnoException & {
  code: string
  path: string
} => isRecord(o) && hasString(o, 'code') && hasString(o, 'path')

export const errorCode = (er: unknown) =>
  isRecord(er) && hasString(er, 'code') ? er.code : null

export const asFsError = (er: unknown) => er as NodeJS.ErrnoException
