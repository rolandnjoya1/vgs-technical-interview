import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

export const handler = async (event) => {
  // TODO implement
    const params = {
      TableName: 'DYNAMODB_TABLE' // Environment Variable 
  };
  try {
    // Write the item to the DynamoDB table
    const command = new ScanCommand(params);
    const data = await client.send(command);
    console.log('Successfully added item to DynamoDB' + data);
    return data

  } catch (error) {
    console.error('Error adding item to DynamoDB', error);
    
    // Return an error message
  }

};
