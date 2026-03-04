import { Router } from 'express';
import { supabase } from '../../services/supabase';

const router = Router();

router.get('/test', async (_req, res) => {
  const { data, error } = await supabase.from('test_table').select('*'); // fetch all rows
  if (error) return res.status(500).json({ error: error.message });
  res.json(data); // returns all rows as JSON
})

export default router;