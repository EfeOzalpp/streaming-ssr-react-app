// src/server/game/highScoreRoute.ts
import { Router } from 'express'
import { writeClient } from '../sanityWrite'

const router = Router()

router.post('/highscore', async (req, res) => {
  const { score } = req.body

  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid score' })
  }

  try {
    const current = (await writeClient.fetch(
      `*[_type == "highScore"] | order(score desc)[0]{score}`
    )) as { score: number } | null

    if (current && score <= current.score) {
      return res.json({ highScore: current.score })
    }

    const created = await writeClient.create({
      _type: 'highScore',
      score,
    })

    return res.json({ highScore: created.score })
  } catch (err: any) {
    console.error('[HS API] update failed:', err.message || err)
    return res.status(500).json({ error: 'Failed to update score' })
  }
})

export default router
