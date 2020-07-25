# alf-cdk-eks

# Deploy
You need to create 

```
npm install

npm run build && cdk deploy
```

## Install Nginx
```
export AWS_CERT_ARN="arn:aws:acm:us-east-1:981237193288:certificate/62010fca-125e-4780-8d71-7d745ff91789"
export AWS_CERT_POLICY="ELBSecurityPolicy-TLS-1-2-2017-01"
export DESIREDNAMESPACE="default"

helm repo add nginx-stable https://helm.nginx.com/stable
helm repo update

helm install nginx-ingress nginx-stable/nginx-ingress \
--set controller.scope.enabled=true \
--set controller.scope.namespace=$DESIREDNAMESPACE \
--set rbac.create=true \
--set controller.config."force-ssl-redirect"=\"true\" \
--set controller.config."server-tokens"=\"false\" \
--set controller.service.targetPorts.https=80 \
--set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-backend-protocol"="http" \
--set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-ssl-ports"="https" \
--set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-ssl-cert"=$AWS_CERT_ARN \
--set controller.service.annotations."external-dns\.alpha\.kubernetes\.io/hostname"="$DESIREDNAMESPACE.dev.alfresco.me" \
--set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-ssl-negotiation-policy"=$AWS_CERT_POLICY \
--set controller.publishService.enabled=true \
--namespace $DESIREDNAMESPACE
```

## Install ACS Community
```
helm repo add alfresco-incubator https://kubernetes-charts.alfresco.com/incubator

export EXTERNALHOST="eks.alfpro.net"

helm install my-acs alfresco-incubator/alfresco-content-services-community \
--set externalProtocol="https" \
--set externalHost="$EXTERNALHOST" \
--set externalPort="443" \
--set alfresco-infrastructure.persistence.storageClass.enabled=true \
--set alfresco-infrastructure.persistence.storageClass.name="nfs-client" \
--set alfresco-infrastructure.alfresco-infrastructure.nginx-ingress.enabled=false \
--set alfresco-search.resources.requests.memory="2500Mi",alfresco-search.resources.limits.memory="2500Mi" \
--set alfresco-search.environment.SOLR_JAVA_MEM="-Xms2000M -Xmx2000M" \
--namespace=$DESIREDNAMESPACE
```

# Destroy
```
cdk destroy
```

# Kubeconfig
```
aws eks update-kubeconfig --name MyEKSCluster --region us-east-1 --role-arn arn:aws:iam::981237193288:role/MyEKSCluster-ClusterCreationRole360249B6-17LVWCAXWL5X2
```