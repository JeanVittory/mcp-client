import { Request, Response } from 'express';
import { mcpCLient } from '..';

export const chatHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query)
      res.status(400).json({ response: 'You must to provide a query' });
    const response = await mcpCLient.processQuery(query);
    console.log(response);
    res.status(200).json({ response: response });
  } catch (error) {
    res.status(500).json(error);
  }
};
