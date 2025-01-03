const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

router.post('/generate-warmup', auth, async (req, res) => {
  try {
    const { topic } = req.body;
    
    const prompt = `Create a short 2-minute mini lesson or word bank for ${topic} that can be used as a warm-up activity in a guided reading session. Keep it concise and grade-appropriate.`;

    const completion = await openai.createCompletion({
      model: "gpt-4o",
      prompt: prompt,
      max_tokens: 200,
      temperature: 0.7,
    });

    res.json({ content: completion.data.choices[0].text.trim() });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

module.exports = router; 