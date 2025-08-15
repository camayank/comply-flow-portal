#!/bin/bash

# GCP Kubernetes Deployment Script for Universal Service Provider Platform
# Deploys the platform for ₹100 Cr+ revenue scale

set -e

echo "🚀 Starting GCP Kubernetes Deployment for Universal Service Provider Platform"

# Configuration
PROJECT_ID="digicomply-universal-platform"
CLUSTER_NAME="digicomply-cluster"
REGION="asia-south1"
IMAGE_NAME="gcr.io/$PROJECT_ID/digicomply-universal:latest"

# Set project
gcloud config set project $PROJECT_ID

# Build and push Docker image
echo "📦 Building and pushing Docker image to GCR..."
docker build -f Dockerfile.production -t $IMAGE_NAME .
docker push $IMAGE_NAME

# Create GKE cluster if it doesn't exist
echo "🔧 Setting up GKE cluster..."
if ! gcloud container clusters describe $CLUSTER_NAME --region=$REGION >/dev/null 2>&1; then
  gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --machine-type=e2-standard-4 \
    --num-nodes=3 \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-autoscaling \
    --min-nodes=2 \
    --max-nodes=10
fi

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Deploy database
echo "🗄️ Deploying PostgreSQL database..."
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# Deploy Redis
echo "⚡ Deploying Redis cache..."
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# Deploy application
echo "🌐 Deploying application..."
envsubst < k8s/app-deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/app-service.yaml

# Deploy ingress
echo "🔗 Setting up ingress..."
kubectl apply -f k8s/ingress.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/digicomply-app

# Run database migrations
echo "🗄️ Running database migrations..."
kubectl run migration --image=$IMAGE_NAME --restart=Never --command -- npm run migrate

echo "🎉 Universal Service Provider Platform deployed successfully on GCP!"
echo "📊 Platform ready for ₹100 Cr+ revenue scale"
echo "🌐 Application URL: https://platform.digicomply.com"
echo "📈 Admin Panel: https://platform.digicomply.com/universal-admin"
echo "👥 Client Portal: https://platform.digicomply.com/universal-client"
echo "⚙️ Operations: https://platform.digicomply.com/universal-ops"