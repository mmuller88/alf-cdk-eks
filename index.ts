import { Vpc, MachineImage, AmazonLinuxStorage, AmazonLinuxVirt, AmazonLinuxEdition, AmazonLinuxGeneration, SecurityGroup, Peer, Port, InstanceType, InstanceProps, InstanceClass, InstanceSize, UserData, Instance, SubnetType } from '@aws-cdk/aws-ec2';
import { Stack, App, StackProps, CfnOutput} from '@aws-cdk/core';
import { ApplicationProtocol, InstanceTarget, ApplicationLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';

export interface AlfCdkEc2StackProps extends StackProps {
  instance?: {
    vpcId?: string
  }
}

class AlfCdkEc2Stack extends Stack {
  constructor(app: App, id: string, props?: AlfCdkEc2StackProps) {
    super(app, id);

    const amznLinux = MachineImage.latestAmazonLinux({
      generation: AmazonLinuxGeneration.AMAZON_LINUX,
      edition: AmazonLinuxEdition.STANDARD,
      virtualization: AmazonLinuxVirt.HVM,
      storage: AmazonLinuxStorage.GENERAL_PURPOSE,
    });

    const userData = `Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0

--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"

#cloud-config
cloud_final_modules:
- [scripts-user, always]

--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"

#!/bin/bash
echo "sudo halt" | at now + 55 minutes
yum -y install git
REPO=alf-cdk-ec2
git clone https://@github.com/mmuller88/$REPO /usr/local/$REPO
cd /usr/local/$REPO
chmod +x init.sh && ./init.sh
sudo chmod +x start.sh && ./start.sh
sudo chown -R 33007 data/solr-data
sudo chown -R 999 logs

--//
  `
    var instanceVpc;
    if(props?.instance?.vpcId){
      instanceVpc = Vpc.fromLookup(this, 'defaultVPC', {
        vpcId: props?.instance.vpcId || ''
      })
    }else{
      instanceVpc = new Vpc(this, 'VPC', {
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'ingress',
            subnetType: SubnetType.PUBLIC,
          },
          // {
          //   cidrMask: 24,
          //   name: 'application',
          //   subnetType: ec2.SubnetType.PRIVATE,
          // },
          // {
          //   cidrMask: 28,
          //   name: 'rds',
          //   subnetType: ec2.SubnetType.ISOLATED,
          // }
       ]
      });
    }

    const securityGroup = new SecurityGroup(this, 'alfSecurityGroup', {
      vpc: instanceVpc
    })

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    const instanceProps: InstanceProps = {
      machineImage: amznLinux,
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.LARGE),
      keyName: 'ec2dev',
      instanceName: 'AlfCdkEc2Instance',
      vpc: instanceVpc,
      securityGroup,
      userData: UserData.forLinux({
        shebang: userData
      }),
    }

    // console.debug("instanceProps: ", JSON.stringify(instanceProps));
    const instance = new Instance(this, 'AlfCdkEc2Instance', instanceProps);

    const lb = new ApplicationLoadBalancer(this, 'LB', {
      vpc: instanceVpc,
      internetFacing: true,
      securityGroup: securityGroup
    });

    const listener = lb.addListener('Listener', {
      protocol: ApplicationProtocol.HTTP,
      port: 80
    })

    listener.addTargets('Target', {
      targets: [new InstanceTarget(instance.instanceId)],
      protocol: ApplicationProtocol.HTTP,
      port: 80,
    });

    new CfnOutput(this, 'InstanceId', {
      value: instance.instanceId
    });

    new CfnOutput(this, 'InstancePublicDnsName', {
      value: instance.instancePublicDnsName
    });

    new CfnOutput(this, 'LoadBalancerDnsName', {
      value: lb.loadBalancerDnsName
    });
  }
}

const app = new App();
new AlfCdkEc2Stack(app, 'AlfCdkEc2Stack', {
  env: {
    account: '981237193288',
    region: 'us-east-1'
  }
});

app.synth();
