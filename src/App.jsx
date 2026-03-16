import React, { useState, useEffect } from 'react'

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const SUBJECTS = {
  'Grade 1-5': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'],
  'Grade 6-8': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Sanskrit'],
  'Grade 9-10': ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Science', 'Social Studies', 'Sanskrit', 'Economics'],
  'Grade 11-12': ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Political Science', 'Economics', 'Accountancy', 'Business Studies']
}

const CONTENT_TYPES = ['Lesson Plan', 'Questions', 'Textbook', 'Summary', 'Quiz']
const AI_MODELS = ['Claude (Anthropic)', 'ChatGPT (OpenAI)', 'DeepSeek', 'Gemini (Google)']

export default function App() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [sessionSeconds, setSessionSeconds] = useState(24 * 60 * 60)

  // Form states for input
  const [selectedClass, setSelectedClass] = useState('Grade 6')
  const [selectedSubject, setSelectedSubject] = useState('Science')
  const [topic, setTopic] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('Claude (Anthropic)')
  const [selectedContentType, setSelectedContentType] = useState('Lesson Plan')

  // Table rows
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState({})

  // Load session
  useEffect(() => {
    const stored = localStorage.getItem('cms_session')
    if (stored) {
      const session = JSON.parse(stored)
      const elapsed = Date.now() - session.createdAt
      const remaining = (24 * 60 * 60 * 1000) - elapsed

      if (remaining > 0) {
        setUser(session.user)
        setApiKeys(session.user.apiKeys || {})
        setSessionSeconds(Math.floor(remaining / 1000))
      } else {
        localStorage.removeItem('cms_session')
      }
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

  const handleLogin = (email, name, keys) => {
    const session = { user: { email, name, apiKeys: keys }, createdAt: Date.now() }
    localStorage.setItem('cms_session', JSON.stringify(session))
    setUser(session.user)
    setApiKeys(keys)
    setSessionSeconds(24 * 60 * 60)
    setError(null)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('cms_session')
    setSessionSeconds(24 * 60 * 60)
  }

  const getSubjects = () => {
    const gradeNum = parseInt(selectedClass.split(' ')[1])
    if (gradeNum <= 5) return SUBJECTS['Grade 1-5']
    if (gradeNum <= 8) return SUBJECTS['Grade 6-8']
    if (gradeNum <= 10) return SUBJECTS['Grade 9-10']
    return SUBJECTS['Grade 11-12']
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const getModelProvider = (model) => {
    if (model.includes('Claude')) return 'anthropic'
    if (model.includes('ChatGPT')) return 'openai'
    if (model.includes('DeepSeek')) return 'deepseek'
    if (model.includes('Gemini')) return 'google'
    return 'anthropic'
  }

  const addRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      class: selectedClass,
      subject: selectedSubject,
      topic: topic,
      contentType: selectedContentType,
      aiModel: selectedModel,
      prompt: prompt,
      output: '',
      status: 'pending'
    }
    setRows([...rows, newRow])
    // Reset form
    setTopic('')
    setPrompt('')
  }

  const deleteRow = (id) => {
    setRows(rows.filter(r => r.id !== id))
  }

  const generateAllRows = async () => {
    const rowsToGenerate = rows.filter(r => r.status === 'pending')
    
    if (rowsToGenerate.length === 0) {
      setError('No pending rows to generate')
      return
    }

    setLoading(true)
    setError(null)

    for (const row of rowsToGenerate) {
      try {
        const provider = getModelProvider(row.aiModel)
        if (!apiKeys[provider]) {
          setError(`API key not configured for ${row.aiModel}`)
          setRows(prevRows =>
            prevRows.map(r =>
              r.id === row.id ? { ...r, status: 'error', output: 'API key not configured' } : r
            )
          )
          continue
        }

        const fullPrompt = `
Content Type: ${row.contentType}
Class: ${row.class}
Subject: ${row.subject}
Topic: ${row.topic}
Prompt: ${row.prompt}

Please generate the ${row.contentType.toLowerCase()} based on the above information. Follow CBSE curriculum guidelines.
        `.trim()

        const response = await fetch('/.netlify/functions/ai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            prompt: fullPrompt,
            apiKey: apiKeys[provider]
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.content) {
            setRows(prevRows =>
              prevRows.map(r =>
                r.id === row.id ? { ...r, output: data.content, status: 'success' } : r
              )
            )
          } else {
            setRows(prevRows =>
              prevRows.map(r =>
                r.id === row.id ? { ...r, status: 'error', output: 'No content generated' } : r
              )
            )
          }
        } else {
          const errorData = await response.json()
          setRows(prevRows =>
            prevRows.map(r =>
              r.id === row.id ? { ...r, status: 'error', output: errorData.error || 'Generation failed' } : r
            )
          )
        }
      } catch (err) {
        setRows(prevRows =>
          prevRows.map(r =>
            r.id === row.id ? { ...r, status: 'error', output: err.message } : r
          )
        )
      }
    }

    setLoading(false)
  }

  const exportToMarkdown = () => {
    let content = '# AI Generated Educational Content\n\n'
    content += `**Generated on:** ${new Date().toLocaleString()}\n\n`

    rows.forEach((row, idx) => {
      content += `## ${idx + 1}. ${row.contentType} - ${row.topic}\n\n`
      content += `| Property | Value |\n`
      content += `|----------|-------|\n`
      content += `| Class | ${row.class} |\n`
      content += `| Subject | ${row.subject} |\n`
      content += `| Topic | ${row.topic} |\n`
      content += `| Content Type | ${row.contentType} |\n`
      content += `| AI Model | ${row.aiModel} |\n`
      content += `| Status | ${row.status} |\n\n`
      content += `### Content:\n\n${row.output || 'No content generated'}\n\n---\n\n`
    })

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-content-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToCSV = () => {
    let content = 'Class,Subject,Topic,Content Type,AI Model,Status,Output\n'
    rows.forEach(row => {
      const output = (row.output || '').replace(/"/g, '""').replace(/\n/g, ' ')
      content += `"${row.class}","${row.subject}","${row.topic}","${row.contentType}","${row.aiModel}","${row.status}","${output}"\n`
    })

    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-content-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} error={error} />
  }

  const subjects = getSubjects()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 0.25rem 0' }}>🎓 AI Content Generator</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              {user.email} • {formatTime(sessionSeconds)} remaining • {rows.length} content items queued
            </p>
          </div>
          <button className="btn btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        
        {/* INPUT SECTION */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1.5rem' }}>📝 Create New Content Row</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Class */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Class *</label>
              <select value={selectedClass} onChange={(e) => {
                setSelectedClass(e.target.value)
                setSelectedSubject('')
              }}>
                {GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Subject *</label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">Select Subject</option>
                {subjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Content Type */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Content Type *</label>
              <select value={selectedContentType} onChange={(e) => setSelectedContentType(e.target.value)}>
                {CONTENT_TYPES.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Topic */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Topic *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Democracy, Fractions"
              />
            </div>

            {/* AI Model */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>AI Model *</label>
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                {AI_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prompt */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Prompt/Instructions *</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what content you want to generate..."
              style={{ minHeight: '80px' }}
            />
          </div>

          {/* Add Row Button */}
          <button
            className="btn btn-primary"
            onClick={addRow}
            disabled={!selectedSubject || !topic || !prompt}
            style={{ padding: '0.6rem 1.2rem', fontSize: '13px' }}
          >
            + Add Row
          </button>
        </div>

        {/* TABLE SECTION */}
        {rows.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>📋 Content Queue ({rows.length} items)</h2>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={generateAllRows}
                  disabled={loading || rows.filter(r => r.status === 'pending').length === 0}
                >
                  {loading ? '⟳ Generating...' : '✨ Generate All'}
                </button>
                <button className="btn btn-sm" onClick={exportToMarkdown}>
                  📄 Markdown
                </button>
                <button className="btn btn-sm" onClick={exportToCSV}>
                  📊 CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '30px' }}>#</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '70px' }}>Class</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '100px' }}>Subject</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '120px' }}>Topic</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '100px' }}>Type</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '80px' }}>AI Model</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '70px' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', minWidth: '200px' }}>Output Preview</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', minWidth: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>{idx + 1}</td>
                      <td style={{ padding: '0.75rem' }}>{row.class}</td>
                      <td style={{ padding: '0.75rem' }}>{row.subject}</td>
                      <td style={{ padding: '0.75rem' }}>{row.topic}</td>
                      <td style={{ padding: '0.75rem' }}>{row.contentType}</td>
                      <td style={{ padding: '0.75rem', fontSize: '11px' }}>{row.aiModel.split(' ')[0]}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: row.status === 'success' ? '#28a745' : row.status === 'error' ? '#dc3545' : '#ffc107',
                          color: 'white'
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.output ? row.output.substring(0, 80) + '...' : '—'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          className="btn"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '14px', color: 'var(--danger)' }}
                          onClick={() => deleteRow(row.id)}
                          title="Delete row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Rows</div>
                <div style={{ fontSize: '20px', fontWeight: '600' }}>{rows.length}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#ffc107' }}>{rows.filter(r => r.status === 'pending').length}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Success</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#28a745' }}>{rows.filter(r => r.status === 'success').length}</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Error</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#dc3545' }}>{rows.filter(r => r.status === 'error').length}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoginScreen({ onLogin, error }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    deepseek: '',
    google: ''
  })

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
        <h1>🎓 AI Content Studio</h1>
        <p>Professional AI content generator for CBSE K-12 education - Batch generation with multiple export formats.</p>

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
              {' '}Add API Keys (Required for content generation)
            </label>
          </div>

          {showApiKeys && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Add at least one API key to generate content:</p>
              
              <div className="form-group">
                <label>Claude API Key (Anthropic)</label>
                <input
                  type="password"
                  value={apiKeys.anthropic}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>

              <div className="form-group">
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>

              <div className="form-group">
                <label>DeepSeek API Key</label>
                <input
                  type="password"
                  value={apiKeys.deepseek}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, deepseek: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>

              <div className="form-group">
                <label>Google Gemini API Key</label>
                <input
                  type="password"
                  value={apiKeys.google}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                  placeholder="AIza..."
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            Start Generating Content
          </button>
        </form>
      </div>
    </div>
  )
}
