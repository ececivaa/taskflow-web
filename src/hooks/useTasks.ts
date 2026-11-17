import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import { loadTaskDetails, saveTaskDetails } from '../lib/storage'
import type { Task, TaskInput } from '../types'

/** Görev listesini API'den yükler ve ekleme/güncelleme/silme işlemlerini yönetir. */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    api
      .fetchTasks(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setTasks(data.map(loadTaskDetails))
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(`Görevler yüklenemedi${api.errorDetail(error)}.`)
        }
      })

    return () => controller.abort()
  }, [])

  async function withBusy<T>(action: () => Promise<T>) {
    setBusy(true)
    try {
      return await action()
    } finally {
      setBusy(false)
    }
  }

  function addTask(input: TaskInput, sprintId: number) {
    return withBusy(async () => {
      const created = await api.createTask({
        title: input.title,
        description: input.description,
        isCompleted: false,
      })
      const task = saveTaskDetails(created, input.stage, input.assignee, sprintId)
      setTasks((current) => [...(current ?? []), task])
    })
  }

  function editTask(original: Task, input: TaskInput, fallbackSprintId: number) {
    return withBusy(async () => {
      await api.updateTask(original.id, {
        title: input.title,
        description: input.description,
        isCompleted: original.isCompleted,
      })
      const updated = saveTaskDetails(
        { ...original, title: input.title, description: input.description },
        input.stage,
        input.assignee,
        original.sprintId ?? fallbackSprintId,
      )
      setTasks((current) =>
        current?.map((task) => (task.id === updated.id ? updated : task)) ?? null,
      )
    })
  }

  function removeTask(task: Task) {
    return withBusy(async () => {
      await api.deleteTask(task.id)
      setTasks((current) => current?.filter((item) => item.id !== task.id) ?? null)
    })
  }

  return { tasks, loadError, busy, addTask, editTask, removeTask }
}
