# cdk-constructs
AWS CDK Deployment mit ACS. The Docker Compose deployment is based on the Alfresco Docker Installer (www.github.com/Alfresco/alfresco-docker-installer)

## Deploy

Run `cdk bootstrap aws://<ACCOUNT-NUMBER>/<REGION>`for deploying the cdk toolkit stack
Run `npm run build && cdk deploy`. This will build and deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## Destroy

Run `cdk destroy`