import express from 'express'

const app = express()
app.use(express.json())

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Set ANTHROPIC_API_KEY env var' })
  }

  try {
    const { systemPrompt, userMessage } = req.body
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    const text = data.content[0].text
    const parsed = JSON.parse(text)
    res.json(parsed)
  } catch (error) {
    res.status(500).json({ error: 'Failed to process' })
  }
})

app.listen(3001, () => console.log('API proxy on http://localhost:3001'))
