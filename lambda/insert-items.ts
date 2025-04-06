import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { createHash } from "crypto";

const client = new DynamoDBClient({});

export const handler = async () => {
    const tableName = process.env.TABLE_NAME;
    const items = [
        { PK: "USER#1", SK: "BONUS#A", status: "CLAIMED" },
        { PK: "USER#2", SK: "BONUS#B", status: "PENDING" },
        { PK: "USER#3", SK: "BONUS#C", status: "COMPLETED" },
    ];

    for (const item of items) {
        await client.send(new PutItemCommand({
            TableName: tableName,
            Item: {
                PK: { S: item.PK },
                SK: { S: item.SK },
                status: { S: item.status },
                timestamp: { S: new Date().toISOString() },
            },
        }));
    }

    ////////
    //to make custom resource recreated only when items change
    //const hash = createHash("sha256").update(JSON.stringify(items)).digest("hex");
    //return { PhysicalResourceId: hash };
    ////////

    return { PhysicalResourceId: Date.now().toString() }; //to make custom resource recreated every time
};