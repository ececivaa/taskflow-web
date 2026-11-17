import { taskStage } from '../lib/storage'
import { assignees, stages } from '../types'
import type { Task } from '../types'

type Props = {
  tasks: Task[]
  busy: boolean
  deletingId: number | null
  onEdit: (task: Task) => void
  onRequestDelete: (task: Task) => void
  onConfirmDelete: (task: Task) => void
  onCancelDelete: () => void
}

/** Sprint görevlerini sorumlu kişiye göre gruplayarak listeler. */
export function TaskList({ tasks, ...itemProps }: Props) {
  return (
    <>
      {assignees.map((person) => {
        const personTasks = tasks.filter((task) => task.assignee === person)
        if (personTasks.length === 0) return null

        return (
          <section key={person}>
            <h4>{person}</h4>
            <ul>
              {personTasks.map((task) => (
                <TaskItem key={task.id} task={task} {...itemProps} />
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

function TaskItem({
  task,
  busy,
  deletingId,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: Omit<Props, 'tasks'> & { task: Task }) {
  const stage = taskStage(task)

  return (
    <li>
      <div className="tf-task">
        <strong>{task.title}</strong>
        <p>{task.description}</p>
      </div>

      <div className="tf-task-controls">
        <span className="tf-status" data-stage={stages.indexOf(stage)}>
          {stage}
        </span>

        <div className="tf-row-actions">
          {deletingId === task.id ? (
            <>
              <button
                className="tf-delete"
                type="button"
                disabled={busy}
                onClick={() => onConfirmDelete(task)}
              >
                {busy ? 'Siliniyor…' : 'Silmeyi onayla'}
              </button>
              <button type="button" disabled={busy} onClick={onCancelDelete}>
                Vazgeç
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => onEdit(task)}>
                Güncelle
              </button>
              <button
                className="tf-delete"
                type="button"
                disabled={busy}
                onClick={() => onRequestDelete(task)}
              >
                Sil
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
