import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Sprint } from '../types'

type Props = {
  sprints: Sprint[]
  activeSprintId: number
  disabled: boolean
  onSelect: (id: number) => void
  onCreate: (name: string) => void
}

export function SprintNav({ sprints, activeSprintId, disabled, onSelect, onCreate }: Props) {
  const [showForm, setShowForm] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return

    const name = String(new FormData(event.currentTarget).get('sprintName') ?? '').trim()
    if (!name) return

    onCreate(name)
    setShowForm(false)
  }

  return (
    <nav className="tf-nav" aria-label="Çalışma alanı">
      <strong>Çalışma alanı</strong>

      {sprints.map((sprint) => (
        <button
          key={sprint.id}
          type="button"
          aria-pressed={sprint.id === activeSprintId}
          disabled={disabled}
          onClick={() => onSelect(sprint.id)}
        >
          {sprint.name}
        </button>
      ))}

      <button
        type="button"
        aria-expanded={showForm}
        disabled={disabled}
        onClick={() => setShowForm((open) => !open)}
      >
        + Yeni sprint ekle
      </button>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <label>
            Sprint adı
            <input name="sprintName" required />
          </label>
          <button type="submit" disabled={disabled}>Oluştur</button>
        </form>
      )}
    </nav>
  )
}
