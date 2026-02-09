export async function updateHighScore(score: number) {
  try {
    const res = await fetch('/api/highscore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.highScore as number;
  } catch (err) {
    console.error('[HS] update failed:', err);
    return null;
  }
}
