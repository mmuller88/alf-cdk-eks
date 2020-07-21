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
        // const eksRole = new Role(this, 'eksRole', {
        //   roleName: 'eksRole',
        //   assumedBy: new ServicePrincipal('eks.amazonaws.com')
        // });
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
            version: aws_eks_1.KubernetesVersion.V1_17,
        });
        eksCluster.role.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['*'],
            actions: ['logs:*', 'route53:ChangeResourceRecordSets', 'eks:CreateCluster']
        }));
        // eksCluster.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
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
                kubernetesVersion: '1.17',
                nodeType: aws_eks_1.NodeType.STANDARD
            }),
            updateType: aws_autoscaling_1.UpdateType.ROLLING_UPDATE
        });
        eksCluster.addAutoScalingGroup(onDemandASG, {});
        const awsCertArn = 'arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789';
        const awsCertPolicy = "ELBSecurityPolicy-TLS-1-2-2017-01";
        const acsNamespace = 'default';
        new aws_eks_1.HelmChart(this, 'NginxIngress', {
            cluster: eksCluster,
            chart: 'nginx-ingress',
            repository: 'https://helm.nginx.com/stable',
            namespace: 'kube-system',
            values: {
                'rbac': {
                    'create': true
                },
                'controller': {
                    'scope': {
                        'enabled': true,
                        'namespace': acsNamespace
                    },
                    'config': {
                        'force-ssl-redirect': true,
                        'server-tokens': false
                    },
                    'service': {
                        'targetPorts': {
                            'https': 80
                        },
                        'annotations': {
                            'service.beta.kubernetes.io/aws-load-balancer-backend-protocol': 'http',
                            'service.beta.kubernetes.io/aws-load-balancer-ssl-ports': 'https',
                            'service.beta.kubernetes.io/aws-load-balancer-ssl-cert': awsCertArn,
                            'external-dns.alpha.kubernetes.io/hostname': `${acsNamespace}.eks.alfpro.net`,
                            'service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy': awsCertPolicy
                        },
                        'publishService': {
                            'enabled': true
                        }
                    }
                }
            }
        });
        new aws_eks_1.HelmChart(this, 'AcsHelmChart', {
            cluster: eksCluster,
            // repository: 'http://kubernetes-charts.alfresco.com/incubator',
            // chart: 'http://kubernetes-charts.alfresco.com/stable/alfresco-content-services-community-3.0.1.tgz',
            chart: 'http://kubernetes-charts.alfresco.com/incubator/alfresco-content-services-5.0.0.tgz',
            // version: '3.0.1',
            release: 'my-acs',
            namespace: acsNamespace,
            values: {}
        });
    }
}
const app = new core_1.App();
new EKSCluster(app, 'MyEKSCluster');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhDQUErSDtBQUMvSCw4Q0FBcUQ7QUFDckQsOERBQXdFO0FBQ3hFLDhDQUFzRztBQUN0Ryx3Q0FBdUQ7QUFFdkQsTUFBTSxVQUFXLFNBQVEsWUFBSztJQUM1QixZQUFZLEtBQVUsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDcEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxhQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUUsbUNBQW1DO1FBRXpFLG9DQUFvQztRQUNwQyxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ2pELFNBQVMsRUFBRSxJQUFJLDBCQUFnQixDQUFDLG1CQUFtQixDQUFDO1NBQ3JELENBQUMsQ0FBQztRQUVILFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSx5QkFBZSxDQUFDO1lBQ3pDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNoQixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztTQUFFLENBQUMsQ0FBQyxDQUFDO1FBR3BDLDhDQUE4QztRQUM5Qyx5QkFBeUI7UUFDekIseURBQXlEO1FBQ3pELE1BQU07UUFFTixNQUFNLGVBQWUsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDeEQsU0FBUyxFQUFFLElBQUksOEJBQW9CLEVBQUU7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGNBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RELFFBQVEsRUFBRSxpQkFBaUI7WUFDM0IsU0FBUyxFQUFFLElBQUksOEJBQW9CLEVBQUU7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFh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RUFBaUU7WUFDakUsdUdBQXVHO1lBQ3ZHLEtBQUssRUFBRSxxRkFBcUY7WUFDNUYsb0JBQW9CO1lBQ3BCLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLE1BQU0sRUFBRSxFQUVQO1NBQ0YsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFHLEVBQUUsQ0FBQztBQUN0QixJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDcEMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUG9saWN5U3RhdGVtZW50LCBFZmZlY3QsIFJvbGUsIFNlcnZpY2VQcmluY2lwYWwsIE1hbmFnZWRQb2xpY3ksIEdyb3VwLCBBY2NvdW50Um9vdFByaW5jaXBhbCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1pYW0nO1xuaW1wb3J0IHsgSW5zdGFuY2VUeXBlLCBWcGMgfSBmcm9tICdAYXdzLWNkay9hd3MtZWMyJztcbmltcG9ydCB7IEF1dG9TY2FsaW5nR3JvdXAsIFVwZGF0ZVR5cGUgfSBmcm9tICdAYXdzLWNkay9hd3MtYXV0b3NjYWxpbmcnO1xuaW1wb3J0IHsgRWtzT3B0aW1pemVkSW1hZ2UsIENsdXN0ZXIsIEt1YmVybmV0ZXNWZXJzaW9uLCBOb2RlVHlwZSwgSGVsbUNoYXJ0IH0gZnJvbSAnQGF3cy1jZGsvYXdzLWVrcyc7XG5pbXBvcnQgeyBBcHAsIFN0YWNrUHJvcHMsIFN0YWNrIH0gZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5cbmNsYXNzIEVLU0NsdXN0ZXIgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBBcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdnBjID0gbmV3IFZwYyh0aGlzLCAnRUtTVnBjJyk7ICAvLyBDcmVhdGUgYSBuZXcgVlBDIGZvciBvdXIgY2x1c3RlclxuICAgIFxuICAgIC8vIElBTSByb2xlIGZvciBvdXIgRUMyIHdvcmtlciBub2Rlc1xuICAgIGNvbnN0IHdvcmtlclJvbGUgPSBuZXcgUm9sZSh0aGlzLCAnRUtTV29ya2VyUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoJ2VjMi5hbWF6b25hd3MuY29tJylcbiAgICB9KTtcblxuICAgIHdvcmtlclJvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgYWN0aW9uczogWydlYzI6RGVzY3JpYmVWcGNzJ10gfSkpO1xuXG5cbiAgICAvLyBjb25zdCBla3NSb2xlID0gbmV3IFJvbGUodGhpcywgJ2Vrc1JvbGUnLCB7XG4gICAgLy8gICByb2xlTmFtZTogJ2Vrc1JvbGUnLFxuICAgIC8vICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbCgnZWtzLmFtYXpvbmF3cy5jb20nKVxuICAgIC8vIH0pO1xuXG4gICAgY29uc3QgZWtzQ2x1c3RlckFkbWluID0gbmV3IFJvbGUodGhpcywgJ2Vrc0NsdXN0ZXJBZG1pbicsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IEFjY291bnRSb290UHJpbmNpcGFsKClcbiAgICB9KTtcblxuICAgIGNvbnN0IGNsdXN0ZXJBZG1pblJvbGUgPSBuZXcgUm9sZSh0aGlzLCAnY2x1c3RlckFkbWluJywge1xuICAgICAgcm9sZU5hbWU6ICdLdWJlcm5ldGVzQWRtaW4nLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQWNjb3VudFJvb3RQcmluY2lwYWwoKVxuICAgIH0pO1xuXG4gICAgY29uc3QgZGV2ZWxvcGVyUm9sZSA9IG5ldyBSb2xlKHRoaXMsICdkZXZlbG9wZXInLCB7XG4gICAgICByb2xlTmFtZTogJ0t1YmVybmV0ZXNEZXZlbG9wZXInLFxuICAgICAgYXNzdW1lZEJ5OiBuZXcgQWNjb3VudFJvb3RQcmluY2lwYWwoKVxuICAgIH0pO1xuXG4gICAgY29uc3QgZWtzQWRtaW5Hcm91cCA9IG5ldyBHcm91cCh0aGlzLCAnZWtzLWFkbWluaXN0cmF0b3JzJywge1xuICAgICAgZ3JvdXBOYW1lOiAnZWtzLWFkbWluaXN0cmF0b3JzJyxcbiAgICB9KTtcblxuXG4gICAgY29uc3QgZWtzRGV2ZWxvcGVyR3JvdXAgPSBuZXcgR3JvdXAodGhpcywgJ2Vrcy1kZXZlbG9wZXJzJywge1xuICAgICAgZ3JvdXBOYW1lOiAnZWtzLWRldmVsb3BlcnMnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWRtaW5Qb2xpY3lTdGF0ZW1lbnQgPSBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHJlc291cmNlczogW2NsdXN0ZXJBZG1pblJvbGUucm9sZUFybl0sXG4gICAgICBhY3Rpb25zOiBbJ3N0czpBc3N1bWVSb2xlJ10sXG4gICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPV1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGV2ZWxvcGVyUG9saWN5U3RhdGVtZW50ID0gbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFtkZXZlbG9wZXJSb2xlLnJvbGVBcm5dLFxuICAgICAgYWN0aW9uczogWydzdHM6QXNzdW1lUm9sZSddLFxuICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1dcbiAgICB9KTtcbiAgICAgIFxuICAgIGNvbnN0IGFzc3VtZUVLU0FkbWluUm9sZSA9IG5ldyBNYW5hZ2VkUG9saWN5KHRoaXMsICdhc3N1bWVFS1NBZG1pblJvbGUnLCB7XG4gICAgICBtYW5hZ2VkUG9saWN5TmFtZTogJ2Fzc3VtZS1LdWJlcm5ldGVzQWRtaW4tcm9sZSdcbiAgICB9KTtcbiAgICBhc3N1bWVFS1NBZG1pblJvbGUuYWRkU3RhdGVtZW50cyhhZG1pblBvbGljeVN0YXRlbWVudCk7XG4gICAgYXNzdW1lRUtTQWRtaW5Sb2xlLmF0dGFjaFRvR3JvdXAoZWtzQWRtaW5Hcm91cCk7XG5cblxuICAgIGNvbnN0IGFzc3VtZUVLU0RldmVsb3BlclJvbGUgPSBuZXcgTWFuYWdlZFBvbGljeSh0aGlzLCAnYXNzdW1lRUtTRGV2ZWxvcGVyUm9sZScsIHtcbiAgICAgIG1hbmFnZWRQb2xpY3lOYW1lOiAnYXNzdW1lLUt1YmVybmV0ZXNEZXZlbG9wZXItcm9sZSdcbiAgICB9KTtcbiAgICBhc3N1bWVFS1NEZXZlbG9wZXJSb2xlLmFkZFN0YXRlbWVudHMoZGV2ZWxvcGVyUG9saWN5U3RhdGVtZW50KTtcbiAgICBhc3N1bWVFS1NEZXZlbG9wZXJSb2xlLmF0dGFjaFRvR3JvdXAoZWtzRGV2ZWxvcGVyR3JvdXApO1xuXG5cbiAgICBjb25zdCBla3NDbHVzdGVyID0gbmV3IENsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XG4gICAgICBjbHVzdGVyTmFtZTogdGhpcy5zdGFja05hbWUsXG4gICAgICAvLyByb2xlOiBla3NSb2xlLFxuICAgICAgbWFzdGVyc1JvbGU6IGVrc0NsdXN0ZXJBZG1pbixcbiAgICAgIHZwYzogdnBjLFxuICAgICAga3ViZWN0bEVuYWJsZWQ6IHRydWUsICAvLyB3ZSB3YW50IHRvIGJlIGFibGUgdG8gbWFuYWdlIGs4cyByZXNvdXJjZXMgdXNpbmcgQ0RLXG4gICAgICBkZWZhdWx0Q2FwYWNpdHk6IDAsICAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXIgc2VsdmVzXG4gICAgICB2ZXJzaW9uOiBLdWJlcm5ldGVzVmVyc2lvbi5WMV8xNyxcbiAgICB9KTtcblxuICAgIGVrc0NsdXN0ZXIucm9sZS5hZGRUb1BvbGljeShuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICBhY3Rpb25zOiBbJ2xvZ3M6KicsICdyb3V0ZTUzOkNoYW5nZVJlc291cmNlUmVjb3JkU2V0cycsICdla3M6Q3JlYXRlQ2x1c3RlciddIH0pKTtcblxuICAgIC8vIGVrc0NsdXN0ZXIucm9sZS5hZGRNYW5hZ2VkUG9saWN5KE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBZG1pbmlzdHJhdG9yQWNjZXNzJykpO1xuXG4gICAgLy8gZWtzQ2x1c3Rlci5hd3NBdXRoLmFkZFJvbGVNYXBwaW5nKGRldmVsb3BlclJvbGUsIHtcbiAgICAvLyAgIGdyb3VwczogW10sXG4gICAgLy8gICB1c2VybmFtZTogJ2s4cy1kZXZlbG9wZXItdXNlcidcbiAgICAvLyB9KTtcblxuICAgIGVrc0NsdXN0ZXIuYXdzQXV0aC5hZGRNYXN0ZXJzUm9sZShjbHVzdGVyQWRtaW5Sb2xlLCAnazhzLWNsdXN0ZXItYWRtaW4tdXNlcicpO1xuXG4gICAgY29uc3Qgb25EZW1hbmRBU0cgPSBuZXcgQXV0b1NjYWxpbmdHcm91cCh0aGlzLCAnT25EZW1hbmRBU0cnLCB7XG4gICAgICB2cGM6IHZwYyxcbiAgICAgIHJvbGU6IHdvcmtlclJvbGUsXG4gICAgICBtaW5DYXBhY2l0eTogMSxcbiAgICAgIG1heENhcGFjaXR5OiAxLFxuICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgSW5zdGFuY2VUeXBlKCd0Mi54bGFyZ2UnKSxcbiAgICAgIG1hY2hpbmVJbWFnZTogbmV3IEVrc09wdGltaXplZEltYWdlKHtcbiAgICAgICAga3ViZXJuZXRlc1ZlcnNpb246ICcxLjE3JyxcbiAgICAgICAgbm9kZVR5cGU6IE5vZGVUeXBlLlNUQU5EQVJEXG4gICAgICB9KSxcbiAgICAgIHVwZGF0ZVR5cGU6IFVwZGF0ZVR5cGUuUk9MTElOR19VUERBVEVcbiAgICB9KTtcblxuICAgIGVrc0NsdXN0ZXIuYWRkQXV0b1NjYWxpbmdHcm91cChvbkRlbWFuZEFTRywge30pO1xuXG4gICAgY29uc3QgYXdzQ2VydEFybj0nYXJuOmF3czphY206dXMtZWFzdC0xOjk4MTIzNzE5MzI4ODpjZXJ0aWZpY2F0ZS82MjAxMGZjYS0xMjVlLTQ3ODAtOGQ3MS03ZDc0NWZmOTE3ODknXG4gICAgY29uc3QgYXdzQ2VydFBvbGljeT1cIkVMQlNlY3VyaXR5UG9saWN5LVRMUy0xLTItMjAxNy0wMVwiXG5cbiAgICBjb25zdCBhY3NOYW1lc3BhY2UgPSAnZGVmYXVsdCc7XG5cbiAgICBuZXcgSGVsbUNoYXJ0KHRoaXMsICdOZ2lueEluZ3Jlc3MnLCB7XG4gICAgICBjbHVzdGVyOiBla3NDbHVzdGVyLFxuICAgICAgY2hhcnQ6ICduZ2lueC1pbmdyZXNzJyxcbiAgICAgIHJlcG9zaXRvcnk6ICdodHRwczovL2hlbG0ubmdpbnguY29tL3N0YWJsZScsXG4gICAgICBuYW1lc3BhY2U6ICdrdWJlLXN5c3RlbScsXG4gICAgICB2YWx1ZXM6IHtcbiAgICAgICAgJ3JiYWMnOiB7XG4gICAgICAgICAgJ2NyZWF0ZSc6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgJ2NvbnRyb2xsZXInOiB7XG4gICAgICAgICAgJ3Njb3BlJzoge1xuICAgICAgICAgICAgJ2VuYWJsZWQnOiB0cnVlLFxuICAgICAgICAgICAgJ25hbWVzcGFjZSc6IGFjc05hbWVzcGFjZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2NvbmZpZyc6IHtcbiAgICAgICAgICAgICdmb3JjZS1zc2wtcmVkaXJlY3QnOiB0cnVlLFxuICAgICAgICAgICAgJ3NlcnZlci10b2tlbnMnOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgJ3NlcnZpY2UnOiB7XG4gICAgICAgICAgICAndGFyZ2V0UG9ydHMnOiB7XG4gICAgICAgICAgICAgICdodHRwcyc6IDgwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ2Fubm90YXRpb25zJzoge1xuICAgICAgICAgICAgICAnc2VydmljZS5iZXRhLmt1YmVybmV0ZXMuaW8vYXdzLWxvYWQtYmFsYW5jZXItYmFja2VuZC1wcm90b2NvbCc6ICdodHRwJyxcbiAgICAgICAgICAgICAgJ3NlcnZpY2UuYmV0YS5rdWJlcm5ldGVzLmlvL2F3cy1sb2FkLWJhbGFuY2VyLXNzbC1wb3J0cyc6ICdodHRwcycsXG4gICAgICAgICAgICAgICdzZXJ2aWNlLmJldGEua3ViZXJuZXRlcy5pby9hd3MtbG9hZC1iYWxhbmNlci1zc2wtY2VydCc6IGF3c0NlcnRBcm4sXG4gICAgICAgICAgICAgICdleHRlcm5hbC1kbnMuYWxwaGEua3ViZXJuZXRlcy5pby9ob3N0bmFtZSc6IGAke2Fjc05hbWVzcGFjZX0uZWtzLmFsZnByby5uZXRgLFxuICAgICAgICAgICAgICAnc2VydmljZS5iZXRhLmt1YmVybmV0ZXMuaW8vYXdzLWxvYWQtYmFsYW5jZXItc3NsLW5lZ290aWF0aW9uLXBvbGljeSc6IGF3c0NlcnRQb2xpY3lcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAncHVibGlzaFNlcnZpY2UnOiB7XG4gICAgICAgICAgICAgICdlbmFibGVkJzogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBuZXcgSGVsbUNoYXJ0KHRoaXMsICdBY3NIZWxtQ2hhcnQnLCB7XG4gICAgICBjbHVzdGVyOiBla3NDbHVzdGVyLFxuICAgICAgLy8gcmVwb3NpdG9yeTogJ2h0dHA6Ly9rdWJlcm5ldGVzLWNoYXJ0cy5hbGZyZXNjby5jb20vaW5jdWJhdG9yJyxcbiAgICAgIC8vIGNoYXJ0OiAnaHR0cDovL2t1YmVybmV0ZXMtY2hhcnRzLmFsZnJlc2NvLmNvbS9zdGFibGUvYWxmcmVzY28tY29udGVudC1zZXJ2aWNlcy1jb21tdW5pdHktMy4wLjEudGd6JyxcbiAgICAgIGNoYXJ0OiAnaHR0cDovL2t1YmVybmV0ZXMtY2hhcnRzLmFsZnJlc2NvLmNvbS9pbmN1YmF0b3IvYWxmcmVzY28tY29udGVudC1zZXJ2aWNlcy01LjAuMC50Z3onLFxuICAgICAgLy8gdmVyc2lvbjogJzMuMC4xJyxcbiAgICAgIHJlbGVhc2U6ICdteS1hY3MnLFxuICAgICAgbmFtZXNwYWNlOiBhY3NOYW1lc3BhY2UsXG4gICAgICB2YWx1ZXM6IHtcbiAgICAgICAgXG4gICAgICB9XG4gICAgfSlcbiAgfVxufVxuXG5jb25zdCBhcHAgPSBuZXcgQXBwKCk7XG5uZXcgRUtTQ2x1c3RlcihhcHAsICdNeUVLU0NsdXN0ZXInKTtcbmFwcC5zeW50aCgpO1xuIl19