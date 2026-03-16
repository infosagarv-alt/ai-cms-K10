import React, { useState, useEffect } from 'react'

const AI_MODELS = {
  anthropic: [
    { id: 'claude-3-5-sonnet', label: 'Sonnet 3.5' },
    { id: 'claude-3-opus', label: 'Opus 3' }
  ],
  openai: [
    { id: 'gpt-4', label: 'GPT-4' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  google: [
    { id: 'gemini-pro', label: 'Gemini Pro' }
  ],
  deepseek: [
    { id: 'deepseek-v3', label: 'DeepSeek V3' }
  ]
}

const FIELD_TYPES = {
  'text-short': { label: 'Short Text', icon: 'A' },
  'text-long': { label: 'Long Text', icon: '¶' },
  'select-single': { label: 'Single Select', icon: '▼' },
  'ai-field': { label: 'AI Field', icon: '✨' },
  'date': { label: 'Date', icon: '📅' },
  'number': { label: 'Number', icon: '#' },
  'attachment': { label: 'Attachment', icon: '📎' }
}

const DEFAULT_PAGES = {
  textbook: { name: 'Textbook', columns: [], rows: [] },
  questions: { name: 'Questions', columns: [], rows: [] },
  'lesson-plans': { name: 'Lesson Plans', columns: [], rows: [] }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [pages, setPages] = useState(DEFAULT_PAGES)
  const [currentPage, setCurrentPage] = useState('textbook')
  const [expandedCell, setExpandedCell] = useState(null)
  const [error, setError] = useState(null)
  const [sessionSeconds, setSessionSeconds] = useState(24 * 60 * 60)
  const [db, setDb] = useState(null)
  const [colMenuOpen, setColMenuOpen] = useState(null)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [newColConfig, setNewColConfig] = useState({ name: '', type: 'text-short', options: [] })

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open('aiCMS', 1)
    request.onsuccess = () => setDb(request.result)
    request.onupgradeneeded = (e) => {
      const database = e.target.result
      if (!database.objectStoreNames.contains('workspace')) {
        database.createObjectStore('workspace', { keyPath: 'id' })
      }
    }
  }, [])

  // Load session
  useEffect(() => {
    const stored = localStorage.getItem('cms_session')
    if (stored) {
      const session = JSON.parse(stored)
      const elapsed = Date.now() - session.createdAt
      const remaining = (24 * 60 * 60 * 1000) - elapsed

      if (remaining > 0) {
        setUser(session.user)
        setSessionSeconds(Math.floor(remaining / 1000))
      } else {
        localStorage.removeItem('cms_session')
      }
    }

    const stored_pages = localStorage.getItem('cms_pages')
    if (stored_pages) {
      setPages(JSON.parse(stored_pages))
    }
  }, [])

  // Session timer
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      setSessionSeconds(s => {
        if (s <= 1) {
          setUser(null)
          localStorage.removeItem('cms_session')
          setError('Session expired. Please log in again.')
          return 24 * 60 * 60
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [user])

  // Auto-save pages
  useEffect(() => {
    localStorage.setItem('cms_pages', JSON.stringify(pages))
    if (db) {
      const tx = db.transaction('workspace', 'readwrite')
      const store = tx.objectStore('workspace')
      store.put({ id: 'pages', data: pages, timestamp: Date.now() })
    }
  }, [pages, db])

  const handleLogin = (email, name, apiKeys) => {
    const session = { user: { email, name, apiKeys }, createdAt: Date.now() }
    localStorage.setItem('cms_session', JSON.stringify(session))
    setUser(session.user)
    setSessionSeconds(24 * 60 * 60)
    setError(null)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('cms_session')
    setSessionSeconds(24 * 60 * 60)
  }

  const addColumn = () => {
    if (!newColConfig.name.trim()) {
      alert('Column name is required')
      return
    }

    const col = {
      id: `col-${Date.now()}`,
      name: newColConfig.name,
      type: newColConfig.type,
      options: newColConfig.type === 'select-single' ? newColConfig.options : null,
      maxLength: newColConfig.type === 'text-short' ? 25 : null,
      maxWords: newColConfig.type === 'text-long' ? 10000 : null
    }

    setPages(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        columns: [...prev[currentPage].columns, col]
      }
    }))

    setShowColumnConfig(false)
    setNewColConfig({ name: '', type: 'text-short', options: [] })
  }

  const deleteColumn = (colId) => {
    if (window.confirm('Delete this column?')) {
      setPages(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          columns: prev[currentPage].columns.filter(c => c.id !== colId)
        }
      }))
    }
  }

  const addRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      cells: {},
      createdBy: user.email,
      createdAt: new Date().toISOString()
    }

    pages[currentPage].columns.forEach(col => {
      newRow.cells[col.id] = ''
    })

    setPages(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        rows: [...prev[currentPage].rows, newRow]
      }
    }))
  }

  const deleteRow = (rowId) => {
    if (window.confirm('Delete this row?')) {
      setPages(prev => ({
        ...prev,
        [currentPage]: {
          ...prev[currentPage],
          rows: prev[currentPage].rows.filter(r => r.id !== rowId)
        }
      }))
    }
  }

  const updateCell = (rowId, colId, value) => {
    setPages(prev => ({
      ...prev,
      [currentPage]: {
        ...prev[currentPage],
        rows: prev[currentPage].rows.map(r =>
          r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
        )
      }
    }))
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const handleExport = () => {
    const page = pages[currentPage]
    let content = '| ' + page.columns.map(c => c.name).join(' | ') + ' |\n'
    content += '| ' + page.columns.map(() => '---').join(' | ') + ' |\n'

    page.rows.forEach(row => {
      content += '| ' + page.columns.map(c => (row.cells[c.id] || '').replace(/\|/g, '\\|')).join(' | ') + ' |\n'
    })

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export-${currentPage}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} error={error} />
  }

  const page = pages[currentPage]

  return (
    <div className="app-container">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="sidebar">
        <h3>Pages</h3>
        {Object.entries(pages).map(([key, p]) => (
          <button
            key={key}
            className={`page-btn ${currentPage === key ? 'active' : ''}`}
            onClick={() => {
              setCurrentPage(key)
              setExpandedCell(null)
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <h2>{page.name}</h2>
            <p>{user.email} • {formatTime(sessionSeconds)} remaining • {page.columns.length} columns • {page.rows.length} rows</p>
          </div>
          <div className="header-right">
            <button className="btn btn-primary btn-sm" onClick={() => setShowColumnConfig(true)}>
              + Column
            </button>
            <button className="btn btn-primary btn-sm" onClick={addRow}>
              + Row
            </button>
            <button className="btn btn-sm" onClick={handleExport}>
              Export
            </button>
            <button className="btn btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                {page.columns.map(col => (
                  <th key={col.id} id={`col-${col.id}`}>
                    <div className="col-header">
                      <span>{FIELD_TYPES[col.type]?.icon || '•'}</span>
                      <span>{col.name}</span>
                      <span
                        className="col-menu"
                        onClick={(e) => {
                          e.stopPropagation()
                          setColMenuOpen(colMenuOpen === col.id ? null : col.id)
                        }}
                      >
                        ⋮
                      </span>
                      {colMenuOpen === col.id && (
                        <div className="col-menu-dropdown">
                          <button onClick={() => {
                            const newName = prompt('New column name:', col.name)
                            if (newName) {
                              setPages(prev => ({
                                ...prev,
                                [currentPage]: {
                                  ...prev[currentPage],
                                  columns: prev[currentPage].columns.map(c =>
                                    c.id === col.id ? { ...c, name: newName } : c
                                  )
                                }
                              }))
                              setColMenuOpen(null)
                            }
                          }}>
                            Rename
                          </button>
                          <button onClick={() => {
                            deleteColumn(col.id)
                            setColMenuOpen(null)
                          }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row, idx) => (
                <tr key={row.id}>
                  <td style={{ width: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    {idx + 1}
                  </td>
                  {page.columns.map(col => (
                    <td
                      key={`${row.id}-${col.id}`}
                      onClick={() => setExpandedCell({ rowId: row.id, colId: col.id })}
                    >
                      {(row.cells[col.id] || '').substring(0, 50)}
                    </td>
                  ))}
                  <td style={{ width: '40px', textAlign: 'center' }}>
                    <button
                      className="btn"
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
                      onClick={() => deleteRow(row.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showColumnConfig && (
        <ColumnConfigModal
          config={newColConfig}
          setConfig={setNewColConfig}
          onAdd={addColumn}
          onClose={() => setShowColumnConfig(false)}
        />
      )}

      {expandedCell && (
        <CellPanel
          row={pages[currentPage].rows.find(r => r.id === expandedCell.rowId)}
          column={pages[currentPage].columns.find(c => c.id === expandedCell.colId)}
          onUpdate={(value) => updateCell(expandedCell.rowId, expandedCell.colId, value)}
          onClose={() => setExpandedCell(null)}
          apiKeys={user.apiKeys}
        />
      )}
    </div>
  )
}

function LoginScreen({ onLogin, error }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [apiKeys, setApiKeys] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !name) {
      alert('Email and name are required')
      return
    }
    onLogin(email, name, apiKeys)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h1>AI Content Studio Pro</h1>
        <p>Professional K-12 content management with Lark Base-like features.</p>

        {error && <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
          </div>

          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>

          <div className="form-group">
            <label>
              <input type="checkbox" checked={showApiKeys} onChange={(e) => setShowApiKeys(e.target.checked)} />
              {' '}Add API Keys (Optional)
            </label>
          </div>

          {showApiKeys && (
            <div style={{ marginBottom: '1rem' }}>
              {Object.keys(AI_MODELS).map(provider => (
                <div key={provider} className="form-group">
                  <label>{provider.charAt(0).toUpperCase() + provider.slice(1)} API Key</label>
                  <input
                    type="password"
                    placeholder={`Enter ${provider} API key (optional)`}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            Start Session
          </button>
        </form>
      </div>
    </div>
  )
}

function ColumnConfigModal({ config, setConfig, onAdd, onClose }) {
  const [optionInput, setOptionInput] = useState('')

  const addOption = () => {
    if (optionInput.trim()) {
      setConfig(prev => ({
        ...prev,
        options: [...prev.options, optionInput]
      }))
      setOptionInput('')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h1>Create New Column</h1>

        <div className="form-group">
          <label>Column Name *</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Topic, Question, Grade Level"
          />
        </div>

        <div className="form-group">
          <label>Field Type *</label>
          <select value={config.type} onChange={(e) => setConfig(prev => ({ ...prev, type: e.target.value, options: [] }))}>
            {Object.entries(FIELD_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {config.type === 'select-single' && (
          <div className="form-group">
            <label>Options</label>
            <div style={{ marginBottom: '0.5rem' }}>
              {config.options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" value={opt} disabled style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      options: prev.options.filter((_, i) => i !== idx)
                    }))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addOption()}
                placeholder="Add option"
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={addOption}>
                Add
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={onAdd} style={{ flex: 1 }}>
            Create Column
          </button>
          <button className="btn" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function CellPanel({ row, column, onUpdate, onClose, apiKeys }) {
  const [value, setValue] = useState(row.cells[column.id] || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiProvider, setAiProvider] = useState('anthropic')
  const [aiModel, setAiModel] = useState('claude-3-5-sonnet')
  const [aiPrompt, setAiPrompt] = useState('')

  const validateTextLength = (text) => {
    if (column.type === 'text-short' && column.maxLength) {
      if (text.length > column.maxLength) {
        alert(`Maximum ${column.maxLength} characters allowed`)
        return false
      }
    }
    if (column.type === 'text-long' && column.maxWords) {
      const words = text.trim().split(/\s+/).length
      if (words > column.maxWords) {
        alert(`Maximum ${column.maxWords} words allowed`)
        return false
      }
    }
    return true
  }

  const handleSave = () => {
    if (validateTextLength(value)) {
      onUpdate(value)
      onClose()
    }
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt')
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/.netlify/functions/ai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          prompt: aiPrompt,
          apiKey: apiKeys[aiProvider]
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiResult(data.content)
        setValue(data.content)
      } else {
        alert('Generation failed')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>{column.name}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        <div className="field">
          <div className="field-label">
            {FIELD_TYPES[column.type]?.label}
          </div>

          {column.type === 'text-short' && (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter text (max 25 characters)"
              maxLength={25}
            />
          )}

          {column.type === 'text-long' && (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter text (max 10000 words)"
            />
          )}

          {column.type === 'date' && (
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}

          {column.type === 'number' && (
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter number"
            />
          )}

          {column.type === 'select-single' && (
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Select...</option>
              {column.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {column.type === 'ai-field' && (
            <div className="ai-section">
              {aiResult && (
                <div className="ai-result">{aiResult}</div>
              )}
              <div className="form-group">
                <label>Provider</label>
                <select value={aiProvider} onChange={(e) => {
                  setAiProvider(e.target.value)
                  setAiModel(Object.keys(AI_MODELS[e.target.value])[0]?.id || '')
                }}>
                  {Object.keys(AI_MODELS).map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Model</label>
                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                  {AI_MODELS[aiProvider].map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Prompt</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Write your prompt..."
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAIGenerate}
                disabled={aiLoading}
                style={{ width: '100%' }}
              >
                {aiLoading ? '⟳ Generating...' : '✨ Generate'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="panel-footer">
        <button className="btn btn-primary" onClick={handleSave}>
          Save
        </button>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
