import express, { Request, Response } from 'express';
import { Standard } from '../models/Standard';

const router = express.Router();

// Public endpoint to get all standards
router.get('/', async (req: Request, res: Response) => {
  try {
    const standards = await Standard.find({}, 'name description state');
    res.json(standards);
  } catch (error) {
    console.error('Error fetching standards:', error);
    res.status(500).json({ message: 'Error fetching standards' });
  }
});

export default router; 