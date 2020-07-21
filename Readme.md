# alf-cdk-eks

# Deploy
```
npm install
npm run build && cdk deploy
```

# Destroy
```
cdk destroy
```

# Kubeconfig
```
aws eks update-kubeconfig --name MyEKSCluster --region us-east-1 --role-arn arn:aws:iam::981237193288:role/MyEKSCluster-ClusterCreationRole360249B6-17LVWCAXWL5X2
```