import {useEffect, useState} from 'react'
import client from '../../services/sanity'

type Doc = { _id: string; score: number }

const QUERY = `*[_type == "highScore"] | order(score desc)[0]{ _id, score }`

export const useHighScoreSubscription = () => {
  const [highScore, setHighScore] = useState<number>(0)

  useEffect(() => {
    // initial fetch
    client.fetch<Doc | null>(QUERY).then((doc) => {
      if (typeof doc?.score === 'number') setHighScore(doc.score)
    })

    // subscribe to live updates
    const sub = client.listen(QUERY, {}, {includeResult: true, visibility: 'query'})
      .subscribe((ev: any) => {
        const next = ev?.result?.score
        if (typeof next === 'number') setHighScore(next)
      })

    return () => sub.unsubscribe?.()
  }, [])

  return highScore
}
