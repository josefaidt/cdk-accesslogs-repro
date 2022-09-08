import 'source-map-support/register.js'
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

const app = new cdk.App({
  context: {
    name: 'my-app',
    env: 'main',
  },
})

const name = app.node.tryGetContext('name')
const env = app.node.tryGetContext('env')

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    new cdk.CfnOutput(this, 'name', { value: name })
    new cdk.CfnOutput(this, 'env', { value: env })

    const vpc = new ec2.Vpc(this, 'Vpc', {})
    const cluster = new ecs.Cluster(this, `Cluster`, {
      vpc,
    })
    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${name}-${env}-bucket`,
      bucketKeyEnabled: true,
      encryption: s3.BucketEncryption.KMS,
      enforceSSL: true,
      versioned: true,
      // if env is destroyed, keep the bucket
      // removalPolicy: cdk.RemovalPolicy.RETAIN,
      // autoDeleteObjects: true,
      serverAccessLogsPrefix: 's3-access',
    })

    const albFargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        `AlbFargateService`,
        {
          cluster,
          cpu: 256,
          memoryLimitMiB: 512,
          desiredCount: 1,
          publicLoadBalancer: true, // needed for bridge to CF
          taskImageOptions: {
            image: ecs.ContainerImage.fromAsset(process.cwd(), {
              file: 'Dockerfile',
            }),
            enableLogging: true,
            containerPort: 3000,
          },
        }
      )

    albFargateService.loadBalancer.logAccessLogs(bucket, 'alb-access')
  }
}

new MyStack(app, `MyStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})
