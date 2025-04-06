import express, { Request, Response } from 'express';
import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

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

    const userId = req.query.userId ? `USER#${req.query.userId}` : 'USER#100';
    const bonusId = req.query.bonusId ? `BONUS#${req.query.bonusId}` : 'BONUS#DEMO';

    const command = new GetItemCommand({
      TableName: tableName,
      Key: {
        PK: { S: userId },
        SK: { S: bonusId }
      }
    });

    const result = await dynamoClient.send(command);

    if (!result.Item) {
      return res.status(404).send('Bonus claim not found');
    }

    return res.status(200).json({
      userId: result.Item.PK.S,
      bonusId: result.Item.SK.S,
      status: result.Item.status?.S,
      timestamp: result.Item.timestamp?.S
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to fetch bonus claim');
  }
});

app.get('/list-bonus-claims', async (req: Request, res: Response) => {
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) return res.status(500).send('TABLE_NAME env var not set');

    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : undefined;
    const bonusId = typeof req.query.bonusId === 'string' ? req.query.bonusId.trim() : undefined;

    let items = [];

    if (userId && bonusId) {
      // Query by PK and SK
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': { S: `USER#${userId}` },
          ':sk': { S: `BONUS#${bonusId}` }
        }
      });
      const result = await dynamoClient.send(command);
      items = result.Items || [];
    } else if (userId) {
      // Query by PK only
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: `USER#${userId}` }
        }
      });
      const result = await dynamoClient.send(command);
      items = result.Items || [];
    } else if (bonusId) {
      // Scan and filter by SK
      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: {
          ':sk': { S: `BONUS#${bonusId}` }
        }
      });
      const result = await dynamoClient.send(command);
      items = result.Items || [];
    } else {
      // No filters
      const command = new ScanCommand({ TableName: tableName });
      const result = await dynamoClient.send(command);
      items = result.Items || [];
    }

    const formatted = items.map((item) => ({
      userId: item.PK?.S?.replace('USER#', ''),
      bonusId: item.SK?.S?.replace('BONUS#', ''),
      status: item.status?.S,
      timestamp: item.timestamp?.S
    }));

    return res.status(200).json({ count: formatted.length, items: formatted });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to fetch bonus claims');
  }
});

app.listen(port, () => {
  console.log(`Admin-service listening on port ${port}`);
});