#!/bin/bash

# Azure AKS Deployment Script for Universal Service Provider Platform
# Includes Microsoft Dynamics 365 integration for ₹100 Cr+ revenue scale

set -e

echo "🚀 Starting Azure AKS Deployment with Dynamics 365 Integration"

# Configuration
RESOURCE_GROUP="digicomply-universal-platform"
CLUSTER_NAME="digicomply-aks-cluster"
LOCATION="southindia"
ACR_NAME="digicomplyregistry"
IMAGE_NAME="$ACR_NAME.azurecr.io/digicomply-universal:latest"

# Create resource group
echo "🏗️ Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
echo "📦 Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

# Build and push image
echo "🔨 Building and pushing Docker image..."
az acr build --registry $ACR_NAME --image digicomply-universal:latest .

# Create AKS cluster
echo "☸️ Creating AKS cluster..."
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring \
  --attach-acr $ACR_NAME \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10

# Get AKS credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

# Create Azure Database for PostgreSQL
echo "🗄️ Creating Azure Database for PostgreSQL..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name digicomply-postgres \
  --location $LOCATION \
  --admin-user postgres \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_D2s_v3 \
  --storage-size 128 \
  --tier GeneralPurpose

# Deploy application to AKS
echo "🌐 Deploying application to AKS..."
envsubst < k8s/azure-app-deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/app-service.yaml

# Set up Azure Application Gateway Ingress
echo "🔗 Setting up Application Gateway Ingress..."
kubectl apply -f k8s/azure-ingress.yaml

# Configure Dynamics 365 Integration
echo "🔗 Setting up Dynamics 365 Integration..."
kubectl create secret generic dynamics-config \
  --from-literal=tenant-id=$AZURE_TENANT_ID \
  --from-literal=client-id=$DYNAMICS_CLIENT_ID \
  --from-literal=client-secret=$DYNAMICS_CLIENT_SECRET \
  --from-literal=environment-url=$DYNAMICS_ENVIRONMENT_URL

# Deploy Dynamics integration service
kubectl apply -f k8s/dynamics-integration.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
kubectl rollout status deployment/digicomply-app

# Run database migrations
echo "🗄️ Running database migrations..."
kubectl run migration --image=$IMAGE_NAME --restart=Never --command -- npm run migrate

# Set up monitoring and alerts
echo "📊 Setting up Azure Monitor..."
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name digicomply-workspace \
  --location $LOCATION

echo "🎉 Universal Service Provider Platform deployed successfully on Azure!"
echo "📊 Platform ready for ₹100 Cr+ revenue scale with Dynamics 365 Integration"
echo "🌐 Application URL: https://platform.digicomply.com"
echo "📈 Admin Panel: https://platform.digicomply.com/universal-admin"
echo "👥 Client Portal: https://platform.digicomply.com/universal-client"
echo "⚙️ Operations: https://platform.digicomply.com/universal-ops"
echo "💼 Dynamics 365: Integrated CRM and customer engagement"
echo "📊 Azure Monitor: https://portal.azure.com/#blade/Microsoft_Azure_Monitoring"