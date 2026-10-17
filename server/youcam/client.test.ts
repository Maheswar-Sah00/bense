// Mocked: fetch is a stub. No network calls.
import { describe, expect, it, vi } from 'vitest'
import { YouCamClient, YouCamError } from './client'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const noSleep = { sleep: async () => {} }

describe('YouCamClient (mocked)', () => {
  it('starts a task, polls it and sends the bearer key', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: { task_id: 't1' } }))
      .mockResolvedValueOnce(json({ data: { task_status: 'running' } }))
      .mockResolvedValueOnce(json({ data: { task_status: 'success', results: { color: {} } } }))

    const client = new YouCamClient('k', 'https://api.test', fetchImpl)
    const result = await client.runTask('skin-tone-analysis', { src_file_id: 'f' }, noSleep)

    expect(result).toMatchObject({ status: 'success', taskId: 't1', results: { color: {} } })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/s2s/v2.0/task/skin-tone-analysis')
    expect(fetchImpl.mock.calls[2][0]).toBe('https://api.test/s2s/v2.0/task/skin-tone-analysis/t1')
    expect((fetchImpl.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer k')
  })

  it('returns engine errors from failed tasks', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: { task_id: 't1' } }))
      .mockResolvedValueOnce(
        json({ data: { task_status: 'error', error: 'error_no_face', error_message: 'No face detected' } }),
      )
    const result = await new YouCamClient('k', 'https://api.test', fetchImpl).runTask('x', {}, noSleep)
    expect(result).toMatchObject({ status: 'error', engineError: 'error_no_face' })
  })

  it('keeps polling through a 429 instead of abandoning the task', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: { task_id: 't1' } }))
      .mockResolvedValueOnce(json({ status: 429, error: 'Too many requests' }, 429))
      .mockResolvedValueOnce(json({ data: { task_status: 'success', results: {} } }))
    const result = await new YouCamClient('k', 'https://api.test', fetchImpl).runTask('x', {}, noSleep)
    expect(result.status).toBe('success')
  })

  it('parses documented error bodies', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ status: 400, error: 'Insufficient unit', error_code: 'CreditInsufficiency' }, 400))
    const error = await new YouCamClient('k', 'https://api.test', fetchImpl).startTask('x', {}).catch((e) => e)
    expect(error).toBeInstanceOf(YouCamError)
    expect(error).toMatchObject({ status: 400, errorCode: 'CreditInsufficiency' })
  })

  it('rejects malformed success responses', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({ data: {} }))
    const error = await new YouCamClient('k', 'https://api.test', fetchImpl).startTask('x', {}).catch((e) => e)
    expect(error).toMatchObject({ errorCode: 'InvalidResponse' })
  })

  it('uploads to the presigned URL without forwarding Content-Length', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({
          data: {
            files: [
              {
                file_id: 'file-1',
                requests: [
                  {
                    method: 'PUT',
                    url: 'https://s3.test/up',
                    headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '3' },
                  },
                ],
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const id = await new YouCamClient('k', 'https://api.test', fetchImpl).uploadImage(
      new Uint8Array([1, 2, 3]),
      'a.jpg',
      'image/jpeg',
    )
    expect(id).toBe('file-1')
    const [url, init] = fetchImpl.mock.calls[1]
    expect(url).toBe('https://s3.test/up')
    expect(init?.headers).toEqual({ 'Content-Type': 'image/jpeg' })
    expect(JSON.parse(fetchImpl.mock.calls[0][1]!.body as string)).toEqual({
      files: [{ content_type: 'image/jpeg', file_name: 'a.jpg', file_size: 3 }],
    })
  })

  it('reports network failures as YouCamError without a status', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'))
    const error = await new YouCamClient('k', 'https://api.test', fetchImpl).startTask('x', {}).catch((e) => e)
    expect(error).toBeInstanceOf(YouCamError)
    expect(error.status).toBeUndefined()
  })
})
