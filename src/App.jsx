import React, { useState, useEffect } from 'react'

const GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']

const SUBJECTS = {
  'Grade 1-5': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'],
  'Grade 6-8': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Sanskrit'],
  'Grade 9-10': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Sanskrit', 'Economics'],
  'Grade 11-12': ['English', 'Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Political Science', 'Economics', 'Accountancy', 'Business Studies']
}

const CONTENT_TYPES = ['Lesson Plan', 'Questions', 'Textbook', 'Summary', 'Quiz']

const AI_MODELS = ['Claude (Anthropic)', 'ChatGPT (OpenAI)', 'DeepSeek', 'Gemini (Google)']

const VARIABLES = [
  { label: 'Class', value: '{class}' },
  { label: 'Subject', value: '{subject}' },
  { label: 'Topic', value: '{topic}' },
  { label: 'Subtopic', value: '{subtopic}' }
]

export default function App() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [sessionSeconds, setSessionSeconds] = useState(24 * 60 * 60)

  // Form states
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [subtopic, setSubtopic] = useState('')
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('Claude (Anthropic)')
  const [selectedContentType, setSelectedContentType] = useState('Lesson Plan')
  const [output, setOutput] = useState('')
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
    if (!selectedClass) return []
    const gradeNum = parseInt(selectedClass.split(' ')[1])
    if (gradeNum <= 5) return SUBJECTS['Grade 1-5']
    if (gradeNum <= 8) return SUBJECTS['Grade 6-8']
    if (gradeNum <= 10) return SUBJECTS['Grade 9-10']
    return SUBJECTS['Grade 11-12']
  }

  const insertVariable = (variable) => {
    setPrompt(prompt + ' ' + variable.value)
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
    if (!selectedClass || !selectedSubject || !topic || !prompt) {
      setError('Please fill in: Class, Subject, Topic, and Prompt')
      return
    }

    const provider = getModelProvider(selectedModel)
    if (!apiKeys[provider]) {
      setError(`API key not configured for ${selectedModel}. Please add it in login.`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fullPrompt = `
Content Type: ${selectedContentType}
Class: ${selectedClass}
Subject: ${selectedSubject}
Topic: ${topic}
${subtopic ? `Subtopic: ${subtopic}` : ''}

User Prompt: ${prompt}

Please generate the ${selectedContentType.toLowerCase()} based on the above information.
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
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 0.25rem 0' }}>AI Content Generator</h1>
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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* LEFT SIDE - INPUTS */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1.5rem' }}>📝 Inputs</h2>

          {/* Class */}
          <div className="form-group">
            <label>Class *</label>
            <select value={selectedClass} onChange={(e) => {
              setSelectedClass(e.target.value)
              setSelectedSubject('')
            }}>
              <option value="">Select Class</option>
              {GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label>Subject *</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedClass}>
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
              placeholder="e.g., Photosynthesis, Democracy, Fractions"
            />
          </div>

          {/* Subtopic */}
          <div className="form-group">
            <label>Subtopic (Optional)</label>
            <input
              type="text"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              placeholder="e.g., Light Reactions"
            />
          </div>

          {/* Prompt */}
          <div className="form-group">
            <label>Prompt *</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              style={{ minHeight: '120px' }}
            />
          </div>

          {/* Variable Buttons */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Quick Variables</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {VARIABLES.map(v => (
                <button
                  key={v.value}
                  className="btn btn-sm"
                  onClick={() => insertVariable(v)}
                  style={{ fontSize: '11px' }}
                >
                  + {v.label}
                </button>
              ))}
            </div>
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

          {/* Content Type */}
          <div className="form-group">
            <label>Content Type *</label>
            <select value={selectedContentType} onChange={(e) => setSelectedContentType(e.target.value)}>
              {CONTENT_TYPES.map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', fontSize: '14px', fontWeight: '500' }}
          >
            {loading ? '⟳ Generating...' : '✨ Generate Content'}
          </button>
        </div>

        {/* RIGHT SIDE - OUTPUT */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1.5rem' }}>📄 Output</h2>
          
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
              lineHeight: '1.6'
            }}
          />

          {/* Copy & Download Buttons */}
          {output && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(output)
                  alert('Copied to clipboard!')
                }}
                style={{ flex: 1 }}
              >
                📋 Copy
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  const blob = new Blob([output], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `content-${Date.now()}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                style={{ flex: 1 }}
              >
                💾 Download
              </button>
            </div>
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
    onLogin(email, name, apiKeys)
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h1>🎓 AI Content Studio</h1>
        <p>Professional AI-powered content generation for CBSE K-12 education.</p>

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
              {' '}Add API Keys for AI (Required)
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
