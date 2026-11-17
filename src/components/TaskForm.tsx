import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorDetail } from '../lib/api'
import { taskStage } from '../lib/storage'
import { assignees, stages } from '../types'
import type { Task, TaskInput } from '../types'

type Props = {
  /** Düzenlenen görev; yeni görev eklenirken null. */
  editing: Task | null
  disabled: boolean
  onSave: (input: TaskInput) => Promise<void>
  onCancel: () => void
}

/*
 * Form, üst bileşende sprint ya da düzenlenen görev değiştiğinde `key` ile
 * yeniden oluşturulur; bu sayede alanlar ve hata mesajı kendiliğinden sıfırlanır.
 */
export function TaskForm({ editing, disabled, onSave, onCancel }: Props) {
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const title = String(fields.get('title') ?? '').trim()
    const description = String(fields.get('description') ?? '').trim()
    const stage = stages.find((option) => option === fields.get('stage')) ?? stages[0]
    const assignee =
      assignees.find((person) => person === fields.get('assignee')) ?? assignees[0]

    setError('')
    if (!title || !description) {
      setError('Başlık ve açıklama gir.')
      return
    }

    try {
      await onSave({ title, description, stage, assignee })
      if (!editing) form.reset()
    } catch (saveError) {
      setError(`Görev kaydedilemedi${errorDetail(saveError)}.`)
    }
  }

  return (
    <section className="tf-panel" id="task-form" aria-labelledby="form-title">
      <h3 id="form-title">{editing ? 'Görevi güncelle' : 'Yeni görev ekle'}</h3>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={disabled}>
          <label>
            Başlık
            <input name="title" defaultValue={editing?.title} required />
          </label>

          <label>
            Açıklama
            <textarea name="description" defaultValue={editing?.description} rows={3} required />
          </label>

          <label>
            Sorumlu
            <select name="assignee" defaultValue={editing?.assignee ?? assignees[0]}>
              {assignees.map((person) => (
                <option key={person} value={person}>{person}</option>
              ))}
            </select>
          </label>

          <label>
            Aşama
            <select name="stage" defaultValue={editing ? taskStage(editing) : stages[0]}>
              {stages.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </label>

          <div className="tf-actions">
            <button className="tf-primary" type="submit">
              {editing ? 'Değişiklikleri kaydet' : 'Görevi ekle'}
            </button>

            {editing && (
              <button type="button" onClick={onCancel}>
                Vazgeç
              </button>
            )}
          </div>
        </fieldset>

        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  )
}
