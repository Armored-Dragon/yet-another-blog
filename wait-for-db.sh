#!/bin/bash

# Function to wait for the database to be ready
wait_for_db() {
  echo "Waiting for the database to be ready..."
  until nc -z db 5432; do
    echo "Database is not ready yet. Retrying in 5 seconds..."
    sleep 5
  done
  echo "Database is now ready!"
}

# Function to generate Prisma client
generate_prisma() {
  echo "Generating Prisma client..."
  npx prisma generate
}

# Function to deploy Prisma migrations
deploy_migrations() {
  echo "Deploying Prisma migrations..."
  npx prisma migrate deploy
}

# Function to push the Prisma database
push_database() {
  echo "Pushing the database..."
  npx prisma db push
}

# Wait for the database to be ready
wait_for_db

# Generate Prisma client
generate_prisma

# Deploy Prisma migrations
deploy_migrations

# Push the database
push_database

# Start the application
echo "Starting the application..."
npm start