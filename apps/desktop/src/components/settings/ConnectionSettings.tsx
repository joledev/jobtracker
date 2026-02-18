import { useState } from 'react'
import { useConnectionStore } from '@/stores/connection'
import { testConnection } from '@/lib/api'

export const ConnectionSettings = () => {
  const { vpsUrl, apiKey, setVpsUrl, setApiKey } = useConnectionStore()
  const [urlInput, setUrlInput] = useState(vpsUrl)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error'
    message?: string
  }>({ status: 'idle' })

  const handleSave = async () => {
    await setVpsUrl(urlInput)
    await setApiKey(keyInput)
    setTestResult({ status: 'idle' })
  }

  const handleTest = async () => {
    if (!urlInput) {
      setTestResult({ status: 'error', message: 'Enter a VPS URL first' })
      return
    }
    setTestResult({ status: 'testing' })
    const result = await testConnection(urlInput)
    if (result.ok) {
      setTestResult({ status: 'success', message: 'Connection successful' })
    } else {
      setTestResult({ status: 'error', message: result.error || 'Connection failed' })
    }
  }

  const hasChanges = urlInput !== vpsUrl || keyInput !== apiKey

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="mb-4 text-sm font-medium text-text-primary">VPS Connection</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">API URL</label>
            <input
              type="url"
              placeholder="https://your-vps.example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">API Key</label>
            <input
              type="password"
              placeholder="jt-dev-key-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-text-secondary"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="rounded-md bg-bg-hover px-4 py-2 text-sm text-text-primary transition-colors hover:bg-border disabled:opacity-40"
        >
          Save
        </button>

        <button
          onClick={handleTest}
          disabled={testResult.status === 'testing'}
          className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary disabled:opacity-40"
        >
          {testResult.status === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>

        {testResult.status === 'success' && (
          <span className="text-sm text-status-accepted">{testResult.message}</span>
        )}
        {testResult.status === 'error' && (
          <span className="text-sm text-status-rejected">{testResult.message}</span>
        )}
      </div>
    </div>
  )
}
