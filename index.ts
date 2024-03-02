import * as pulumi from "@pulumi/pulumi";


import * as aws from "@pulumi/aws";

// Create an IAM role for the Lambda function
const lambdaRole = new aws.iam.Role("lambdaRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [{
      Action: "sts:AssumeRole",
      Effect: "Allow",
      Principal: {
        Service: "lambda.amazonaws.com",
      },
    }],
  },
});

// Attach the AWSLambdaBasicExecutionRole policy to the IAM role
const lambdaRoleAttachment = new aws.iam.RolePolicyAttachment("lambdaRoleAttachment", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// Create a Lambda function
const lambdaFunction = new aws.lambda.Function("myLambdaFunction", {
  runtime: aws.lambda.Runtime.NodeJS20dX,
  code: new pulumi.asset.AssetArchive({
    "index.js": new pulumi.asset.StringAsset(
      'exports.handler = async (event) => {\n' +
      '    return {\n' +
      '        statusCode: 200,\n' +
      '        body: JSON.stringify("Hello, World!")\n' +
      '    };\n' +
      '};\n'
    ),
  }),
  handler: "index.handler",
  role: lambdaRole.arn,
});

// Create an API Gateway
const api = new aws.apigatewayv2.Api("httpApi", {
  protocolType: "HTTP",
});

// Create a default stage for the API
const stage = new aws.apigatewayv2.Stage("stage", {
  apiId: api.id,
  name: "$default",
  autoDeploy: true,
});

// Create an integration between the API Gateway and the Lambda function
const integration = new aws.apigatewayv2.Integration("lambdaIntegration", {
  apiId: api.id,
  integrationType: "AWS_PROXY",
  integrationUri: lambdaFunction.arn,
  payloadFormatVersion: "2.0",
});

// Create a route for the API Gateway that invokes the Lambda function
const route = new aws.apigatewayv2.Route("route", {
  apiId: api.id,
  routeKey: "POST /hello",
  target: pulumi.interpolate`integrations/${integration.id}`,
});

// Grant the API Gateway permission to invoke the Lambda function
const permission = new aws.lambda.Permission("apiGatewayPermission", {
  action: "lambda:InvokeFunction",
  function: lambdaFunction.name,
  principal: "apigateway.amazonaws.com",
  sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
});

// Export the API endpoint URL
export const url = api.apiEndpoint;

