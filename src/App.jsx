import React, { useState, useEffect } from 'react'

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const SUBJECTS = {
  'Grade 1-5': [
    'English',
    'Hindi',
    'Mathematics',
    'Science',
    'Social Studies',
    'Sanskrit',
    'Urdu',
    'Computer Science'
  ],
  'Grade 6-8': [
    'English',
    'Hindi',
    'Mathematics',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'Social Studies',
    'History',
    'Geography',
    'Civics',
    'Sanskrit',
    'Urdu',
    'Computer Science',
    'Information Technology',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Grade 9-10': [
    'English',
    'Hindi',
    'Mathematics',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'Social Studies',
    'History',
    'Geography',
    'Civics',
    'Economics',
    'Sanskrit',
    'Urdu',
    'Computer Science',
    'Information Technology',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Grade 11-12': [
    'English',
    'Hindi',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Accountancy',
    'Business Studies',
    'Economics',
    'History',
    'Geography',
    'Political Science',
    'Computer Science',
    'Information Technology',
    'Statistics',
    'Psychology',
    'Sociology',
    'Physical Education',
    'Art',
    'Music',
    'Agriculture',
    'Home Science'
  ]
}

const CONTENT_TYPES = ['Lesson Plan', 'Questions', 'Textbook', 'Summary', 'Quiz', 'Notes', 'Practice Paper', 'Sample Paper', 'Assignment', 'Worksheet']
const AI_MODELS = ['Claude (Anthropic)', 'ChatGPT (OpenAI)', 'DeepSeek', 'Gemini (Google)']

