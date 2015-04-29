// win32 console default output fonts don't support tick/cross
const isWindows = process && process.platform === 'win32'

export default {
  ok: isWindows ? '\u221A' : '\u2713'
  , err: isWindows ? '\u00D7' : '\u2717'
}

