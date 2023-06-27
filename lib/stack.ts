import * as cdk from "aws-cdk-lib";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import * as path from "path";

export class Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const layer = new lambda.LayerVersion(this, "LogSenderLayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "layer")),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
    });

    const logReceiverFunc = new lambdaNode.NodejsFunction(
      this,
      "log-receiver",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
      }
    );

    const receiverFuncURL = logReceiverFunc.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const logSenderFunc = new lambdaNode.NodejsFunction(this, "log-sender", {
      runtime: lambda.Runtime.NODEJS_18_X,
      layers: [layer],
      environment: {
        LOG_RECEIVER_URL: receiverFuncURL.url,
      },
    });

    new events.Rule(this, "cron-rule", {
      schedule: events.Schedule.expression("rate(1 minute)"),
      targets: [new eventsTargets.LambdaFunction(logSenderFunc)],
    });

    new cdk.CfnOutput(this, "senderLogGroupName", {
      value: logSenderFunc.logGroup?.logGroupName ?? "",
    });

    new cdk.CfnOutput(this, "receiverLogGroupName", {
      value: logReceiverFunc.logGroup?.logGroupName ?? "",
    });
  }
}
