'use server'

import { cookies } from 'next/headers'

type ThemePreference = 'light' | 'dark' | 'system'

export async function updateThemePreference(theme: ThemePreference) {
  const cookieStore = cookies()

  cookieStore.set('ui-theme', theme, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  return theme
}
