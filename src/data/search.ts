import { supabase } from "@/lib/supabase"
import type { Sentence } from "./sentences"

/**
 * All completion text for a batch of sentences, concatenated per sentence.
 *
 * One query for the whole visible feed, regardless of how many sentences or
 * completions there are — the same batching shape as
 * `fetchLeadingCompletions`, just without the like/author lookups this
 * doesn't need. A failure resolves to an empty map: search then falls back to
 * matching sentence text alone rather than breaking.
 */
async function fetchCompletionTextBySentence(
  sentenceIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(sentenceIds)].filter(Boolean)
  const result = new Map<string, string>()
  if (unique.length === 0) return result

  const { data, error } = await supabase
    .from("completions")
    .select("sentence_id, text")
    .in("sentence_id", unique)

  if (error) return result

  type Row = {
    sentence_id: string
    text: string
  }
  for (const row of (data ?? []) as Row[]) {
    const previous = result.get(row.sentence_id)
    result.set(row.sentence_id, previous ? `${previous} ${row.text}` : row.text)
  }

  return result
}

/** Lowercased, whitespace-split search terms — empty strings dropped. */
function termsFor(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Sentences whose opener or completions contain every search term.
 *
 * The sentence and all of its completions are treated as one searchable
 * unit: a term matches whether it lands in the opener or in any completion,
 * so "לאכול אננס" finds a sentence containing "לאכול" whose completion
 * contains "אננס" even though neither half alone has both words. This never
 * changes which completion leads a card — that ranking is untouched and
 * computed elsewhere.
 */
export async function searchSentences(
  query: string,
  sentences: Sentence[],
): Promise<Sentence[]> {
  const terms = termsFor(query)
  if (terms.length === 0) return sentences

  const completionText = await fetchCompletionTextBySentence(
    sentences.map((sentence) => sentence.id),
  )

  return sentences.filter((sentence) => {
    const haystack =
      `${sentence.text} ${completionText.get(sentence.id) ?? ""}`.toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
