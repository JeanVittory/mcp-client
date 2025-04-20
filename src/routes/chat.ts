import { Router } from 'express';
import { chatHandler } from '../controllers/chat';

const chatRoute = Router();

chatRoute.post('/chat', chatHandler);

export { chatRoute };
