import { PolicyStatement, Effect, Role, ServicePrincipal, ManagedPolicy, Group, AccountRootPrincipal } from '@aws-cdk/aws-iam';
import { InstanceType, Vpc } from '@aws-cdk/aws-ec2';
import { AutoScalingGroup, UpdateType } from '@aws-cdk/aws-autoscaling';
import { EksOptimizedImage, Cluster, KubernetesVersion, NodeType, HelmChart } from '@aws-cdk/aws-eks';
import { App, StackProps, Stack } from '@aws-cdk/core';

class EKSCluster extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'EKSVpc');  // Create a new VPC for our cluster
    
    // IAM role for our EC2 worker nodes
    const workerRole = new Role(this, 'EKSWorkerRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com')
    });

    workerRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['ec2:DescribeVpcs'] }));

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
      // role: eksRole,
      mastersRole: eksClusterAdmin,
      vpc: vpc,
      kubectlEnabled: true,  // we want to be able to manage k8s resources using CDK
      defaultCapacity: 0,  // we want to manage capacity our selves
      version: KubernetesVersion.V1_17,
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

    const onDemandASG = new AutoScalingGroup(this, 'OnDemandASG', {
      vpc: vpc,
      role: workerRole,
      minCapacity: 1,
      maxCapacity: 1,
      instanceType: new InstanceType('t2.xlarge'),
      machineImage: new EksOptimizedImage({
        kubernetesVersion: '1.14',
        nodeType: NodeType.STANDARD
      }),
      updateType: UpdateType.ROLLING_UPDATE
    });

    eksCluster.addAutoScalingGroup(onDemandASG, {});

    const awsCertArn='arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789'
    const awsCertPolicy="ELBSecurityPolicy-TLS-1-2-2017-01"

    const acsNamespace = 'default';

    /*const nginxChart = */ new HelmChart(this, 'NginxIngress', {
      release: 'nginx-ingress',
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
    })

    // Can't use ACS Charts yet as they are not Helm 3 compatible. You would need to install them with Helm 2 yourself!
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

const app = new App();
new EKSCluster(app, 'AcsEksCluster');
app.synth();
