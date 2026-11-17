export const stages = ['Analiz', 'Geliştirme', 'Test / KKT', 'Sürüm bekliyor'] as const
export const assignees = ['Ece', 'Ahmet', 'Mehmet'] as const

export type Stage = (typeof stages)[number]
export type Assignee = (typeof assignees)[number]

export type Task = {
  id: number
  title: string
  description: string
  isCompleted: boolean
  createdAt: string
  assignee?: string | null
  stage?: Stage
  sprintId?: number
}

export type Sprint = {
  id: number
  name: string
}

/** Görev formundan gelen, kaydedilmeye hazır değerler. */
export type TaskInput = {
  title: string
  description: string
  stage: Stage
  assignee: Assignee
}
