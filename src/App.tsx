import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

const stages = ['Analiz', 'Geliştirme', 'Test / KKT', 'Sürüm bekliyor'] as const
const assignees = ['Ece', 'Ahmet', 'Mehmet'] as const
const sprintStorageKey = 'taskflow.sprints'

type Stage = (typeof stages)[number]
type Assignee = (typeof assignees)[number]

type Task = {
  id: number
  title: string
  description: string
  isCompleted: boolean
  createdAt: string
  assignee?: string | null
  stage?: Stage
  sprintId?: number
}

type Sprint = {
  id: number
  name: string
}

const initialSprints: Sprint[] = [{ id: 1, name: 'Sprint 1' }]

function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Tarayıcı depolaması kapalıysa değişiklik oturum boyunca görünür.
  }
}

function loadSprints(): Sprint[] {
  try {
    const saved: unknown = JSON.parse(readStorage(sprintStorageKey) ?? 'null')
    if (!Array.isArray(saved)) return initialSprints

    return [
      ...initialSprints,
      ...saved.filter(
        (sprint): sprint is Sprint =>
          Number.isSafeInteger(sprint?.id) &&
          sprint.id > 1 &&
          typeof sprint.name === 'string' &&
          sprint.name.trim().length > 0,
      ),
    ]
  } catch {
    return initialSprints
  }
}

function stageKey(task: Task) {
  return `taskflow.stage:${task.id}:${task.createdAt}`
}

function taskStage(task: Task): Stage {
  return task.stage ?? (task.isCompleted ? 'Sürüm bekliyor' : 'Analiz')
}

function loadTaskDetails(task: Task, index: number): Task {
  const key = stageKey(task)
  const savedStage = readStorage(key)
  const savedAssignee = readStorage(`${key}:assignee`)
  const sprintId = Number(readStorage(`${key}:sprint`))

  return {
    ...task,
    stage: stages.find((stage) => stage === savedStage) ?? taskStage(task),
    assignee:
      assignees.find((person) => person === savedAssignee) ??
      assignees.find((person) => person === task.assignee?.trim()) ??
      assignees[index % assignees.length],
    sprintId: Number.isSafeInteger(sprintId) && sprintId > 0 ? sprintId : 1,
  }
}

function saveTaskDetails(
  task: Task,
  stage: Stage,
  assignee: Assignee,
  sprintId: number,
): Task {
  const key = stageKey(task)
  writeStorage(key, stage)
  writeStorage(`${key}:assignee`, assignee)
  writeStorage(`${key}:sprint`, String(sprintId))

  return { ...task, stage, assignee, sprintId }
}

function errorDetail(error: unknown) {
  return error instanceof Error ? ` (${error.message})` : ''
}

