import type { Task } from '../types'

type TaskBody = Pick<Task, 'title' | 'description' | 'isCompleted'>

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response
}

function jsonInit(method: string, body: TaskBody): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function fetchTasks(signal?: AbortSignal): Promise<Task[]> {
  const response = await request('/api/tasks', { signal })
  return response.json()
}

export async function createTask(body: TaskBody): Promise<Task> {
  const response = await request('/api/tasks', jsonInit('POST', body))
  return response.json()
}

export async function updateTask(id: number, body: TaskBody): Promise<void> {
  await request(`/api/tasks/${id}`, jsonInit('PUT', body))
}

export async function deleteTask(id: number): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  if (response.status === 405 || response.status === 501) {
    throw new Error('API silme işlemini henüz desteklemiyor')
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

export function errorDetail(error: unknown) {
  return error instanceof Error ? ` (${error.message})` : ''
}
