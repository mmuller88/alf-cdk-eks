"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_ec2_1 = require("@aws-cdk/aws-ec2");
const core_1 = require("@aws-cdk/core");
const aws_elasticloadbalancingv2_1 = require("@aws-cdk/aws-elasticloadbalancingv2");
class AlfCdkEc2Stack extends core_1.Stack {
    constructor(app, id, props) {
        var _a;
        super(app, id);
        const amznLinux = aws_ec2_1.MachineImage.latestAmazonLinux({
            generation: aws_ec2_1.AmazonLinuxGeneration.AMAZON_LINUX,
            edition: aws_ec2_1.AmazonLinuxEdition.STANDARD,
            virtualization: aws_ec2_1.AmazonLinuxVirt.HVM,
            storage: aws_ec2_1.AmazonLinuxStorage.GENERAL_PURPOSE,
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
  `;
        var instanceVpc;
        if ((_a = props === null || props === void 0 ? void 0 : props.instance) === null || _a === void 0 ? void 0 : _a.vpcId) {
            instanceVpc = aws_ec2_1.Vpc.fromLookup(this, 'defaultVPC', {
                vpcId: (props === null || props === void 0 ? void 0 : props.instance.vpcId) || ''
            });
        }
        else {
            instanceVpc = new aws_ec2_1.Vpc(this, 'VPC', {
                subnetConfiguration: [
                    {
                        cidrMask: 24,
                        name: 'ingress',
                        subnetType: aws_ec2_1.SubnetType.PUBLIC,
                    },
                ]
            });
        }
        const securityGroup = new aws_ec2_1.SecurityGroup(this, 'alfSecurityGroup', {
            vpc: instanceVpc
        });
        securityGroup.addIngressRule(aws_ec2_1.Peer.anyIpv4(), aws_ec2_1.Port.tcp(80));
        securityGroup.addIngressRule(aws_ec2_1.Peer.anyIpv4(), aws_ec2_1.Port.tcp(22));
        const instanceProps = {
            machineImage: amznLinux,
            instanceType: aws_ec2_1.InstanceType.of(aws_ec2_1.InstanceClass.T2, aws_ec2_1.InstanceSize.LARGE),
            keyName: 'ec2dev',
            instanceName: 'AlfCdkEc2Instance',
            vpc: instanceVpc,
            securityGroup,
            userData: aws_ec2_1.UserData.forLinux({
                shebang: userData
            }),
        };
        // console.debug("instanceProps: ", JSON.stringify(instanceProps));
        const instance = new aws_ec2_1.Instance(this, 'AlfCdkEc2Instance', instanceProps);
        const lb = new aws_elasticloadbalancingv2_1.ApplicationLoadBalancer(this, 'LB', {
            vpc: instanceVpc,
            internetFacing: true,
            securityGroup: securityGroup
        });
        const listener = lb.addListener('Listener', {
            protocol: aws_elasticloadbalancingv2_1.ApplicationProtocol.HTTP,
            port: 80
        });
        listener.addTargets('Target', {
            targets: [new aws_elasticloadbalancingv2_1.InstanceTarget(instance.instanceId)],
            protocol: aws_elasticloadbalancingv2_1.ApplicationProtocol.HTTP,
            port: 80,
        });
        new core_1.CfnOutput(this, 'InstanceId', {
            value: instance.instanceId
        });
        new core_1.CfnOutput(this, 'InstancePublicDnsName', {
            value: instance.instancePublicDnsName
        });
        new core_1.CfnOutput(this, 'LoadBalancerDnsName', {
            value: lb.loadBalancerDnsName
        });
    }
}
const app = new core_1.App();
new AlfCdkEc2Stack(app, 'AlfCdkEc2Stack', {
    env: {
        account: '981237193288',
        region: 'us-east-2'
    }
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhDQUEwUDtBQUMxUCx3Q0FBaUU7QUFDakUsb0ZBQW1IO0FBUW5ILE1BQU0sY0FBZSxTQUFRLFlBQUs7SUFDaEMsWUFBWSxHQUFRLEVBQUUsRUFBVSxFQUFFLEtBQTJCOztRQUMzRCxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWYsTUFBTSxTQUFTLEdBQUcsc0JBQVksQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQyxVQUFVLEVBQUUsK0JBQXFCLENBQUMsWUFBWTtZQUM5QyxPQUFPLEVBQUUsNEJBQWtCLENBQUMsUUFBUTtZQUNwQyxjQUFjLEVBQUUseUJBQWUsQ0FBQyxHQUFHO1lBQ25DLE9BQU8sRUFBRSw0QkFBa0IsQ0FBQyxlQUFlO1NBQzVDLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBK0JsQixDQUFBO1FBQ0MsSUFBSSxXQUFXLENBQUM7UUFDaEIsVUFBRyxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsUUFBUSwwQ0FBRSxLQUFLLEVBQUM7WUFDeEIsV0FBVyxHQUFHLGFBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtnQkFDL0MsS0FBSyxFQUFFLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFFBQVEsQ0FBQyxLQUFLLEtBQUksRUFBRTthQUNuQyxDQUFDLENBQUE7U0FDSDthQUFJO1lBQ0gsV0FBVyxHQUFHLElBQUksYUFBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7Z0JBQ2pDLG1CQUFtQixFQUFFO29CQUNuQjt3QkFDRSxRQUFRLEVBQUUsRUFBRTt3QkFDWixJQUFJLEVBQUUsU0FBUzt3QkFDZixVQUFVLEVBQUUsb0JBQVUsQ0FBQyxNQUFNO3FCQUM5QjtpQkFXSDthQUNELENBQUMsQ0FBQztTQUNKO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNoRSxHQUFHLEVBQUUsV0FBVztTQUNqQixDQUFDLENBQUE7UUFFRixhQUFhLENBQUMsY0FBYyxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxjQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsYUFBYSxDQUFDLGNBQWMsQ0FBQyxjQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsY0FBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNELE1BQU0sYUFBYSxHQUFrQjtZQUNuQyxZQUFZLEVBQUUsU0FBUztZQUN2QixZQUFZLEVBQUUsc0JBQVksQ0FBQyxFQUFFLENBQUMsdUJBQWEsQ0FBQyxFQUFFLEVBQUUsc0JBQVksQ0FBQyxLQUFLLENBQUM7WUFDbkUsT0FBTyxFQUFFLFFBQVE7WUFDakIsWUFBWSxFQUFFLG1CQUFtQjtZQUNqQyxHQUFHLEVBQUUsV0FBVztZQUNoQixhQUFhO1lBQ2IsUUFBUSxFQUFFLGtCQUFRLENBQUMsUUFBUSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsUUFBUTthQUNsQixDQUFDO1NBQ0gsQ0FBQTtRQUVELG1FQUFtRTtRQUNuRSxNQUFNLFFBQVEsR0FBRyxJQUFJLGtCQUFRLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXhFLE1BQU0sRUFBRSxHQUFHLElBQUksb0RBQXVCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtZQUNqRCxHQUFHLEVBQUUsV0FBVztZQUNoQixjQUFjLEVBQUUsSUFBSTtZQUNwQixhQUFhLEVBQUUsYUFBYTtTQUM3QixDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtZQUMxQyxRQUFRLEVBQUUsZ0RBQW1CLENBQUMsSUFBSTtZQUNsQyxJQUFJLEVBQUUsRUFBRTtTQUNULENBQUMsQ0FBQTtRQUVGLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFO1lBQzVCLE9BQU8sRUFBRSxDQUFDLElBQUksMkNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbEQsUUFBUSxFQUFFLGdEQUFtQixDQUFDLElBQUk7WUFDbEMsSUFBSSxFQUFFLEVBQUU7U0FDVCxDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNoQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVU7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxnQkFBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsUUFBUSxDQUFDLHFCQUFxQjtTQUN0QyxDQUFDLENBQUM7UUFFSCxJQUFJLGdCQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxFQUFFLENBQUMsbUJBQW1CO1NBQzlCLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksVUFBRyxFQUFFLENBQUM7QUFDdEIsSUFBSSxjQUFjLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFO0lBQ3hDLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLE1BQU0sRUFBRSxXQUFXO0tBQ3BCO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVnBjLCBNYWNoaW5lSW1hZ2UsIEFtYXpvbkxpbnV4U3RvcmFnZSwgQW1hem9uTGludXhWaXJ0LCBBbWF6b25MaW51eEVkaXRpb24sIEFtYXpvbkxpbnV4R2VuZXJhdGlvbiwgU2VjdXJpdHlHcm91cCwgUGVlciwgUG9ydCwgSW5zdGFuY2VUeXBlLCBJbnN0YW5jZVByb3BzLCBJbnN0YW5jZUNsYXNzLCBJbnN0YW5jZVNpemUsIFVzZXJEYXRhLCBJbnN0YW5jZSwgU3VibmV0VHlwZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1lYzInO1xuaW1wb3J0IHsgU3RhY2ssIEFwcCwgU3RhY2tQcm9wcywgQ2ZuT3V0cHV0fSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IEFwcGxpY2F0aW9uUHJvdG9jb2wsIEluc3RhbmNlVGFyZ2V0LCBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlciB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcblxuZXhwb3J0IGludGVyZmFjZSBBbGZDZGtFYzJTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIGluc3RhbmNlPzoge1xuICAgIHZwY0lkPzogc3RyaW5nXG4gIH1cbn1cblxuY2xhc3MgQWxmQ2RrRWMyU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IEFsZkNka0VjMlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihhcHAsIGlkKTtcblxuICAgIGNvbnN0IGFtem5MaW51eCA9IE1hY2hpbmVJbWFnZS5sYXRlc3RBbWF6b25MaW51eCh7XG4gICAgICBnZW5lcmF0aW9uOiBBbWF6b25MaW51eEdlbmVyYXRpb24uQU1BWk9OX0xJTlVYLFxuICAgICAgZWRpdGlvbjogQW1hem9uTGludXhFZGl0aW9uLlNUQU5EQVJELFxuICAgICAgdmlydHVhbGl6YXRpb246IEFtYXpvbkxpbnV4VmlydC5IVk0sXG4gICAgICBzdG9yYWdlOiBBbWF6b25MaW51eFN0b3JhZ2UuR0VORVJBTF9QVVJQT1NFLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlckRhdGEgPSBgQ29udGVudC1UeXBlOiBtdWx0aXBhcnQvbWl4ZWQ7IGJvdW5kYXJ5PVwiLy9cIlxuTUlNRS1WZXJzaW9uOiAxLjBcblxuLS0vL1xuQ29udGVudC1UeXBlOiB0ZXh0L2Nsb3VkLWNvbmZpZzsgY2hhcnNldD1cInVzLWFzY2lpXCJcbk1JTUUtVmVyc2lvbjogMS4wXG5Db250ZW50LVRyYW5zZmVyLUVuY29kaW5nOiA3Yml0XG5Db250ZW50LURpc3Bvc2l0aW9uOiBhdHRhY2htZW50OyBmaWxlbmFtZT1cImNsb3VkLWNvbmZpZy50eHRcIlxuXG4jY2xvdWQtY29uZmlnXG5jbG91ZF9maW5hbF9tb2R1bGVzOlxuLSBbc2NyaXB0cy11c2VyLCBhbHdheXNdXG5cbi0tLy9cbkNvbnRlbnQtVHlwZTogdGV4dC94LXNoZWxsc2NyaXB0OyBjaGFyc2V0PVwidXMtYXNjaWlcIlxuTUlNRS1WZXJzaW9uOiAxLjBcbkNvbnRlbnQtVHJhbnNmZXItRW5jb2Rpbmc6IDdiaXRcbkNvbnRlbnQtRGlzcG9zaXRpb246IGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwidXNlcmRhdGEudHh0XCJcblxuIyEvYmluL2Jhc2hcbmVjaG8gXCJzdWRvIGhhbHRcIiB8IGF0IG5vdyArIDU1IG1pbnV0ZXNcbnl1bSAteSBpbnN0YWxsIGdpdFxuUkVQTz1hbGYtY2RrLWVjMlxuZ2l0IGNsb25lIGh0dHBzOi8vQGdpdGh1Yi5jb20vbW11bGxlcjg4LyRSRVBPIC91c3IvbG9jYWwvJFJFUE9cbmNkIC91c3IvbG9jYWwvJFJFUE9cbmNobW9kICt4IGluaXQuc2ggJiYgLi9pbml0LnNoXG5zdWRvIGNobW9kICt4IHN0YXJ0LnNoICYmIC4vc3RhcnQuc2hcbnN1ZG8gY2hvd24gLVIgMzMwMDcgZGF0YS9zb2xyLWRhdGFcbnN1ZG8gY2hvd24gLVIgOTk5IGxvZ3NcblxuLS0vL1xuICBgXG4gICAgdmFyIGluc3RhbmNlVnBjO1xuICAgIGlmKHByb3BzPy5pbnN0YW5jZT8udnBjSWQpe1xuICAgICAgaW5zdGFuY2VWcGMgPSBWcGMuZnJvbUxvb2t1cCh0aGlzLCAnZGVmYXVsdFZQQycsIHtcbiAgICAgICAgdnBjSWQ6IHByb3BzPy5pbnN0YW5jZS52cGNJZCB8fCAnJ1xuICAgICAgfSlcbiAgICB9ZWxzZXtcbiAgICAgIGluc3RhbmNlVnBjID0gbmV3IFZwYyh0aGlzLCAnVlBDJywge1xuICAgICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICAgICAgbmFtZTogJ2luZ3Jlc3MnLFxuICAgICAgICAgICAgc3VibmV0VHlwZTogU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAvLyB7XG4gICAgICAgICAgLy8gICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgLy8gICBuYW1lOiAnYXBwbGljYXRpb24nLFxuICAgICAgICAgIC8vICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURSxcbiAgICAgICAgICAvLyB9LFxuICAgICAgICAgIC8vIHtcbiAgICAgICAgICAvLyAgIGNpZHJNYXNrOiAyOCxcbiAgICAgICAgICAvLyAgIG5hbWU6ICdyZHMnLFxuICAgICAgICAgIC8vICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuSVNPTEFURUQsXG4gICAgICAgICAgLy8gfVxuICAgICAgIF1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHNlY3VyaXR5R3JvdXAgPSBuZXcgU2VjdXJpdHlHcm91cCh0aGlzLCAnYWxmU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYzogaW5zdGFuY2VWcGNcbiAgICB9KVxuXG4gICAgc2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShQZWVyLmFueUlwdjQoKSwgUG9ydC50Y3AoODApKTtcbiAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFBlZXIuYW55SXB2NCgpLCBQb3J0LnRjcCgyMikpO1xuXG4gICAgY29uc3QgaW5zdGFuY2VQcm9wczogSW5zdGFuY2VQcm9wcyA9IHtcbiAgICAgIG1hY2hpbmVJbWFnZTogYW16bkxpbnV4LFxuICAgICAgaW5zdGFuY2VUeXBlOiBJbnN0YW5jZVR5cGUub2YoSW5zdGFuY2VDbGFzcy5UMiwgSW5zdGFuY2VTaXplLkxBUkdFKSxcbiAgICAgIGtleU5hbWU6ICdlYzJkZXYnLFxuICAgICAgaW5zdGFuY2VOYW1lOiAnQWxmQ2RrRWMySW5zdGFuY2UnLFxuICAgICAgdnBjOiBpbnN0YW5jZVZwYyxcbiAgICAgIHNlY3VyaXR5R3JvdXAsXG4gICAgICB1c2VyRGF0YTogVXNlckRhdGEuZm9yTGludXgoe1xuICAgICAgICBzaGViYW5nOiB1c2VyRGF0YVxuICAgICAgfSksXG4gICAgfVxuXG4gICAgLy8gY29uc29sZS5kZWJ1ZyhcImluc3RhbmNlUHJvcHM6IFwiLCBKU09OLnN0cmluZ2lmeShpbnN0YW5jZVByb3BzKSk7XG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgSW5zdGFuY2UodGhpcywgJ0FsZkNka0VjMkluc3RhbmNlJywgaW5zdGFuY2VQcm9wcyk7XG5cbiAgICBjb25zdCBsYiA9IG5ldyBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAnTEInLCB7XG4gICAgICB2cGM6IGluc3RhbmNlVnBjLFxuICAgICAgaW50ZXJuZXRGYWNpbmc6IHRydWUsXG4gICAgICBzZWN1cml0eUdyb3VwOiBzZWN1cml0eUdyb3VwXG4gICAgfSk7XG5cbiAgICBjb25zdCBsaXN0ZW5lciA9IGxiLmFkZExpc3RlbmVyKCdMaXN0ZW5lcicsIHtcbiAgICAgIHByb3RvY29sOiBBcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICBwb3J0OiA4MFxuICAgIH0pXG5cbiAgICBsaXN0ZW5lci5hZGRUYXJnZXRzKCdUYXJnZXQnLCB7XG4gICAgICB0YXJnZXRzOiBbbmV3IEluc3RhbmNlVGFyZ2V0KGluc3RhbmNlLmluc3RhbmNlSWQpXSxcbiAgICAgIHByb3RvY29sOiBBcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICBwb3J0OiA4MCxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ0luc3RhbmNlSWQnLCB7XG4gICAgICB2YWx1ZTogaW5zdGFuY2UuaW5zdGFuY2VJZFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnSW5zdGFuY2VQdWJsaWNEbnNOYW1lJywge1xuICAgICAgdmFsdWU6IGluc3RhbmNlLmluc3RhbmNlUHVibGljRG5zTmFtZVxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRG5zTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsYi5sb2FkQmFsYW5jZXJEbnNOYW1lXG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgYXBwID0gbmV3IEFwcCgpO1xubmV3IEFsZkNka0VjMlN0YWNrKGFwcCwgJ0FsZkNka0VjMlN0YWNrJywge1xuICBlbnY6IHtcbiAgICBhY2NvdW50OiAnOTgxMjM3MTkzMjg4JyxcbiAgICByZWdpb246ICd1cy1lYXN0LTInXG4gIH1cbn0pO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==