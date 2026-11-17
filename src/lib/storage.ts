import { assignees, stages } from '../types'
import type { Assignee, Sprint, Stage, Task } from '../types'

/*
 * API şu an yalnızca başlık, açıklama ve tamamlanma durumunu saklıyor.
 * Aşama, sorumlu ve sprint bilgisi backend desteklenene kadar tarayıcıda
 * (localStorage) tutuluyor; anahtar görev id'si + oluşturulma zamanından
 * üretildiği için silinip yeniden oluşturulan id'ler eski veriyi devralmaz.
 */

const sprintStorageKey = 'taskflow.sprints'

export const initialSprints: Sprint[] = [{ id: 1, name: 'Sprint 1' }]

export function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Tarayıcı depolaması kapalıysa değişiklik oturum boyunca görünür.
  }
}

export function loadSprints(): Sprint[] {
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

export function saveSprints(sprints: Sprint[]) {
  writeStorage(sprintStorageKey, JSON.stringify(sprints))
}

function stageKey(task: Task) {
  return `taskflow.stage:${task.id}:${task.createdAt}`
}

export function taskStage(task: Task): Stage {
  return task.stage ?? (task.isCompleted ? 'Sürüm bekliyor' : 'Analiz')
}

export function loadTaskDetails(task: Task, index: number): Task {
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

export function saveTaskDetails(
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
