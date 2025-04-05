import express, { Request, Response } from 'express';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const app = express();
const port = process.env.PORT || 3000;
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.post('/add-bonus-claim', async (req: Request, res: Response) => {
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) return res.status(500).send('TABLE_NAME env var not set');

    const userId = 'USER#100';
    const bonusId = 'BONUS#DEMO';

    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        PK: { S: userId },
        SK: { S: bonusId },
        status: { S: 'CLAIMED' },
        timestamp: { S: new Date().toISOString() }
      }
    });

    await dynamoClient.send(command);
    return res.status(200).send('Bonus claim added');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to insert claim');
  }
});

app.listen(port, () => {
  console.log(`User-service listening on port ${port}`);
});