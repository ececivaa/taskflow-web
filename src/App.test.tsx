import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Task } from './types'

const seedTasks: Task[] = [
  {
    id: 1,
    title: 'API tasarımı',
    description: 'Uç noktaları belirle',
    isCompleted: false,
    createdAt: '2026-11-01T09:00:00Z',
  },
  {
    id: 2,
    title: 'Sürüm notları',
    description: 'Değişiklikleri yaz',
    isCompleted: true,
    createdAt: '2026-11-01T10:00:00Z',
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Basit, bellek içi bir sahte API kurar ve fetch çağrılarını döndürür. */
function mockApi(options: { failLoad?: boolean; deleteStatus?: number } = {}) {
  let nextId = 100
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    if (method === 'GET') {
      return options.failLoad ? jsonResponse({}, 500) : jsonResponse(seedTasks)
    }
    if (method === 'POST') {
      const body = JSON.parse(String(init?.body))
      return jsonResponse({ ...body, id: nextId++, createdAt: '2026-11-17T12:00:00Z' }, 201)
    }
    if (method === 'PUT') return new Response(null, { status: 204 })
    if (method === 'DELETE') return new Response(null, { status: options.deleteStatus ?? 204 })
    throw new Error(`Beklenmeyen istek: ${method} ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

describe('App', () => {
  it('görevleri yükler ve sorumluya göre gruplar', async () => {
    mockApi()
    render(<App />)

    expect(screen.getByText('Görevler yükleniyor…')).toBeInTheDocument()
    expect(await screen.findByText('API tasarımı')).toBeInTheDocument()

    const eceGroup = screen.getByRole('heading', { name: 'Ece', level: 4 }).closest('section')!
    expect(within(eceGroup).getByText('API tasarımı')).toBeInTheDocument()

    const ahmetGroup = screen.getByRole('heading', { name: 'Ahmet', level: 4 }).closest('section')!
    expect(within(ahmetGroup).getByText('Sürüm notları')).toBeInTheDocument()
    expect(within(ahmetGroup).getByText('Sürüm bekliyor', { selector: '.tf-status' }))
      .toBeInTheDocument()
  })

  it('yükleme hatasını gösterir', async () => {
    mockApi({ failLoad: true })
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Görevler yüklenemedi (HTTP 500).')
  })

  it('yeni görev ekler ve formu temizler', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi()
    render(<App />)
    await screen.findByText('API tasarımı')

    await user.type(screen.getByLabelText('Başlık'), 'Testleri yaz')
    await user.type(screen.getByLabelText('Açıklama'), 'Vitest ile')
    await user.selectOptions(screen.getByLabelText('Sorumlu'), 'Mehmet')
    await user.selectOptions(screen.getByLabelText('Aşama'), 'Geliştirme')
    await user.click(screen.getByRole('button', { name: 'Görevi ekle' }))

    const mehmetGroup = (await screen.findByRole('heading', { name: 'Mehmet', level: 4 }))
      .closest('section')!
    expect(within(mehmetGroup).getByText('Testleri yaz')).toBeInTheDocument()
    expect(within(mehmetGroup).getByText('Geliştirme', { selector: '.tf-status' }))
      .toBeInTheDocument()
    expect(screen.getByLabelText('Başlık')).toHaveValue('')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('görevi günceller', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App />)
    const item = (await screen.findByText('API tasarımı')).closest('li')!

    await user.click(within(item).getByRole('button', { name: 'Güncelle' }))
    expect(screen.getByRole('heading', { name: 'Görevi güncelle' })).toBeInTheDocument()

    const title = screen.getByLabelText('Başlık')
    await user.clear(title)
    await user.type(title, 'API sözleşmesi')
    await user.click(screen.getByRole('button', { name: 'Değişiklikleri kaydet' }))

    expect(await screen.findByText('API sözleşmesi')).toBeInTheDocument()
    expect(screen.queryByText('API tasarımı')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yeni görev ekle' })).toBeInTheDocument()
  })

  it('silmeden önce onay ister', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App />)
    const item = (await screen.findByText('API tasarımı')).closest('li')!

    await user.click(within(item).getByRole('button', { name: 'Sil' }))
    await user.click(within(item).getByRole('button', { name: 'Silmeyi onayla' }))

    expect(screen.queryByText('API tasarımı')).not.toBeInTheDocument()
  })

  it('API silmeyi desteklemiyorsa açıklayıcı hata verir', async () => {
    const user = userEvent.setup()
    mockApi({ deleteStatus: 405 })
    render(<App />)
    const item = (await screen.findByText('API tasarımı')).closest('li')!

    await user.click(within(item).getByRole('button', { name: 'Sil' }))
    await user.click(within(item).getByRole('button', { name: 'Silmeyi onayla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Görev silinemedi (API silme işlemini henüz desteklemiyor).',
    )
    expect(screen.getByText('API tasarımı')).toBeInTheDocument()
  })

  it('yeni sprint oluşturur ve ona geçer', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App />)
    await screen.findByText('API tasarımı')

    await user.click(screen.getByRole('button', { name: '+ Yeni sprint ekle' }))
    await user.type(screen.getByLabelText('Sprint adı'), 'Sprint 2')
    await user.click(screen.getByRole('button', { name: 'Oluştur' }))

    expect(screen.getByRole('heading', { name: 'Sprint 2', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sprint 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bu sprintte henüz görev yok.')).toBeInTheDocument()
  })
})
