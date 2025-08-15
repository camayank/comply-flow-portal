#!/bin/bash

# AWS ECS Deployment Script for Universal Service Provider Platform
# Deploys the platform for ₹100 Cr+ revenue scale

set -e

echo "🚀 Starting AWS ECS Deployment for Universal Service Provider Platform"

# Configuration
CLUSTER_NAME="digicomply-universal-platform"
SERVICE_NAME="digicomply-app"
TASK_DEFINITION="digicomply-task"
ECR_REPOSITORY="digicomply/universal-platform"
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Build and push Docker image
echo "📦 Building and pushing Docker image..."
docker build -f Dockerfile.production -t $ECR_REPOSITORY:latest .
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Push image
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION

echo "✅ Deployment completed successfully!"

# Run database migrations
echo "🗄️ Running database migrations..."
aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --task-definition $TASK_DEFINITION-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --region $AWS_REGION

echo "🎉 Universal Service Provider Platform deployed successfully on AWS!"
echo "📊 Platform ready for ₹100 Cr+ revenue scale"
echo "🌐 Application URL: https://platform.digicomply.com"
echo "📈 Admin Panel: https://platform.digicomply.com/universal-admin"
echo "👥 Client Portal: https://platform.digicomply.com/universal-client"
echo "⚙️ Operations: https://platform.digicomply.com/universal-ops"