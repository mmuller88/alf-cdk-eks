"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_iam_1 = require("@aws-cdk/aws-iam");
const aws_ec2_1 = require("@aws-cdk/aws-ec2");
const aws_autoscaling_1 = require("@aws-cdk/aws-autoscaling");
const aws_eks_1 = require("@aws-cdk/aws-eks");
const core_1 = require("@aws-cdk/core");
class EKSCluster extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const vpc = new aws_ec2_1.Vpc(this, 'EKSVpc'); // Create a new VPC for our cluster
        // IAM role for our EC2 worker nodes
        const workerRole = new aws_iam_1.Role(this, 'EKSWorkerRole', {
            assumedBy: new aws_iam_1.ServicePrincipal('ec2.amazonaws.com')
        });
        workerRole.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['*'],
            actions: ['ec2:DescribeVpcs']
        }));
        const eksClusterAdmin = new aws_iam_1.Role(this, 'eksClusterAdmin', {
            assumedBy: new aws_iam_1.AccountRootPrincipal()
        });
        const clusterAdminRole = new aws_iam_1.Role(this, 'clusterAdmin', {
            roleName: 'KubernetesAdmin',
            assumedBy: new aws_iam_1.AccountRootPrincipal()
        });
        const developerRole = new aws_iam_1.Role(this, 'developer', {
            roleName: 'KubernetesDeveloper',
            assumedBy: new aws_iam_1.AccountRootPrincipal()
        });
        const eksAdminGroup = new aws_iam_1.Group(this, 'eks-administrators', {
            groupName: 'eks-administrators',
        });
        const eksDeveloperGroup = new aws_iam_1.Group(this, 'eks-developers', {
            groupName: 'eks-developers',
        });
        const adminPolicyStatement = new aws_iam_1.PolicyStatement({
            resources: [clusterAdminRole.roleArn],
            actions: ['sts:AssumeRole'],
            effect: aws_iam_1.Effect.ALLOW
        });
        const developerPolicyStatement = new aws_iam_1.PolicyStatement({
            resources: [developerRole.roleArn],
            actions: ['sts:AssumeRole'],
            effect: aws_iam_1.Effect.ALLOW
        });
        const assumeEKSAdminRole = new aws_iam_1.ManagedPolicy(this, 'assumeEKSAdminRole', {
            managedPolicyName: 'assume-KubernetesAdmin-role'
        });
        assumeEKSAdminRole.addStatements(adminPolicyStatement);
        assumeEKSAdminRole.attachToGroup(eksAdminGroup);
        const assumeEKSDeveloperRole = new aws_iam_1.ManagedPolicy(this, 'assumeEKSDeveloperRole', {
            managedPolicyName: 'assume-KubernetesDeveloper-role'
        });
        assumeEKSDeveloperRole.addStatements(developerPolicyStatement);
        assumeEKSDeveloperRole.attachToGroup(eksDeveloperGroup);
        const eksCluster = new aws_eks_1.Cluster(this, 'Cluster', {
            clusterName: this.stackName,
            // role: eksRole,
            mastersRole: eksClusterAdmin,
            vpc: vpc,
            kubectlEnabled: true,
            defaultCapacity: 0,
            version: aws_eks_1.KubernetesVersion.V1_15,
        });
        // eksCluster.role.addToPolicy(new PolicyStatement({
        //   resources: ['*'],
        //   actions: ['logs:*', 'route53:ChangeResourceRecordSets', 'eks:CreateCluster'] }));
        // workerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
        // eksCluster.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
        // eksClusterAdmin.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
        // eksCluster.awsAuth.addRoleMapping(developerRole, {
        //   groups: [],
        //   username: 'k8s-developer-user'
        // });
        eksCluster.awsAuth.addMastersRole(clusterAdminRole, 'k8s-cluster-admin-user');
        const onDemandASG = new aws_autoscaling_1.AutoScalingGroup(this, 'OnDemandASG', {
            vpc: vpc,
            role: workerRole,
            minCapacity: 1,
            maxCapacity: 1,
            instanceType: new aws_ec2_1.InstanceType('t2.xlarge'),
            machineImage: new aws_eks_1.EksOptimizedImage({
                kubernetesVersion: '1.14',
                nodeType: aws_eks_1.NodeType.STANDARD
            }),
            updateType: aws_autoscaling_1.UpdateType.ROLLING_UPDATE
        });
        eksCluster.addAutoScalingGroup(onDemandASG, {});
        // const awsCertArn='arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789'
        // const awsCertPolicy="ELBSecurityPolicy-TLS-1-2-2017-01"
        // const acsNamespace = 'default';
        // /*const nginxChart = */ new HelmChart(this, 'NginxIngress', {
        //   release: 'nginx-ingress',
        //   cluster: eksCluster,
        //   chart: 'nginx-ingress',
        //   repository: 'https://helm.nginx.com/stable',
        //   namespace: 'kube-system',
        //   // version: '0.24.1'
        // //   values: {
        // //     'rbac': {
        // //       'create': true
        // //     },
        // //     'controller': {
        // //       'scope': {
        // //         'enabled': true,
        // //         'namespace': acsNamespace
        // //       },
        // //       'config': {
        // //         'force-ssl-redirect': true,
        // //         'server-tokens': false
        // //       },
        // //       'service': {
        // //         'targetPorts': {
        // //           'https': 80
        // //         },
        // //         'annotations': {
        // //           'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': 'http',
        // //           'service.beta.kubernetes.io/aws-load-balancer-ssl-ports': 'https',
        // //           'service.beta.kubernetes.io/aws-load-balancer-ssl-cert': awsCertArn,
        // //           'external-dns.alpha.kubernetes.io/hostname': `${acsNamespace}.eks.alfpro.net`,
        // //           'service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy': awsCertPolicy
        // //         },
        // //         'publishService': {
        // //           'enabled': true
        // //         }
        // //       }
        // //     }
        // //   }
        // })
        // /*const acsChart  =*/  new HelmChart(this, 'AcsHelmChart', {
        //   cluster: eksCluster,
        //   // repository: 'http://kubernetes-charts.alfresco.com/incubator',
        //   // chart: 'http://kubernetes-charts.alfresco.com/incubator/alfresco-content-services-community-4.0.0.tgz',
        //   chart: 'http://kubernetes-charts.alfresco.com/incubator/alfresco-content-services-5.0.0.tgz',
        //   // chart: 'alfresco-content-services',
        //   // version: '5.0.0',
        //   release: 'my-acs',
        //   namespace: acsNamespace,
        //   wait: true,
        //   timeout: Duration.minutes(15),
        //   // values: {
        //   // }
        // })
        // acsChart.node.addDependency(nginxChart);
    }
}
const app = new core_1.App();
new EKSCluster(app, 'AcsEksCluster');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhDQUErSDtBQUMvSCw4Q0FBcUQ7QUFDckQsOERBQXdFO0FBQ3hFLDhDQUEyRjtBQUMzRix3Q0FBdUQ7QUFFdkQsTUFBTSxVQUFXLFNBQVEsWUFBSztJQUM1QixZQUFZLEtBQVUsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDcEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxhQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUUsbUNBQW1DO1FBRXpFLG9DQUFvQztRQUNwQyxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ2pELFNBQVMsRUFBRSxJQUFJLDBCQUFnQixDQUFDLG1CQUFtQixDQUFDO1NBQ3JELENBQUMsQ0FBQztRQUVILFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSx5QkFBZSxDQUFDO1lBQ3pDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNoQixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztTQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sZUFBZSxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN4RCxTQUFTLEVBQUUsSUFBSSw4QkFBb0IsRUFBRTtTQUN0QyxDQUFDLENBQUM7UUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEQsUUFBUSxFQUFFLGlCQUFpQjtZQUMzQixTQUFTLEVBQUUsSUFBSSw4QkFBb0IsRUFBRTtTQUN0QyxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ2hELFFB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a0M7UUFFbEMsZ0VBQWdFO1FBQ2hFLDhCQUE4QjtRQUM5Qix5QkFBeUI7UUFDekIsNEJBQTRCO1FBQzVCLGlEQUFpRDtRQUNqRCw4QkFBOEI7UUFDOUIseUJBQXlCO1FBQ3pCLGlCQUFpQjtRQUNqQixtQkFBbUI7UUFDbkIsMEJBQTBCO1FBQzFCLFlBQVk7UUFDWix5QkFBeUI7UUFDekIsc0JBQXNCO1FBQ3RCLDhCQUE4QjtRQUM5Qix1Q0FBdUM7UUFDdkMsY0FBYztRQUNkLHVCQUF1QjtRQUN2Qix5Q0FBeUM7UUFDekMsb0NBQW9DO1FBQ3BDLGNBQWM7UUFDZCx3QkFBd0I7UUFDeEIsOEJBQThCO1FBQzlCLDJCQUEyQjtRQUMzQixnQkFBZ0I7UUFDaEIsOEJBQThCO1FBQzlCLHdGQUF3RjtRQUN4RixrRkFBa0Y7UUFDbEYsb0ZBQW9GO1FBQ3BGLDhGQUE4RjtRQUM5RixvR0FBb0c7UUFDcEcsZ0JBQWdCO1FBQ2hCLGlDQUFpQztRQUNqQywrQkFBK0I7UUFDL0IsZUFBZTtRQUNmLGFBQWE7UUFDYixXQUFXO1FBQ1gsU0FBUztRQUNULEtBQUs7UUFFTCwrREFBK0Q7UUFDL0QseUJBQXlCO1FBQ3pCLHNFQUFzRTtRQUN0RSwrR0FBK0c7UUFDL0csa0dBQWtHO1FBQ2xHLDJDQUEyQztRQUMzQyx5QkFBeUI7UUFDekIsdUJBQXVCO1FBQ3ZCLDZCQUE2QjtRQUM3QixnQkFBZ0I7UUFDaEIsbUNBQW1DO1FBQ25DLGlCQUFpQjtRQUVqQixTQUFTO1FBQ1QsS0FBSztRQUVMLDJDQUEyQztJQUM3QyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQUcsRUFBRSxDQUFDO0FBQ3RCLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUNyQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQb2xpY3lTdGF0ZW1lbnQsIEVmZmVjdCwgUm9sZSwgU2VydmljZVByaW5jaXBhbCwgTWFuYWdlZFBvbGljeSwgR3JvdXAsIEFjY291bnRSb290UHJpbmNpcGFsIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWlhbSc7XG5pbXBvcnQgeyBJbnN0YW5jZVR5cGUsIFZwYyB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1lYzInO1xuaW1wb3J0IHsgQXV0b1NjYWxpbmdHcm91cCwgVXBkYXRlVHlwZSB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hdXRvc2NhbGluZyc7XG5pbXBvcnQgeyBFa3NPcHRpbWl6ZWRJbWFnZSwgQ2x1c3RlciwgS3ViZXJuZXRlc1ZlcnNpb24sIE5vZGVUeXBlIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWVrcyc7XG5pbXBvcnQgeyBBcHAsIFN0YWNrUHJvcHMsIFN0YWNrIH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5cbmNsYXNzIEVLU0NsdXN0ZXIgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBBcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdnBjID0gbmV3IFZwYyh0aGlzLCAnRUtTVnBjJyk7ICAvLyBDcmVhdGUgYSBuZXcgVlBDIGZvciBvdXIgY2x1c3RlclxuICAgIFxuICAgIC8vIElBTSByb2xlIGZvciBvdXIgRUMyIHdvcmtlciBub2Rlc1xuICAgIGNvbnN0IHdvcmtlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCAnRUtTV29ya2VyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoJ2VjMi5hbWF6b25hd3MuY29tJylcbiAgICB9KTtcblxuICAgIHdvcmtlclJvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgYWN0aW9uczogWydlYzI6RGVzY3JpYmVWcGNzJ10gfSkpO1xuXG4gICAgY29uc3QgZWtzQ2x1c3RlckFkbWluID0gbmV3IFJvbGUodGhpcywgJ2Vrc0NsdXN0ZXJBZG1pbicsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IEFjY291bnRSb290UHJpbmNpcGFsKClcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsdXN0ZXJBZG1pblJvbGUgPSBuZXcgUm9sZSh0aGlzLCAnY2x1c3RlckFkbWluJywge1xuICAgICAgcm9sZU5hbWU6ICdLdWJlcm5ldGVzQWRtaW4nLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQWNjb3VudFJvb3RQcmluY2lwYWwoKVxuICAgIH0pO1xuXG4gICAgY29uc3QgZGV2ZWxvcGVyUm9sZSA9IG5ldyBSb2xlKHRoaXMsICdkZXZlbG9wZXInLCB7XG4gICAgICByb2xlTmFtZTogJ0t1YmVybmV0ZXNEZXZlbG9wZXInLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQWNjb3VudFJvb3RQcmluY2lwYWwoKVxuICAgIH0pO1xuXG4gICAgY29uc3QgZWtzQWRtaW5Hcm91cCA9IG5ldyBHcm91cCh0aGlzLCAnZWtzLWFkbWluaXN0cmF0b3JzJywge1xuICAgICAgZ3JvdXBOYW1lOiAnZWtzLWFkbWluaXN0cmF0b3JzJyxcbiAgICB9KTtcblxuXG4gICAgY29uc3QgZWtzRGV2ZWxvcGVyR3JvdXAgPSBuZXcgR3JvdXAodGhpcywgJ2Vrcy1kZXZlbG9wZXJzJywge1xuICAgICAgZ3JvdXBOYW1lOiAnZWtzLWRldmVsb3BlcnMnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWRtaW5Qb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHJlc291cmNlczogW2NsdXN0ZXJBZG1pblJvbGUucm9sZUFybl0sXG4gICAgICBhY3Rpb25zOiBbJ3N0czpBc3N1bWVSb2xlJ10sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPV1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGV2ZWxvcGVyUG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFtkZXZlbG9wZXJSb2xlLnJvbGVBcm5dLFxuICAgICAgYWN0aW9uczogWydzdHM6QXNzdW1lUm9sZSddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1dcbiAgICB9KTtcbiAgICAgIFxuICAgIGNvbnN0IGFzc3VtZUVLU0FkbWluUm9sZSA9IG5ldyBNYW5hZ2VkUG9saWN5KHRoaXMsICdhc3N1bWVFS1NBZG1pblJvbGUnLCB7XG4gICAgICBtYW5hZ2VkUG9saWN5TmFtZTogJ2Fzc3VtZS1LdWJlcm5ldGVzQWRtaW4tcm9sZSdcbiAgICB9KTtcbiAgICBhc3N1bWVFS1NBZG1pblJvbGUuYWRkU3RhdGVtZW50cyhhZG1pblBvbGljeVN0YXRlbWVudCk7XG4gICAgYXNzdW1lRUtTQWRtaW5Sb2xlLmF0dGFjaFRvR3JvdXAoZWtzQWRtaW5Hcm91cCk7XG5cblxuICAgIGNvbnN0IGFzc3VtZUVLU0RldmVsb3BlclJvbGUgPSBuZXcgTWFuYWdlZFBvbGljeSh0aGlzLCAnYXNzdW1lRUtTRGV2ZWxvcGVyUm9sZScsIHtcbiAgICAgIG1hbmFnZWRQb2xpY3lOYW1lOiAnYXNzdW1lLUt1YmVybmV0ZXNEZXZlbG9wZXItcm9sZSdcbiAgICB9KTtcbiAgICBhc3N1bWVFS1NEZXZlbG9wZXJSb2xlLmFkZFN0YXRlbWVudHMoZGV2ZWxvcGVyUG9saWN5U3RhdGVtZW50KTtcbiAgICBhc3N1bWVFS1NEZXZlbG9wZXJSb2xlLmF0dGFjaFRvR3JvdXAoZWtzRGV2ZWxvcGVyR3JvdXApO1xuXG5cbiAgICBjb25zdCBla3NDbHVzdGVyID0gbmV3IENsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTogdGhpcy5zdGFja05hbWUsXG4gICAgICAvLyByb2xlOiBla3NSb2xlLFxuICAgICAgbWFzdGVyc1JvbGU6IGVrc0NsdXN0ZXJBZG1pbixcbiAgICAgIHZwYzogdnBjLFxuICAgICAga3ViZWN0bEVuYWJsZWQ6IHRydWUsICAvLyB3ZSB3YW50IHRvIGJlIGFibGUgdG8gbWFuYWdlIGs4cyByZXNvdXJjZXMgdXNpbmcgQ0RLXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsICAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBLdWJlcm5ldGVzVmVyc2lvbi5WMV8xNSxcbiAgICB9KTtcblxuICAgIC8vIGVrc0NsdXN0ZXIucm9sZS5hZGRUb1BvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAvLyAgIHJlc291cmNlczogWycqJ10sXG4gICAgLy8gICBhY3Rpb25zOiBbJ2xvZ3M6KicsICdyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0cycsICdla3M6Q3JlYXRlQ2x1c3RlciddIH0pKTtcblxuICAgIC8vIHdvcmtlclJvbGUuYWRkTWFuYWdlZFBvbGljeShNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQWRtaW5pc3RyYXRvckFjY2VzcycpKTtcbiAgICAvLyBla3NDbHVzdGVyLnJvbGUuYWRkTWFuYWdlZFBvbGljeShNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQWRtaW5pc3RyYXRvckFjY2VzcycpKTtcbiAgICAvLyBla3NDbHVzdGVyQWRtaW4uYWRkTWFuYWdlZFBvbGljeShNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQWRtaW5pc3RyYXRvckFjY2VzcycpKTtcblxuICAgIC8vIGVrc0NsdXN0ZXIuYXdzQXV0aC5hZGRSb2xlTWFwcGluZyhkZXZlbG9wZXJSb2xlLCB7XG4gICAgLy8gICBncm91cHM6IFtdLFxuICAgIC8vICAgdXNlcm5hbWU6ICdrOHMtZGV2ZWxvcGVyLXVzZXInXG4gICAgLy8gfSk7XG5cbiAgICBla3NDbHVzdGVyLmF3c0F1dGguYWRkTWFzdGVyc1JvbGUoY2x1c3RlckFkbWluUm9sZSwgJ2s4cy1jbHVzdGVyLWFkbWluLXVzZXInKTtcblxuICAgIGNvbnN0IG9uRGVtYW5kQVNHID0gbmV3IEF1dG9TY2FsaW5nR3JvdXAodGhpcywgJ09uRGVtYW5kQVNHJywge1xuICAgICAgdnBjOiB2cGMsXG4gICAgICByb2xlOiB3b3JrZXJSb2xlLFxuICAgICAgbWluQ2FwYWNpdHk6IDEsXG4gICAgICBtYXhDYXBhY2l0eTogMSxcbiAgICAgIGluc3RhbmNlVHlwZTogbmV3IEluc3RhbmNlVHlwZSgndDIueGxhcmdlJyksXG4gICAgICBtYWNoaW5lSW1hZ2U6IG5ldyBFa3NPcHRpbWl6ZWRJbWFnZSh7XG4gICAgICAgIGt1YmVybmV0ZXNWZXJzaW9uOiAnMS4xNCcsXG4gICAgICAgIG5vZGVUeXBlOiBOb2RlVHlwZS5TVEFOREFSRFxuICAgICAgfSksXG4gICAgICB1cGRhdGVUeXBlOiBVcGRhdGVUeXBlLlJPTExJTkdfVVBEQVRFXG4gICAgfSk7XG5cbiAgICBla3NDbHVzdGVyLmFkZEF1dG9TY2FsaW5nR3JvdXAob25EZW1hbmRBU0csIHt9KTtcblxuICAgIC8vIGNvbnN0IGF3c0NlcnRBcm49J2Fybjphd3M6YWNtOnVzLWVhc3QtMTo5ODEyMzcxOTMyODg6Y2VydGlmaWNhdGUvNjIwMTBmY2EtMTI1ZS00NzgwLThkNzEtN2Q3NDVmZjkxNzg5J1xuICAgIC8vIGNvbnN0IGF3c0NlcnRQb2xpY3k9XCJFTEJTZWN1cml0eVBvbGljeS1UTFMtMS0yLTIwMTctMDFcIlxuXG4gICAgLy8gY29uc3QgYWNzTmFtZXNwYWNlID0gJ2RlZmF1bHQnO1xuXG4gICAgLy8gLypjb25zdCBuZ2lueENoYXJ0ID0gKi8gbmV3IEhlbG1DaGFydCh0aGlzLCAnTmdpbnhJbmdyZXNzJywge1xuICAgIC8vICAgcmVsZWFzZTogJ25naW54LWluZ3Jlc3MnLFxuICAgIC8vICAgY2x1c3RlcjogZWtzQ2x1c3RlcixcbiAgICAvLyAgIGNoYXJ0OiAnbmdpbngtaW5ncmVzcycsXG4gICAgLy8gICByZXBvc2l0b3J5OiAnaHR0cHM6Ly9oZWxtLm5naW54LmNvbS9zdGFibGUnLFxuICAgIC8vICAgbmFtZXNwYWNlOiAna3ViZS1zeXN0ZW0nLFxuICAgIC8vICAgLy8gdmVyc2lvbjogJzAuMjQuMSdcbiAgICAvLyAvLyAgIHZhbHVlczoge1xuICAgIC8vIC8vICAgICAncmJhYyc6IHtcbiAgICAvLyAvLyAgICAgICAnY3JlYXRlJzogdHJ1ZVxuICAgIC8vIC8vICAgICB9LFxuICAgIC8vIC8vICAgICAnY29udHJvbGxlcic6IHtcbiAgICAvLyAvLyAgICAgICAnc2NvcGUnOiB7XG4gICAgLy8gLy8gICAgICAgICAnZW5hYmxlZCc6IHRydWUsXG4gICAgLy8gLy8gICAgICAgICAnbmFtZXNwYWNlJzogYWNzTmFtZXNwYWNlXG4gICAgLy8gLy8gICAgICAgfSxcbiAgICAvLyAvLyAgICAgICAnY29uZmlnJzoge1xuICAgIC8vIC8vICAgICAgICAgJ2ZvcmNlLXNzbC1yZWRpcmVjdCc6IHRydWUsXG4gICAgLy8gLy8gICAgICAgICAnc2VydmVyLXRva2Vucyc6IGZhbHNlXG4gICAgLy8gLy8gICAgICAgfSxcbiAgICAvLyAvLyAgICAgICAnc2VydmljZSc6IHtcbiAgICAvLyAvLyAgICAgICAgICd0YXJnZXRQb3J0cyc6IHtcbiAgICAvLyAvLyAgICAgICAgICAgJ2h0dHBzJzogODBcbiAgICAvLyAvLyAgICAgICAgIH0sXG4gICAgLy8gLy8gICAgICAgICAnYW5ub3RhdGlvbnMnOiB7XG4gICAgLy8gLy8gICAgICAgICAgICdzZXJ2aWNlLmJldGEua3ViZXJuZXRlcy5pby9hd3MtbG9hZC1iYWxhbmNlci1iYWNrZW5kLXByb3RvY29sJzogJ2h0dHAnLFxuICAgIC8vIC8vICAgICAgICAgICAnc2VydmljZS5iZXRhLmt1YmVybmV0ZXMuaW8vYXdzLWxvYWQtYmFsYW5jZXItc3NsLXBvcnRzJzogJ2h0dHBzJyxcbiAgICAvLyAvLyAgICAgICAgICAgJ3NlcnZpY2UuYmV0YS5rdWJlcm5ldGVzLmlvL2F3cy1sb2FkLWJhbGFuY2VyLXNzbC1jZXJ0JzogYXdzQ2VydEFybixcbiAgICAvLyAvLyAgICAgICAgICAgJ2V4dGVybmFsLWRucy5hbHBoYS5rdWJlcm5ldGVzLmlvL2hvc3RuYW1lJzogYCR7YWNzTmFtZXNwYWNlfS5la3MuYWxmcHJvLm5ldGAsXG4gICAgLy8gLy8gICAgICAgICAgICdzZXJ2aWNlLmJldGEua3ViZXJuZXRlcy5pby9hd3MtbG9hZC1iYWxhbmNlci1zc2wtbmVnb3RpYXRpb24tcG9saWN5JzogYXdzQ2VydFBvbGljeVxuICAgIC8vIC8vICAgICAgICAgfSxcbiAgICAvLyAvLyAgICAgICAgICdwdWJsaXNoU2VydmljZSc6IHtcbiAgICAvLyAvLyAgICAgICAgICAgJ2VuYWJsZWQnOiB0cnVlXG4gICAgLy8gLy8gICAgICAgICB9XG4gICAgLy8gLy8gICAgICAgfVxuICAgIC8vIC8vICAgICB9XG4gICAgLy8gLy8gICB9XG4gICAgLy8gfSlcblxuICAgIC8vIC8qY29uc3QgYWNzQ2hhcnQgID0qLyAgbmV3IEhlbG1DaGFydCh0aGlzLCAnQWNzSGVsbUNoYXJ0Jywge1xuICAgIC8vICAgY2x1c3RlcjogZWtzQ2x1c3RlcixcbiAgICAvLyAgIC8vIHJlcG9zaXRvcnk6ICdodHRwOi8va3ViZXJuZXRlcy1jaGFydHMuYWxmcmVzY28uY29tL2luY3ViYXRvcicsXG4gICAgLy8gICAvLyBjaGFydDogJ2h0dHA6Ly9rdWJlcm5ldGVzLWNoYXJ0cy5hbGZyZXNjby5jb20vaW5jdWJhdG9yL2FsZnJlc2NvLWNvbnRlbnQtc2VydmljZXMtY29tbXVuaXR5LTQuMC4wLnRneicsXG4gICAgLy8gICBjaGFydDogJ2h0dHA6Ly9rdWJlcm5ldGVzLWNoYXJ0cy5hbGZyZXNjby5jb20vaW5jdWJhdG9yL2FsZnJlc2NvLWNvbnRlbnQtc2VydmljZXMtNS4wLjAudGd6JyxcbiAgICAvLyAgIC8vIGNoYXJ0OiAnYWxmcmVzY28tY29udGVudC1zZXJ2aWNlcycsXG4gICAgLy8gICAvLyB2ZXJzaW9uOiAnNS4wLjAnLFxuICAgIC8vICAgcmVsZWFzZTogJ215LWFjcycsXG4gICAgLy8gICBuYW1lc3BhY2U6IGFjc05hbWVzcGFjZSxcbiAgICAvLyAgIHdhaXQ6IHRydWUsXG4gICAgLy8gICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDE1KSxcbiAgICAvLyAgIC8vIHZhbHVlczoge1xuICAgICAgICBcbiAgICAvLyAgIC8vIH1cbiAgICAvLyB9KVxuXG4gICAgLy8gYWNzQ2hhcnQubm9kZS5hZGREZXBlbmRlbmN5KG5naW54Q2hhcnQpO1xuICB9XG59XG5cbmNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcbm5ldyBFS1NDbHVzdGVyKGFwcCwgJ0Fjc0Vrc0NsdXN0ZXInKTtcbmFwcC5zeW50aCgpO1xuIl19