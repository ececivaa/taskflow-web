import { useState } from 'react'
import './App.css'
import { SprintNav } from './components/SprintNav'
import { StageSummary } from './components/StageSummary'
import { TaskForm } from './components/TaskForm'
import { TaskList } from './components/TaskList'
import { useTasks } from './hooks/useTasks'
import { errorDetail } from './lib/api'
import { loadSprints, saveSprints } from './lib/storage'
import type { Task, TaskInput } from './types'

export default function App() {
  const { tasks, loadError, busy, addTask, editTask, removeTask } = useTasks()
  const [sprints, setSprints] = useState(loadSprints)
  const [activeSprintId, setActiveSprintId] = useState(1)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)
  const [updateError, setUpdateError] = useState('')

  const activeSprint = sprints.find((sprint) => sprint.id === activeSprintId)
  const sprintTasks = (tasks ?? []).filter(
    (task) => (task.sprintId ?? 1) === activeSprintId,
  )

  function selectSprint(id: number) {
    setActiveSprintId(id)
    setEditing(null)
    setDeleting(null)
    setUpdateError('')
  }

  function createSprint(name: string) {
    const id = Math.max(...sprints.map((sprint) => sprint.id)) + 1
    const nextSprints = [...sprints, { id, name }]
    saveSprints(nextSprints)
    setSprints(nextSprints)
    selectSprint(id)
  }

  async function saveTask(input: TaskInput) {
    if (editing) {
      await editTask(editing, input, activeSprintId)
      setEditing(null)
    } else {
      await addTask(input, activeSprintId)
    }
  }

  function startEditing(task: Task) {
    setEditing(task)
    document.getElementById('task-form')?.scrollIntoView({ block: 'nearest' })
  }

  async function confirmDelete(task: Task) {
    if (busy) return
    setUpdateError('')

    try {
      await removeTask(task)
      if (editing?.id === task.id) setEditing(null)
    } catch (error) {
      setUpdateError(`Görev silinemedi${errorDetail(error)}.`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="tf">
      <header className="tf-header">
        <h1>Görev Takibi</h1>
      </header>

      <div className="tf-workspace">
        <SprintNav
          sprints={sprints}
          activeSprintId={activeSprintId}
          disabled={busy}
          onSelect={selectSprint}
          onCreate={createSprint}
        />

        <main className="tf-main" id="sprint">
          <h2>{activeSprint?.name}</h2>

          {tasks && <StageSummary tasks={sprintTasks} />}

          <div className="tf-grid">
            <section className="tf-panel" aria-labelledby="sprint-tasks">
              <h3 id="sprint-tasks">Sprint görevleri</h3>
              {loadError && <p role="alert">{loadError}</p>}
              {updateError && <p role="alert">{updateError}</p>}
              {!loadError && tasks === null && <p>Görevler yükleniyor…</p>}
              {tasks && sprintTasks.length === 0 && <p>Bu sprintte henüz görev yok.</p>}

              <TaskList
                tasks={sprintTasks}
                busy={busy}
                deletingId={deleting?.id ?? null}
                onEdit={startEditing}
                onRequestDelete={setDeleting}
                onConfirmDelete={(task) => void confirmDelete(task)}
                onCancelDelete={() => setDeleting(null)}
              />
            </section>

            <TaskForm
              key={`${activeSprintId}:${editing?.id ?? 'new'}`}
              editing={editing}
              disabled={busy || tasks === null}
              onSave={saveTask}
              onCancel={() => setEditing(null)}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
