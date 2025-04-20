import dotenv from 'dotenv';

dotenv.config();

const LLM_API_KEY = process.env.LLM_API_KEY;
const PORT = process.env.PORT;

if (!LLM_API_KEY) throw Error('There is not LLM key');

export default {
  LLM_API_KEY,
  PORT: PORT || 3001,
};
