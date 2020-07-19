import { PolicyStatement, Effect, Role, ServicePrincipal, ManagedPolicy, Group, AccountRootPrincipal } from '@aws-cdk/aws-iam';
import { InstanceType, Vpc } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup, UpdateType } from '@aws-cdk/aws-autoscaling';
import { EksOptimizedImage, Cluster, KubernetesVersion, NodeType } from '@aws-cdk/aws-eks';
import { App, StackProps, Stack } from '@aws-cdk/core';

class EKSCluster extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'EKSVpc');  // Create a new VPC for our cluster
    
    // IAM role for our EC2 worker nodes
    const workerRole = new Role(this, 'EKSWorkerRole', {
      assumedBy: new ServicePrincipal('amazonaws.com')
    });

    workerRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['ec2:DescribeVpcs'] }));


    const eksRole = new Role(this, 'eksRole', {
      roleName: 'eksRole',
      assumedBy: new ServicePrincipal('amazonaws.com')
    });

    const eksClusterAdmin = new Role(this, 'eksClusterAdmin', {
      assumedBy: new AccountRootPrincipal()
    });

    const clusterAdminRole = new Role(this, 'clusterAdmin', {
      roleName: 'KubernetesAdmin',
      assumedBy: new AccountRootPrincipal()
    });

    const developerRole = new Role(this, 'developer', {
      roleName: 'KubernetesDeveloper',
      assumedBy: new AccountRootPrincipal()
    });

    const eksAdminGroup = new Group(this, 'eks-administrators', {
      groupName: 'eks-administrators',
    });


    const eksDeveloperGroup = new Group(this, 'eks-developers', {
      groupName: 'eks-developers',
    });

    const adminPolicyStatement = new PolicyStatement({
      resources: [clusterAdminRole.roleArn],
      actions: ['sts:AssumeRole'],
      effect: Effect.ALLOW
    });

    const developerPolicyStatement = new PolicyStatement({
      resources: [developerRole.roleArn],
      actions: ['sts:AssumeRole'],
      effect: Effect.ALLOW
    });
      
    const assumeEKSAdminRole = new ManagedPolicy(this, 'assumeEKSAdminRole', {
      managedPolicyName: 'assume-KubernetesAdmin-role'
    });
    assumeEKSAdminRole.addStatements(adminPolicyStatement);
    assumeEKSAdminRole.attachToGroup(eksAdminGroup);


    const assumeEKSDeveloperRole = new ManagedPolicy(this, 'assumeEKSDeveloperRole', {
      managedPolicyName: 'assume-KubernetesDeveloper-role'
    });
    assumeEKSDeveloperRole.addStatements(developerPolicyStatement);
    assumeEKSDeveloperRole.attachToGroup(eksDeveloperGroup);


    const eksCluster = new Cluster(this, 'Cluster', {
      clusterName: this.stackName,
      role: eksRole,
      mastersRole: eksClusterAdmin,
      vpc: vpc,
      kubectlEnabled: true,  // we want to be able to manage k8s resources using CDK
      defaultCapacity: 0,  // we want to manage capacity our selves
      version: KubernetesVersion.V1_16,
    });

    // eksCluster.awsAuth.addRoleMapping(developerRole, {
    //   groups: [],
    //   username: 'k8s-developer-user'
    // });

    eksCluster.awsAuth.addMastersRole(clusterAdminRole, 'k8s-cluster-admin-user');

    const onDemandASG = new AutoScalingGroup(this, 'OnDemandASG', {
      vpc: vpc,
      role: workerRole,
      minCapacity: 1,
      maxCapacity: 1,
      instanceType: new InstanceType('t3.medium'),
      machineImage: new EksOptimizedImage({
        kubernetesVersion: '1.14',
        nodeType: NodeType.STANDARD  // without this, incorrect SSM parameter for AMI is resolved
      }),
      updateType: UpdateType.ROLLING_UPDATE
    });

    eksCluster.addAutoScalingGroup(onDemandASG, {});
  }
}

const app = new App();
new EKSCluster(app, 'MyEKSCluster');
app.synth();