export default function App() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [sessionSeconds, setSessionSeconds] = useState(24 * 60 * 60)

  // Form states for adding new row
  const [newRowClass, setNewRowClass] = useState('Grade 6')
  const [newRowSubject, setNewRowSubject] = useState('Physics')
  const [newRowTopic, setNewRowTopic] = useState('')
  const [newRowPrompt, setNewRowPrompt] = useState('')
  const [newRowModel, setNewRowModel] = useState('Claude (Anthropic)')
  const [newRowContentType, setNewRowContentType] = useState('Lesson Plan')

  // Rows state
  const [rows, setRows] = useState([])
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

  const getSubjects = (gradeClass) => {
    const gradeNum = parseInt(gradeClass.split(' ')[1])
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
    if (!newRowSubject || !newRowTopic || !newRowPrompt) {
      setError('Please fill Subject, Topic, and Prompt')
      return
    }

    const newRow = {
      id: `row-${Date.now()}`,
      class: newRowClass,
      subject: newRowSubject,
      topic: newRowTopic,
      prompt: newRowPrompt,
      contentType: newRowContentType,
      aiModel: newRowModel,
      output: '',
      remark: '',
      loading: false
    }

    setRows([...rows, newRow])
    setNewRowTopic('')
    setNewRowPrompt('')
  }

  const deleteRow = (id) => {
    setRows(rows.filter(r => r.id !== id))
  }

  const updateRowRemark = (id, remark) => {
    setRows(prevRows =>
      prevRows.map(r =>
        r.id === id ? { ...r, remark } : r
      )
    )
  }

  const insertVariable = (id, variable) => {
    setRows(prevRows =>
      prevRows.map(r =>
        r.id === id ? { ...r, prompt: r.prompt + ' ' + variable } : r
      )
    )
  }

  const generateRow = async (id) => {
    const row = rows.find(r => r.id === id)
    if (!row) return

    const provider = getModelProvider(row.aiModel)
    if (!apiKeys[provider]) {
      setError(`API key not configured for ${row.aiModel}`)
      return
    }

    setRows(prevRows =>
      prevRows.map(r =>
        r.id === id ? { ...r, loading: true } : r
      )
    )
    setError(null)

    try {
      const fullPrompt = `
Content Type: ${row.contentType}
Class: ${row.class}
Subject: ${row.subject}
Topic: ${row.topic}

Prompt: ${row.prompt}

Please generate comprehensive ${row.contentType.toLowerCase()} content based on the above requirements. 
Follow CBSE curriculum guidelines and provide detailed, well-structured content suitable for the specified class and subject. 
The content should be educational, accurate, engaging, and at least 2000 words if possible.
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
              r.id === id ? { ...r, output: data.content, loading: false } : r
            )
          )
        } else {
          setError('No content generated')
          setRows(prevRows =>
            prevRows.map(r =>
              r.id === id ? { ...r, loading: false } : r
            )
          )
        }
      } else {
        const errorData = await response.json()
        setError('Generation failed: ' + (errorData.error || 'Unknown error'))
        setRows(prevRows =>
          prevRows.map(r =>
            r.id === id ? { ...r, loading: false } : r
          )
        )
      }
    } catch (err) {
      setError('Error: ' + err.message)
      setRows(prevRows =>
        prevRows.map(r =>
          r.id === id ? { ...r, loading: false } : r
        )
      )
    }
  }

  const exportAllMarkdown = () => {
    const successRows = rows.filter(r => r.output)
    if (successRows.length === 0) {
      alert('No generated content to export')
      return
    }

    let content = '# AI Generated Educational Content\n\n'
    content += `**Generated on:** ${new Date().toLocaleString()}\n\n`
    content += `**Total Items:** ${successRows.length}\n\n`
    content += `---\n\n`

    successRows.forEach((row, idx) => {
      content += `## ${idx + 1}. ${row.topic}\n\n`
      content += `| Property | Value |\n`
      content += `|----------|-------|\n`
      content += `| Class | ${row.class} |\n`
      content += `| Subject | ${row.subject} |\n`
      content += `| Content Type | ${row.contentType} |\n`
      content += `| AI Model | ${row.aiModel} |\n`
      if (row.remark) content += `| Remark | ${row.remark} |\n`
      content += `\n### Content:\n\n${row.output}\n\n---\n\n`
    })

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-content-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAllPDF = async () => {
    const successRows = rows.filter(r => r.output)
    if (successRows.length === 0) {
      alert('No generated content to export')
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      let yPosition = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const maxWidth = pageWidth - 2 * margin

      // Title
      doc.setFontSize(16)
      doc.text('AI Generated Educational Content', margin, yPosition)
      yPosition += 10

      // Date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition)
      yPosition += 10

      // Content
      successRows.forEach((row, idx) => {
        // Check if new page needed
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }

        // Row title
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(`${idx + 1}. ${row.topic}`, margin, yPosition)
        yPosition += 8

        // Metadata
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.text(`Class: ${row.class} | Subject: ${row.subject} | Type: ${row.contentType}`, margin, yPosition)
        yPosition += 6
        doc.text(`AI Model: ${row.aiModel}`, margin, yPosition)
        yPosition += 6
        if (row.remark) {
          doc.text(`Remark: ${row.remark}`, margin, yPosition)
          yPosition += 6
        }

        yPosition += 2

        // Content
        doc.setFontSize(10)
        const splitContent = doc.splitTextToSize(row.output, maxWidth)
        const contentHeight = splitContent.length * 4

        // Check if content fits on current page
        if (yPosition + contentHeight > pageHeight - 20) {
          doc.addPage()
          yPosition = 20
        }

        doc.text(splitContent, margin, yPosition)
        yPosition += contentHeight + 10

        // Separator
        if (yPosition < pageHeight - 20) {
          doc.setDrawColor(200, 200, 200)
          doc.line(margin, yPosition, pageWidth - margin, yPosition)
          yPosition += 8
        }
      })

      doc.save(`ai-content-${Date.now()}.pdf`)
    } catch (err) {
      setError('PDF export error: ' + err.message)
    }
  }

  const exportAllText = () => {
    const successRows = rows.filter(r => r.output)
    if (successRows.length === 0) {
      alert('No generated content to export')
      return
    }

    let content = `AI GENERATED EDUCATIONAL CONTENT\n`
    content += `Generated on: ${new Date().toLocaleString()}\n`
    content += `Total Items: ${successRows.length}\n`
    content += `${'='.repeat(80)}\n\n`

    successRows.forEach((row, idx) => {
      content += `${idx + 1}. ${row.topic}\n`
      content += `${'-'.repeat(80)}\n`
      content += `Class: ${row.class}\n`
      content += `Subject: ${row.subject}\n`
      content += `Content Type: ${row.contentType}\n`
      content += `AI Model: ${row.aiModel}\n`
      if (row.remark) content += `Remark: ${row.remark}\n`
      content += `Prompt: ${row.prompt}\n\n`
      content += `CONTENT:\n`
      content += `${row.output}\n\n`
      content += `${'='.repeat(80)}\n\n`
    })

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-content-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyRowOutput = (output) => {
    navigator.clipboard.writeText(output)
    alert('Copied to clipboard!')
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} error={error} />
  }

  const newRowSubjects = getSubjects(newRowClass)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 0.25rem 0' }}>🎓 AI Content Generator</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
              {user.email} • {formatTime(sessionSeconds)} remaining • {rows.length} rows • {rows.filter(r => r.output).length} generated
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-sm" onClick={exportAllMarkdown} disabled={!rows.some(r => r.output)} title="Export all as Markdown">
              📄 MD
            </button>
            <button className="btn btn-sm" onClick={exportAllPDF} disabled={!rows.some(r => r.output)} title="Export all as PDF">
              📕 PDF
            </button>
            <button className="btn btn-sm" onClick={exportAllText} disabled={!rows.some(r => r.output)} title="Export all as Text">
              📝 TXT
            </button>
            <button className="btn btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* ADD ROW FORM */}
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 0.75rem 0' }}>📝 Add New Row</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <select value={newRowClass} onChange={(e) => {
              setNewRowClass(e.target.value)
              setNewRowSubject('')
            }} style={{ padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select value={newRowSubject} onChange={(e) => setNewRowSubject(e.target.value)} style={{ padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}>
              <option value="">Subject</option>
              {newRowSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input type="text" value={newRowTopic} onChange={(e) => setNewRowTopic(e.target.value)} placeholder="Topic" style={{ padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }} />

            <select value={newRowContentType} onChange={(e) => setNewRowContentType(e.target.value)} style={{ padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}>
              {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>

            <select value={newRowModel} onChange={(e) => setNewRowModel(e.target.value)} style={{ padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}>
              {AI_MODELS.map(m => <option key={m} value={m}>{m.split(' ')[0]}</option>)}
            </select>

            <input type="text" value={newRowPrompt} onChange={(e) => setNewRowPrompt(e.target.value)} placeholder="Prompt" style={{ padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }} />

            <button className="btn btn-primary btn-sm" onClick={addRow} style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
              + Add Row
            </button>
          </div>
        </div>

        {/* ROWS TABLE */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '2rem' }}>
              <p style={{ fontSize: '14px' }}>📚 No rows added yet. Fill the form above and click "+ Add Row" to get started!</p>
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                
                {/* Row Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>📌 {row.topic}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {row.class} • {row.subject} • {row.contentType} • {row.aiModel.split(' ')[0]}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => generateRow(row.id)} disabled={row.loading} style={{ padding: '0.5rem 1rem', fontSize: '12px', whiteSpace: 'nowrap', fontWeight: '600' }}>
                      {row.loading ? '⟳ Generating...' : '✨ Generate'}
                    </button>
                    {row.output && (
                      <button className="btn btn-sm" onClick={() => copyRowOutput(row.output)} style={{ padding: '0.4rem 0.6rem', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        📋 Copy
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => deleteRow(row.id)} style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                      ✕ Del
                    </button>
                  </div>
                </div>

                {/* Grid: Prompt + Variables + Remark */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Prompt Section */}
                  <div>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PROMPT:</p>
                    <textarea value={row.prompt} onChange={(e) => setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, prompt: e.target.value } : r))} style={{ width: '100%', minHeight: '80px', padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
                    
                    {/* Variable Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" onClick={() => insertVariable(row.id, `{${row.class}}`)} style={{ padding: '0.3rem 0.6rem', fontSize: '11px' }}>
                        + Class
                      </button>
                      <button className="btn btn-sm" onClick={() => insertVariable(row.id, `{${row.subject}}`)} style={{ padding: '0.3rem 0.6rem', fontSize: '11px' }}>
                        + Subject
                      </button>
                      <button className="btn btn-sm" onClick={() => insertVariable(row.id, `{${row.topic}}`)} style={{ padding: '0.3rem 0.6rem', fontSize: '11px' }}>
                        + Topic
                      </button>
                    </div>
                  </div>

                  {/* Remark Section */}
                  <div style={{ minWidth: '250px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>REMARK:</p>
                    <textarea value={row.remark} onChange={(e) => updateRowRemark(row.id, e.target.value)} placeholder="Add notes..." style={{ width: '100%', minHeight: '80px', padding: '0.5rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }} />
                  </div>
                </div>

                {/* Output */}
                <div>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>OUTPUT:</p>
                  {row.output ? (
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', minHeight: '150px', maxHeight: '400px', overflowY: 'auto' }}>
                      <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.output}</p>
                    </div>
                  ) : row.loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                      ⟳ Generating content... please wait
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem', fontSize: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px' }}>
                      👉 Click "✨ Generate" button to generate content
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
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
    if (!Object.values(apiKeys).some(k => k.trim())) {
      alert('Please add at least one API key')
      return
    }
    onLogin(email, name, apiKeys)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h1>🎓 AI Content Studio Pro</h1>
        <p>Professional AI content generator for CBSE K-12 education with full markdown and PDF support.</p>

        {error && <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger)', color: 'white', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>

          <div className="form-group">
            <label>
              <input type="checkbox" checked={showApiKeys} onChange={(e) => setShowApiKeys(e.target.checked)} />
              {' '}Add API Keys (At least one required)
            </label>
          </div>

          {showApiKeys && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Add API keys to enable content generation:</p>
              
              <div className="form-group">
                <label>Claude API Key (Anthropic)</label>
                <input type="password" value={apiKeys.anthropic} onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))} placeholder="sk-..." />
              </div>
              <div className="form-group">
                <label>OpenAI API Key</label>
                <input type="password" value={apiKeys.openai} onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))} placeholder="sk-..." />
              </div>
              <div className="form-group">
                <label>DeepSeek API Key</label>
                <input type="password" value={apiKeys.deepseek} onChange={(e) => setApiKeys(prev => ({ ...prev, deepseek: e.target.value }))} placeholder="sk-..." />
              </div>
              <div className="form-group">
                <label>Google Gemini API Key</label>
                <input type="password" value={apiKeys.google} onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))} placeholder="AIza..." />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            Start Generating
          </button>
        </form>
      </div>
    </div>
  )
}
