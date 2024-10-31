
import axios from 'axios';
import tunnel from 'tunnel';
import crypto from 'crypto';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
let uuid = crypto.randomUUID();

export const handler = async (event, context) => {

    // Environment variables
    const VGS_VAULT_ID = process.env.VGS_VAULT_ID;
    const VGS_USERNAME = process.env.VGS_USERNAME;
    const VGS_PASSWORD = process.env.VGS_PASSWORD;
    const STRIPE_KEY = process.env.STRIPE_KEY;
    const TRANSACTION_TABLE = process.env.DYNAMODB_TABLE;
    const NODE_EXTRA_CA_CERTS = process.env.NODE_EXTRA_CA_CERTS;

    const params = {
        TableName: `${TRANSACTION_TABLE}`, // Replace with your DynamoDB table name
        Item: {
            id: uuid || new Date().toISOString(), // Set a unique id for each record (using event id or timestamp)
            ...event  // Add all fields from the event object to the item
        }
    };
    
    try {
        // Write the item to the DynamoDB table
        const command = new PutCommand(params);
        const data = await client.send(command);
        console.log('Successfully added item to DynamoDB');

    } catch (error) {
        console.error('Error adding item to DynamoDB', error);
        
        // Return an error message
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error adding item to DynamoDB', error: error.message })
        };
    }
    
    // Log the path of the certificate for outbound route
    console.log(`Outbound route certificate is stored at this path: ${NODE_EXTRA_CA_CERTS}`);
    
    // Set up a proxy agent for the VGS outbound route
    function getProxyAgent() {
        const vgs_outbound_url = `${VGS_VAULT_ID}.sandbox.verygoodproxy.com`;
        console.log(`Sending request through outbound route: ${vgs_outbound_url}`);
        return tunnel.httpsOverHttps({
            proxy: {
                servername: vgs_outbound_url,
                host: vgs_outbound_url,
                port: 8443,
                proxyAuth: `${VGS_USERNAME}:${VGS_PASSWORD}`
            },
        });
    }
    
    // Function to send data through VGS outbound route and process Stripe payment
    async function postStripePayment(creditCardInfo) {
        // Configure the proxy agent
        const agent = getProxyAgent();
    
        // Split the expiration date
        const [expMonth, expYear] = creditCardInfo['card-expiration-date'].split('/').map(item => item.trim());
    
        // Set up Stripe authorization in Base64
        const base64Auth = Buffer.from(`${STRIPE_KEY}:`).toString('base64');
    
        // Create an axios instance configured for Stripe API with the proxy agent
        const instance = axios.create({
            baseURL: 'https://api.stripe.com',
            headers: {
                'Authorization': `Basic ${base64Auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            httpsAgent: agent,
        });
    
        try {
            // Step 1: Create a Stripe payment method
            const pmResponse = await instance.post('/v1/payment_methods', new URLSearchParams({
                type: 'card',
                'card[number]': creditCardInfo['card-number'],
                'card[cvc]': creditCardInfo['card-security-code'],
                'card[exp_month]': 12,
                'card[exp_year]': 26
                
            }).toString());
    
            console.log('Payment Method Response:', pmResponse.data);
    
            // Step 2: Create a payment intent using the created payment method
            const piResponse = await instance.post('/v1/payment_intents', new URLSearchParams({
                amount: 100.00,  // Amount in cents
                currency: 'usd',
                payment_method: pmResponse.data.id,
                confirm: 'true'
            }).toString());
    
            console.log('Payment Intent Response:', piResponse.data);
    
            return piResponse.data;
    
        } catch (error) {
            console.error('Error during Stripe payment process:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
    
    // Main execution function
    try {
        const creditCardInfo = event
        console.log('Sending data through VGS proxy and processing payment with Stripe...');
        const paymentResult = await postStripePayment(creditCardInfo);
        console.log('Payment Result:', paymentResult);
        return paymentResult;
    } catch (error) {
        console.error('Failed to process payment:', error.message);
    }

};
