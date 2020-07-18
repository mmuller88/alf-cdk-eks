 
import { Construct } from 'constructs';
import { App, Chart } from 'cdk8s';

class AlfCdkEksStack extends Chart {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    
  }
}

const app = new App();
new AlfCdkEksStack(app, 'AlfCdkEksStack');

app.synth();
