import type { ReactNode } from 'react'

export type Sentence = {
  id: string
  text: ReactNode
  completions: number
}

/** Existing mock feed data — content preserved verbatim from the original. */
export const sentences: Sentence[] = [
  { id: 's1', text: 'אישה טובה זה כמו...', completions: 48 },
  {
    id: 's2',
    text: (
      <>
        {'הדבר שהכי הייתי רוצה '}
        <br aria-hidden />
        לעשות בקיץ הזה...
      </>
    ),
    completions: 48,
  },
  { id: 's3', text: 'סקס טוב זה כמו יין טוב...', completions: 48 },
  {
    id: 's4',
    text: (
      <>
        יותר קשה לביבי להגיד את
        <br aria-hidden />
        האמת מאשר...
      </>
    ),
    completions: 48,
  },
  {
    id: 's5',
    text: (
      <>
        יותר קשה לביבי להגיד את
        <br aria-hidden />
        האמת מאשר...
      </>
    ),
    completions: 48,
  },
  {
    id: 's6',
    text: (
      <>
        יותר קשה לביבי להגיד את
        <br aria-hidden />
        האמת מאשר...
      </>
    ),
    completions: 48,
  },
]
