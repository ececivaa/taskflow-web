import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import {
  initialSprints,
  loadSprints,
  loadTaskDetails,
  saveSprints,
  saveTaskDetails,
  taskStage,
} from './storage'

const baseTask: Task = {
  id: 7,
  title: 'Giriş ekranı',
  description: 'Form doğrulaması',
  isCompleted: false,
  createdAt: '2026-11-01T10:00:00Z',
}

describe('loadSprints', () => {
  it('kayıt yoksa varsayılan sprinti döndürür', () => {
    expect(loadSprints()).toEqual(initialSprints)
  })

  it('bozuk JSON durumunda varsayılana döner', () => {
    localStorage.setItem('taskflow.sprints', '{bozuk')
    expect(loadSprints()).toEqual(initialSprints)
  })

  it('geçersiz kayıtları eler, geçerlileri korur', () => {
    localStorage.setItem(
      'taskflow.sprints',
      JSON.stringify([
        { id: 1, name: 'Tekrar eden varsayılan' },
        { id: 2, name: 'Sprint 2' },
        { id: 3, name: '   ' },
        { id: 'x', name: 'Hatalı id' },
        null,
      ]),
    )

    expect(loadSprints()).toEqual([...initialSprints, { id: 2, name: 'Sprint 2' }])
  })

  it('saveSprints ile kaydedilenleri geri okur', () => {
    const sprints = [...initialSprints, { id: 2, name: 'Sprint 2' }]
    saveSprints(sprints)
    expect(loadSprints()).toEqual(sprints)
  })
})

describe('taskStage', () => {
  it('aşama yoksa tamamlanma durumuna göre karar verir', () => {
    expect(taskStage(baseTask)).toBe('Analiz')
    expect(taskStage({ ...baseTask, isCompleted: true })).toBe('Sürüm bekliyor')
  })

  it('kayıtlı aşamayı önceliklendirir', () => {
    expect(taskStage({ ...baseTask, stage: 'Geliştirme' })).toBe('Geliştirme')
  })
})

describe('loadTaskDetails / saveTaskDetails', () => {
  it('kaydedilen aşama, sorumlu ve sprinti geri yükler', () => {
    saveTaskDetails(baseTask, 'Test / KKT', 'Mehmet', 3)

    expect(loadTaskDetails(baseTask, 0)).toMatchObject({
      stage: 'Test / KKT',
      assignee: 'Mehmet',
      sprintId: 3,
    })
  })

  it('kayıt yoksa sorumluyu sırayla dağıtır ve Sprint 1 kullanır', () => {
    expect(loadTaskDetails(baseTask, 1)).toMatchObject({
      stage: 'Analiz',
      assignee: 'Ahmet',
      sprintId: 1,
    })
  })

  it('API’den gelen geçerli sorumluyu kullanır', () => {
    expect(loadTaskDetails({ ...baseTask, assignee: ' Ece ' }, 2).assignee).toBe('Ece')
  })

  it('aynı id ile yeniden oluşturulan görev eski veriyi devralmaz', () => {
    saveTaskDetails(baseTask, 'Geliştirme', 'Mehmet', 2)
    const recreated = { ...baseTask, createdAt: '2026-11-02T10:00:00Z' }

    expect(loadTaskDetails(recreated, 0)).toMatchObject({
      stage: 'Analiz',
      assignee: 'Ece',
      sprintId: 1,
    })
  })
})
