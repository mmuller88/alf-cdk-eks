# alf-cdk-eks

# Deploy
```
npm run build && cdk deploy
```

# Destroy
```
cdk destroy
```

# Kubeconfig
```
aws eks update-kubeconfig --name MyEKSCluster --region us-east-1 --role-arn arn:aws:iam::981237193288:user/damadden88
```