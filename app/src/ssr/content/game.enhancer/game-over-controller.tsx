// src/ssr/project/game.enhancer/game-over-controller.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import BlockGGameOver from '../../../components/rock-escapade/block-g-game-over';
import { updateHighScore } from '../../../components/rock-escapade/updateHighScore';

type Props = {
  score: number | null;
  highScore: number;
  onRestart: () => void;
  onHide: () => void;

  /** Optional: latched "new high" flag from BlockGHost. */
  newHighScore?: boolean;
};

const GameOverController: React.FC<Props> = ({
  score,
  highScore,
  onRestart,
  onHide,
  newHighScore,
}) => {
  const visible = score != null;

  // Live comparison used only as a seed when host doesn't pass a latched flag.
  const baseNewHigh = useMemo(
    () => (score ?? -Infinity) > highScore,
    [score, highScore]
  );

  // Latch for this overlay session when host doesn't provide one.
  const [localLatch, setLocalLatch] = useState<boolean | null>(null);

  // Reset latch when overlay hides; seed latch on first show (host flag absent).
  useEffect(() => {
    if (!visible) {
      setLocalLatch(null);
      return;
    }
    if (localLatch === null && typeof newHighScore !== 'boolean') {
      setLocalLatch(baseNewHigh);
    }
  }, [visible, newHighScore, baseNewHigh, localLatch]);

  // Final value we display/post: host-provided > local latch > base.
  const effectiveNewHigh =
    typeof newHighScore === 'boolean'
      ? newHighScore
      : (localLatch ?? baseNewHigh);

  // Prevent duplicate Sanity writes per visible session.
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!visible || score == null) {
      submittedRef.current = false;
      return;
    }
    if (effectiveNewHigh && !submittedRef.current) {
      submittedRef.current = true;
      updateHighScore(score).catch((err) => console.error('[HS] update failed:', err));
    }
  }, [visible, score, effectiveNewHigh]);

  if (!visible || score == null) return null;

  const handleRestart = () => {
    onRestart();
    onHide();
  };

  return (
    <BlockGGameOver
      onRestart={handleRestart}
      visibleTrigger={1}
      coins={score}
      newHighScore={effectiveNewHigh}
    />
  );
};

export default GameOverController;
