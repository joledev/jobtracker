import { useState, useEffect } from 'react'
import { useConnectionStore, type StorageMode } from '@/stores/connection'
import { testConnection } from '@/lib/api'
import { initLocalDb } from '@/lib/local-db'
import { usePipelineStore } from '@/stores/pipeline'

export const ConnectionSettings = () => {
  const { storageMode, vpsUrl, apiKey, setStorageMode, setVpsUrl, setApiKey } = useConnectionStore()
  const fetchStages = usePipelineStore((s) => s.fetchStages)
  const fetchWorkspaces = usePipelineStore((s) => s.fetchWorkspaces)

  const [mode, setMode] = useState<StorageMode>(storageMode)
  const [urlInput, setUrlInput] = useState(vpsUrl)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error'
    message?: string
  }>({ status: 'idle' })
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setMode(storageMode)
    setUrlInput(vpsUrl)
    setKeyInput(apiKey)
  }, [storageMode, vpsUrl, apiKey])

  const handleModeChange = async (newMode: StorageMode) => {
    setMode(newMode)
    setSwitching(true)
    setTestResult({ status: 'idle' })
    try {
      await setStorageMode(newMode)
      if (newMode === 'local') {
        await initLocalDb()
      }
      await fetchStages()
      await fetchWorkspaces()
    } finally {
      setSwitching(false)
    }
  }

  const handleSave = async () => {
    await setVpsUrl(urlInput)
    await setApiKey(keyInput)
    setTestResult({ status: 'idle' })
    await fetchStages()
    await fetchWorkspaces()
  }

  const handleTest = async () => {
    if (!urlInput) {
      setTestResult({ status: 'error', message: 'Enter an API URL first' })
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
      {/* Storage Mode Selector */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-text-primary">Storage Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('local')}
            disabled={switching}
            className={`relative rounded-lg border p-4 text-left transition-all ${
              mode === 'local'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-border bg-bg-card hover:border-text-muted'
            } disabled:opacity-50`}
          >
            <div className="mb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span className="text-sm font-medium text-text-primary">Local</span>
            </div>
            <p className="text-xs text-text-muted">
              SQLite on your machine. No server needed.
            </p>
            {mode === 'local' && (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('remote')}
            disabled={switching}
            className={`relative rounded-lg border p-4 text-left transition-all ${
              mode === 'remote'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-border bg-bg-card hover:border-text-muted'
            } disabled:opacity-50`}
          >
            <div className="mb-1 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-sm font-medium text-text-primary">Remote API</span>
            </div>
            <p className="text-xs text-text-muted">
              Self-hosted API on your VPS or Docker.
            </p>
            {mode === 'remote' && (
              <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
        {switching && (
          <p className="mt-2 text-xs text-text-muted">Switching storage mode...</p>
        )}
      </div>

      {/* Local mode info */}
      {mode === 'local' && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-blue-400">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <p className="text-sm text-text-secondary">
                All data is stored locally in a SQLite database on your computer. No internet connection required.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Data location: <code className="rounded bg-bg-hover px-1">~/.jobtracker/jobtracker.db</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Remote mode config */}
      {mode === 'remote' && (
        <>
          <div>
            <h3 className="mb-4 text-sm font-medium text-text-primary">API Connection</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">API URL</label>
                <input
                  type="url"
                  placeholder="https://jobtracker.yourdomain.com"
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
        </>
      )}
    </div>
  )
}
