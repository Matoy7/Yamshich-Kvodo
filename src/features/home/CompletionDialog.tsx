import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { COMPLETION_MAX_LENGTH, type Sentence } from '@/data/sentences'

type CompletionDialogProps = {
  sentence: Sentence | null
  onClose: () => void
  onSubmit: (sentenceId: string, text: string) => Promise<void>
}

/** Writes the ending for someone else's sentence. */
export function CompletionDialog({ sentence, onClose, onSubmit }: CompletionDialogProps) {
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue('')
    setError(null)
    setPending(false)
  }, [sentence?.id])

  async function submit() {
    if (!sentence) return
    const trimmed = value.trim()
    if (!trimmed) return

    setPending(true)
    setError(null)
    try {
      await onSubmit(sentence.id, trimmed)
      onClose()
    } catch {
      setError('לא הצלחנו לשמור את ההשלמה. נסו שוב.')
      setPending(false)
    }
  }

  return (
    <Modal
      open={Boolean(sentence)}
      onClose={onClose}
      title="השלמת המשפט"
      description={sentence ? `${sentence.text}...` : undefined}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>
            ביטול
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            disabled={pending || value.trim().length === 0}
          >
            {pending ? 'שומר…' : 'שלח השלמה'}
          </Button>
        </>
      }
    >
      <Input
        inputSize="lg"
        value={value}
        maxLength={COMPLETION_MAX_LENGTH}
        onChange={(event) => setValue(event.target.value.slice(0, COMPLETION_MAX_LENGTH))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
        placeholder="איך המשפט נגמר?"
        aria-label={`השלמת המשפט (עד ${COMPLETION_MAX_LENGTH} תווים)`}
        error={error ?? undefined}
        trailing={
          <span dir="ltr" aria-hidden className="text-caption tabular-nums text-content-muted">
            {value.length} / {COMPLETION_MAX_LENGTH}
          </span>
        }
      />
    </Modal>
  )
}