export default function App() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [sprints, setSprints] = useState(loadSprints)
  const [activeSprintId, setActiveSprintId] = useState(1)
  const [showSprintForm, setShowSprintForm] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTasks() {
      try {
        const response = await fetch('/api/tasks', {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data: Task[] = await response.json()
        if (!controller.signal.aborted) {
          setTasks(data.map(loadTaskDetails))
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(`Görevler yüklenemedi${errorDetail(error)}.`)
        }
      }
    }

    void loadTasks()
    return () => controller.abort()
  }, [])

  const activeSprint = sprints.find((sprint) => sprint.id === activeSprintId)
  const sprintTasks = (tasks ?? []).filter(
    (task) => (task.sprintId ?? 1) === activeSprintId,
  )

  function selectSprint(id: number) {
    setActiveSprintId(id)
    setEditing(null)
    setDeleting(null)
    setSaveError('')
    setUpdateError('')
  }

  function createSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('sprintName') ?? '').trim()
    if (!name) return

    const id = Math.max(...sprints.map((sprint) => sprint.id)) + 1
    const nextSprints = [...sprints, { id, name }]
    writeStorage(sprintStorageKey, JSON.stringify(nextSprints))
    setSprints(nextSprints)
    selectSprint(id)
    setShowSprintForm(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || tasks === null) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const title = String(fields.get('title') ?? '').trim()
    const description = String(fields.get('description') ?? '').trim()
    const stage = stages.find((option) => option === fields.get('stage')) ?? stages[0]
    const assignee =
      assignees.find((person) => person === fields.get('assignee')) ?? assignees[0]

    setSaveError('')
    if (!title || !description) {
      setSaveError('Başlık ve açıklama gir.')
      return
    }

    setBusy(true)

    try {
      const response = await fetch(editing ? `/api/tasks/${editing.id}` : '/api/tasks', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          isCompleted: editing?.isCompleted ?? false,
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      if (editing) {
        const updatedTask = saveTaskDetails(
          { ...editing, title, description },
          stage,
          assignee,
          editing.sprintId ?? activeSprintId,
        )
        setTasks((current) =>
          current?.map((task) => (task.id === updatedTask.id ? updatedTask : task)) ?? null,
        )
        setEditing(null)
      } else {
        const createdTask: Task = await response.json()
        const task = saveTaskDetails(createdTask, stage, assignee, activeSprintId)
        setTasks((current) => [...(current ?? []), task])
        form.reset()
      }
    } catch (error) {
      setSaveError(`Görev kaydedilemedi${errorDetail(error)}.`)
    } finally {
      setBusy(false)
    }
  }

  async function deleteTask(task: Task) {
    if (busy) return

    setBusy(true)
    setUpdateError('')

    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (response.status === 405 || response.status === 501) {
        throw new Error('API silme işlemini henüz desteklemiyor')
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      setTasks((current) => current?.filter((item) => item.id !== task.id) ?? null)
      if (editing?.id === task.id) {
        setEditing(null)
        setSaveError('')
      }
    } catch (error) {
      setUpdateError(`Görev silinemedi${errorDetail(error)}.`)
    } finally {
      setDeleting(null)
      setBusy(false)
    }
  }

  return (
    <div className="tf">
      <header className="tf-header">
        <h1>Görev Takibi</h1>
      </header>

      <div className="tf-workspace">
        <nav className="tf-nav" aria-label="Çalışma alanı">
          <strong>Çalışma alanı</strong>

          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              type="button"
              aria-pressed={sprint.id === activeSprintId}
              disabled={busy}
              onClick={() => selectSprint(sprint.id)}
            >
              {sprint.name}
            </button>
          ))}

          <button
            type="button"
            aria-expanded={showSprintForm}
            disabled={busy}
            onClick={() => setShowSprintForm((open) => !open)}
          >
            + Yeni sprint ekle
          </button>

          {showSprintForm && (
            <form onSubmit={createSprint}>
              <label>
                Sprint adı
                <input name="sprintName" required />
              </label>
              <button type="submit" disabled={busy}>Oluştur</button>
            </form>
          )}
        </nav>

        <main className="tf-main" id="sprint">
          <h2>{activeSprint?.name}</h2>

          {tasks && (
            <div className="tf-summary" aria-live="polite">
              {stages.map((stage, index) => (
                <span key={stage} data-stage={index}>
                  {sprintTasks.filter((task) => taskStage(task) === stage).length} {stage}
                </span>
              ))}
            </div>
          )}

          <div className="tf-grid">
            <section className="tf-panel" aria-labelledby="sprint-tasks">
              <h3 id="sprint-tasks">Sprint görevleri</h3>
              {loadError && <p role="alert">{loadError}</p>}
              {updateError && <p role="alert">{updateError}</p>}
              {!loadError && tasks === null && <p>Görevler yükleniyor…</p>}
              {tasks && sprintTasks.length === 0 && <p>Bu sprintte henüz görev yok.</p>}

              {assignees.map((person) => {
                const personTasks = sprintTasks.filter((task) => task.assignee === person)
                if (personTasks.length === 0) return null

                return (
                  <section key={person}>
                    <h4>{person}</h4>
                    <ul>
                      {personTasks.map((task) => (
                        <li key={task.id}>
                          <div className="tf-task">
                            <strong>{task.title}</strong>
                            <p>{task.description}</p>
                          </div>

                          <div className="tf-task-controls">
                            <span className="tf-status" data-stage={stages.indexOf(taskStage(task))}>
                              {taskStage(task)}
                            </span>

                            <div className="tf-row-actions">
                              {deleting?.id === task.id ? (
                                <>
                                  <button
                                    className="tf-delete"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void deleteTask(task)}
                                  >
                                    {busy ? 'Siliniyor…' : 'Silmeyi onayla'}
                                  </button>
                                  <button type="button" disabled={busy} onClick={() => setDeleting(null)}>
                                    Vazgeç
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      setSaveError('')
                                      setEditing(task)
                                      document.getElementById('task-form')
                                        ?.scrollIntoView({ block: 'nearest' })
                                    }}
                                  >
                                    Güncelle
                                  </button>
                                  <button
                                    className="tf-delete"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setDeleting(task)}
                                  >
                                    Sil
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </section>

            <section className="tf-panel" id="task-form" aria-labelledby="form-title">
              <h3 id="form-title">{editing ? 'Görevi güncelle' : 'Yeni görev ekle'}</h3>

              <form key={`${activeSprintId}:${editing?.id ?? 'new'}`} onSubmit={handleSubmit}>
                <fieldset disabled={busy || tasks === null}>
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
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null)
                          setSaveError('')
                        }}
                      >
                        Vazgeç
                      </button>
                    )}
                  </div>
                </fieldset>

                {saveError && <p role="alert">{saveError}</p>}
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}