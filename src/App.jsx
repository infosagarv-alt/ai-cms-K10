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
  const [expandedRowId, setExpandedRowId] = useState(null)
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
      loading: false,
      createdAt: new Date().toLocaleString()
    }

    setRows([newRow, ...rows])
    setNewRowTopic('')
    setNewRowPrompt('')
    setError(null)
  }

  const deleteRow = (id) => {
    setRows(rows.filter(r => r.id !== id))
  }

  const updateRowPrompt = (id, prompt) => {
    setRows(prevRows =>
      prevRows.map(r =>
        r.id === id ? { ...r, prompt } : r
      )
    )
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

      doc.setFontSize(16)
      doc.text('AI Generated Educational Content', margin, yPosition)
      yPosition += 10

      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition)
      yPosition += 10

      successRows.forEach((row, idx) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(`${idx + 1}. ${row.topic}`, margin, yPosition)
        yPosition += 8

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

        doc.setFontSize(10)
        const splitContent = doc.splitTextToSize(row.output, maxWidth)
        const contentHeight = splitContent.length * 4

        if (yPosition + contentHeight > pageHeight - 20) {
          doc.addPage()
          yPosition = 20
        }

        doc.text(splitContent, margin, yPosition)
        yPosition += contentHeight + 10

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

  const exportAllMarkdown = () => {
    const successRows = rows.filter(r => r.output)
    if (successRows.length === 0) {
      alert('No generated content to export')
      return
    }

    let content = '# AI Generated Educational Content\n\n'
    content += `**Generated on:** ${new Date().toLocaleString()}\n\n`
    content += `**Total Items:** ${successRows.length}\n\n---\n\n`

    successRows.forEach((row, idx) => {
      content += `## ${idx + 1}. ${row.topic}\n\n`
      content += `| Property | Value |\n|----------|-------|\n`
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

  const copyRowOutput = (output) => {
    navigator.clipboard.writeText(output)
    alert('Copied to clipboard!')
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} error={error} />
  }

  const newRowSubjects = getSubjects(newRowClass)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#ff4444', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 0.25rem 0' }}>🎓 AI Content Generator</h1>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              {user.email} • {formatTime(sessionSeconds)} remaining • {rows.length} rows • {rows.filter(r => r.output).length} generated
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={exportAllMarkdown} disabled={!rows.some(r => r.output)} style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              📄 MD
            </button>
            <button onClick={exportAllPDF} disabled={!rows.some(r => r.output)} style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              📕 PDF
            </button>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        
        {/* ADD ROW FORM */}
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #ddd' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 1rem 0' }}>📝 Add New Row</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
            <select value={newRowClass} onChange={(e) => {
              setNewRowClass(e.target.value)
              setNewRowSubject('')
            }} style={{ padding: '0.5rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select value={newRowSubject} onChange={(e) => setNewRowSubject(e.target.value)} style={{ padding: '0.5rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="">Subject</option>
              {newRowSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <input type="text" value={newRowTopic} onChange={(e) => setNewRowTopic(e.target.value)} placeholder="Topic" style={{ padding: '0.5rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} />

            <select value={newRowContentType} onChange={(e) => setNewRowContentType(e.target.value)} style={{ padding: '0.5rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
              {CONTENT_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
            </select>

            <select value={newRowModel} onChange={(e) => setNewRowModel(e.target.value)} style={{ padding: '0.5rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }}>
              {AI_MODELS.map(m => <option key={m} value={m}>{m.split(' ')[0]}</option>)}
            </select>

            <input type="text" value={newRowPrompt} onChange={(e) => setNewRowPrompt(e.target.value)} placeholder="Prompt" style={{ padding: '0.5rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px' }} />

            <button onClick={addRow} style={{ padding: '0.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
              + Add
            </button>
          </div>
        </div>

        {/* ROWS TABLE */}
        <div style={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd', overflow: 'hidden' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '3rem' }}>
              <p>📚 No rows added yet. Fill the form above and click "+ Add" to get started!</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr 100px', backgroundColor: '#f9f9f9', borderBottom: '1px solid #ddd', padding: '0.75rem 1rem', fontSize: '12px', fontWeight: '600', color: '#333' }}>
                <div></div>
                <div>Topic</div>
                <div>Class • Subject</div>
                <div>Content Type</div>
                <div>Model</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Table Rows */}
              {rows.map((row) => (
                <div key={row.id}>
                  {/* Collapsed Row */}
                  <div onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr 1fr 1fr 100px', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: 'white', fontSize: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      {expandedRowId === row.id ? '▼' : '▶'}
                    </div>
                    <div style={{ fontWeight: '500' }}>{row.topic}</div>
                    <div style={{ color: '#666', fontSize: '11px' }}>{row.class} • {row.subject}</div>
                    <div style={{ color: '#666', fontSize: '11px' }}>{row.contentType}</div>
                    <div style={{ color: '#666', fontSize: '11px' }}>{row.aiModel.split(' ')[0]}</div>
                    <div>
                      {row.output ? (
                        <span style={{ color: '#28a745', fontWeight: '600' }}>✓ Generated</span>
                      ) : row.loading ? (
                        <span style={{ color: '#ff9800' }}>⟳ Generating...</span>
                      ) : (
                        <span style={{ color: '#999' }}>—</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); generateRow(row.id); }} disabled={row.loading} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                        {row.loading ? '...' : '✨'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteRow(row.id); }} style={{ padding: '0.3rem 0.4rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Expanded Row - Details */}
                  {expandedRowId === row.id && (
                    <div style={{ padding: '1.5rem', backgroundColor: '#fafafa', borderBottom: '1px solid #eee', borderTop: '1px solid #eee' }}>
                      {/* Metadata */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', fontSize: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>Class</p>
                          <p style={{ margin: 0, color: '#666' }}>{row.class}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>Subject</p>
                          <p style={{ margin: 0, color: '#666' }}>{row.subject}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>Content Type</p>
                          <p style={{ margin: 0, color: '#666' }}>{row.contentType}</p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333' }}>AI Model</p>
                          <p style={{ margin: 0, color: '#666' }}>{row.aiModel}</p>
                        </div>
                      </div>

                      {/* Prompt + Remark */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333', fontSize: '12px' }}>PROMPT:</p>
                          <textarea value={row.prompt} onChange={(e) => updateRowPrompt(row.id, e.target.value)} style={{ width: '100%', minHeight: '120px', padding: '0.75rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }} />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                            <button onClick={() => insertVariable(row.id, `{${row.class}}`)} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#e9ecef', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                              + Class
                            </button>
                            <button onClick={() => insertVariable(row.id, `{${row.subject}}`)} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#e9ecef', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                              + Subject
                            </button>
                            <button onClick={() => insertVariable(row.id, `{${row.topic}}`)} style={{ padding: '0.3rem 0.6rem', backgroundColor: '#e9ecef', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                              + Topic
                            </button>
                          </div>
                        </div>

                        <div>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333', fontSize: '12px' }}>REMARK:</p>
                          <textarea value={row.remark} onChange={(e) => updateRowRemark(row.id, e.target.value)} placeholder="Add notes..." style={{ width: '100%', minHeight: '120px', padding: '0.75rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }} />
                        </div>
                      </div>

                      {/* Output */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#333', fontSize: '12px' }}>OUTPUT:</p>
                        {row.output ? (
                          <div style={{ width: '100%', minHeight: '200px', maxHeight: '400px', overflow: 'auto', padding: '0.75rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {row.output}
                          </div>
                        ) : row.loading ? (
                          <div style={{ width: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fafafa', color: '#999' }}>
                            ⟳ Generating content...
                          </div>
                        ) : (
                          <div style={{ width: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fafafa', color: '#999' }}>
                            👉 Click "Generate" to create content
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => generateRow(row.id)} disabled={row.loading} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                          {row.loading ? '⟳ Generating...' : '✨ Generate Content'}
                        </button>
                        {row.output && (
                          <button onClick={() => copyRowOutput(row.output)} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            📋 Copy Output
                          </button>
                        )}
                        <button onClick={() => deleteRow(row.id)} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          ✕ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 0.5rem 0' }}>🎓 AI Content Studio Pro</h1>
        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 1.5rem 0' }}>Professional AI content generator for CBSE K-12 education</p>

        {error && <div style={{ padding: '0.75rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '1rem', fontSize: '12px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '0.5rem' }}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required style={{ width: '100%', padding: '0.75rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '0.5rem' }}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required style={{ width: '100%', padding: '0.75rem', fontSize: '12px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showApiKeys} onChange={(e) => setShowApiKeys(e.target.checked)} />
              {' '}Add API Keys (At least one required)
            </label>
          </div>

          {showApiKeys && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
              <p style={{ fontSize: '11px', color: '#666', marginBottom: '1rem', margin: '0 0 1rem 0' }}>Add API keys to enable content generation:</p>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '0.25rem' }}>Claude API Key</label>
                <input type="password" value={apiKeys.anthropic} onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))} placeholder="sk-..." style={{ width: '100%', padding: '0.5rem', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '0.25rem' }}>OpenAI API Key</label>
                <input type="password" value={apiKeys.openai} onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))} placeholder="sk-..." style={{ width: '100%', padding: '0.5rem', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '0.25rem' }}>DeepSeek API Key</label>
                <input type="password" value={apiKeys.deepseek} onChange={(e) => setApiKeys(prev => ({ ...prev, deepseek: e.target.value }))} placeholder="sk-..." style={{ width: '100%', padding: '0.5rem', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '0.25rem' }}>Google Gemini API Key</label>
                <input type="password" value={apiKeys.google} onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))} placeholder="AIza..." style={{ width: '100%', padding: '0.5rem', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
            Start Generating
          </button>
        </form>
      </div>
    </div>
  )
}
