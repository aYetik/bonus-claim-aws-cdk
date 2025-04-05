import express, { Request, Response } from 'express';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const app = express();
const port = process.env.PORT || 3000;
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/get-bonus-claim', async (req: Request, res: Response) => {
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) return res.status(500).send('TABLE_NAME env var not set');

    const command = new GetItemCommand({
      TableName: tableName,
      Key: {
        PK: { S: 'USER#100' },
        SK: { S: 'BONUS#DEMO' }
      }
    });

    const result = await dynamoClient.send(command);

    if (!result.Item) {
      return res.status(404).send('Bonus claim not found');
    }

    return res.status(200).json({
      PK: result.Item.PK.S,
      SK: result.Item.SK.S,
      status: result.Item.status?.S,
      timestamp: result.Item.timestamp?.S
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to fetch bonus claim');
  }
});

app.listen(port, () => {
  console.log(`Admin-service listening on port ${port}`);
});