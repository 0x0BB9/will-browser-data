import { getFingerprint } from '@thumbmarkjs/thumbmarkjs'
import browser from 'browser-tool'

export interface BrowserSignalRecord {
  [key: string]: any
}

export interface BrowserSignalsPayload {
  browserFingerprint: BrowserSignalRecord
  info: BrowserSignalRecord
  thumbmarkData: BrowserSignalRecord
  thumbmarkHash: string
}

export async function collectBrowserSignals(): Promise<BrowserSignalsPayload> {
  const [info, browserFingerprint, thumbmark] = await Promise.all([
    browser.getInfo(),
    browser.getFingerprint(),
    getFingerprint(true),
  ])

  return {
    info,
    browserFingerprint,
    thumbmarkHash: thumbmark.hash,
    thumbmarkData: thumbmark.data,
  }
}
