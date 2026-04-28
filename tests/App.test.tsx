import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../src/App'
import * as intercom from '../src/utils/intercom'

vi.mock('../src/utils/intercom', () => ({
  startIntercom: vi.fn(),
}))

describe('App Component - handleJoin error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles synchronous error in startIntercom (catch block)', async () => {
    const errorMessage = 'Failed to initialize'
    vi.mocked(intercom.startIntercom).mockRejectedValue(new Error(errorMessage))

    render(<App />)

    const connectButton = screen.getByText(/Connect to LAN/i)
    await act(async () => {
      fireEvent.click(connectButton)
    })

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    expect(screen.getAllByText(/OFFLINE/i)[0]).toBeInTheDocument()
  })

  it('handles asynchronous error via onError callback', async () => {
    const asyncErrorMessage = 'Signal connection lost'
    let onErrorCallback: (msg: string) => void = () => {}

    vi.mocked(intercom.startIntercom).mockImplementation(async (options) => {
      onErrorCallback = options.onError
      return vi.fn() // mock stop function
    })

    render(<App />)

    const connectButton = screen.getByText(/Connect to LAN/i)
    await act(async () => {
      fireEvent.click(connectButton)
    })

    await waitFor(() => {
      expect(onErrorCallback).toBeDefined()
    })

    await act(async () => {
      onErrorCallback(asyncErrorMessage)
    })

    await waitFor(() => {
      expect(screen.getByText(asyncErrorMessage)).toBeInTheDocument()
    })

    expect(screen.getAllByText(/OFFLINE/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Connect to LAN/i)).toBeInTheDocument()
  })
})
