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

  // Form states
  const [selectedClass, setSelectedClass] = useState('Grade 6')
  const [selectedSubject, setSelectedSubject] = useState('Science')
  const [topic, setTopic] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('Claude (Anthropic)')
  const [selectedContentType, setSelectedContentType] = useState('Lesson Plan')

  // Output & history
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState({})
  const [history, setHistory] = useState([])

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

    const savedHistory = localStorage.getItem('cms_history')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
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

  const handleGenerate = async () => {
    if (!selectedSubject || !topic || !prompt) {
      setError('Please fill in: Subject, Topic, and Prompt')
      return
    }

    const provider = getModelProvider(selectedModel)
    if (!apiKeys[provider]) {
      setError(`API key not configured for ${selectedModel}. Please add it in login.`)
      return
    }

    setLoading(true)
    setError(null)
    setOutput('')

    try {
      const fullPrompt = `
Content Type: ${selectedContentType}
Class: ${selectedClass}
Subject: ${selectedSubject}
Topic: ${topic}
Prompt: ${prompt}

Please generate the ${selectedContentType.toLowerCase()} based on the above information. Follow CBSE curriculum guidelines and provide comprehensive content suitable for the specified class and subject.
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
          setOutput(data.content)
          
          // Add to history
          const newEntry = {
            id: `hist-${Date.now()}`,
            class: selectedClass,
            subject: selectedSubject,
            topic,
            contentType: selectedContentType,
            aiModel: selectedModel,
            prompt,
            output: data.content,
            timestamp: new Date().toLocaleString()
          }
          const newHistory = [newEntry, ...history].slice(0, 50) // Keep last 50
          setHistory(newHistory)
          localStorage.setItem('cms_history', JSON.stringify(newHistory))
        } else {
          setError('No content generated')
        }
      } else {
        const errorData = await response.json()
        setError('Generation failed: ' + (errorData.error || 'Unknown error'))
      }
    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const exportToMarkdown = () => {
    if (!output) {
      alert('No output to export')
      return
    }

    let content = `# ${selectedContentType} - ${selectedClass}\n\n`
    content += `**Subject:** ${selectedSubject}\n`
    content += `**Topic:** ${topic}\n`
    content += `**AI Model:** ${selectedModel}\n\n`
    content += `## Content\n\n${output}`

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${topic.replace(/\s+/g, '-')}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToText = () => {
    if (!output) {
      alert('No output to export')
      return
    }

    let content = `${selectedContentType} - ${selectedClass}\n`
    content += `Subject: ${selectedSubject}\n`
    content += `Topic: ${topic}\n`
    content += `AI Model: ${selectedModel}\n\n`
    content += output

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${topic.replace(/\s+/g, '-')}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    if (!output) {
      alert('No output to copy')
      return
    }
    navigator.clipboard.writeText(output)
    alert('Copied to clipboard!')
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
              {user.email} • {formatTime(sessionSeconds)} remaining
            </p>
          </div>
          <button className="btn btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* LEFT SIDE - INPUT FORM */}
          <div>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1.5rem' }}>📝 Input Parameters</h2>

              {/* Class */}
              <div className="form-group">
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
              <div className="form-group">
                <label>Subject *</label>
                <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div className="form-group">
                <label>Topic *</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis"
                />
              </div>

              {/* Content Type */}
              <div className="form-group">
                <label>Content Type *</label>
                <select value={selectedContentType} onChange={(e) => setSelectedContentType(e.target.value)}>
                  {CONTENT_TYPES.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              {/* Prompt */}
              <div className="form-group">
                <label>Prompt/Instructions *</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what content you want to generate..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              {/* AI Model */}
              <div className="form-group">
                <label>AI Model *</label>
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                  {AI_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading || !selectedSubject || !topic || !prompt}
                style={{ width: '100%', padding: '0.75rem', fontSize: '14px', fontWeight: '600' }}
              >
                {loading ? '⟳ Generating...' : '✨ Generate Content'}
              </button>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div style={{ marginTop: '2rem', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '1rem' }}>📚 Recent Generations ({history.length})</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {history.map((item) => (
                    <div key={item.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} 
                      onClick={() => {
                        setSelectedClass(item.class)
                        setSelectedSubject(item.subject)
                        setTopic(item.topic)
                        setSelectedContentType(item.contentType)
                        setSelectedModel(item.aiModel)
                        setPrompt(item.prompt)
                        setOutput(item.output)
                      }}
                      title="Click to load this generation">
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>{item.topic}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE - OUTPUT */}
          <div>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>📄 AI Output</h2>
              
              {/* Output Display */}
              <textarea
                value={output}
                readOnly
                placeholder="Generated content will appear here..."
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  lineHeight: '1.6',
                  marginBottom: '1rem'
                }}
              />

              {/* Action Buttons */}
              {output && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={copyToClipboard}
                    style={{ padding: '0.6rem' }}
                  >
                    📋 Copy
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={exportToMarkdown}
                    style={{ padding: '0.6rem' }}
                  >
                    📝 Markdown
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={exportToText}
                    style={{ padding: '0.6rem' }}
                  >
                    📄 Text
                  </button>
                </div>
              )}

              {!output && !loading && (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  <p style={{ fontSize: '14px', margin: 0 }}>Fill the form and click "Generate Content" to see AI output here!</p>
                </div>
              )}

              {loading && (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  <p style={{ fontSize: '14px', margin: 0 }}>⟳ Generating content...</p>
                </div>
              )}
            </div>
          </div>
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
    onLogin(email, name, apiKeys)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h1>🎓 AI Content Studio</h1>
        <p>Professional AI content generator for CBSE K-12 education.</p>

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
              {' '}Add API Keys (Required)
            </label>
          </div>

          {showApiKeys && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
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
            Start Generating
          </button>
        </form>
      </div>
    </div>
  )
}
