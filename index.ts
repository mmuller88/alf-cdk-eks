import { Stack, App, StackProps, CfnOutput} from '@aws-cdk/core';

export interface AlfCdkEksStackProps extends StackProps {
}

class AlfCdkEksStack extends Stack {
  constructor(app: App, id: string, props?: AlfCdkEksStackProps) {
    super(app, id);

    
  }
}

const app = new App();
new AlfCdkEksStack(app, 'AlfCdkEc2Stack', {
  env: {
    account: '981237193288',
    region: 'us-east-1'
  }
});

app.synth();
