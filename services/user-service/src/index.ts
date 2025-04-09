import express, { Request, Response } from 'express';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const app = express();
const port = process.env.PORT || 3000;
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

app.use(express.json());

// Basic health check endpoint
app.get('/', async (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Add a bonus claim entry into DynamoDB with optional userId and bonusId
app.post('/add-bonus-claim', async (req: Request, res: Response) => {
  try {
    const tableName = process.env.TABLE_NAME;
    if (!tableName) return res.status(500).send('TABLE_NAME env var not set');

    const { userId, bonusId } = req.body;

    // Apply fallback to dummy values if userId and/or bonusId not provided in request
    const finalUserId = userId ? `USER#${userId}` : 'USER#100';
    const finalBonusId = bonusId ? `BONUS#${bonusId}` : 'BONUS#DEMO';

    const command = new PutItemCommand({
      TableName: tableName,
      Item: {
        PK: { S: finalUserId },
        SK: { S: finalBonusId },
        status: { S: 'CLAIMED' },
        timestamp: { S: new Date().toISOString() }
      }
    });
    // Send item to DynamoDB
    await dynamoClient.send(command);
    
    // Return confirmation
    return res.status(200).json({ message: 'Bonus claim added', userId: finalUserId, bonusId: finalBonusId });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Failed to insert claim');
  }
});

app.listen(port, () => {
  console.log(`User-service listening on port ${port}`);
});