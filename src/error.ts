export const errorCode = (er: unknown) => (er as NodeJS.ErrnoException).code
