import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

const originalError = console.error

beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && /Warning: act\(.+not supported/.test(args[0])) {
      return
    }

    originalError.call(console, ...args)
  }
})

afterEach(() => {
  cleanup()
  console.error = originalError
})
