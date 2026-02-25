---
name: docker-manager
description: "Docker container management. Use when: user needs to start, stop, inspect, view logs, or manage Docker containers and images."
---

# Docker Manager Skill

Docker container and image management.

## When to Use

- Start/stop containers
- View container logs
- Inspect container status
- Manage Docker images
- Debug container issues

## Container Management

### List Containers
```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# List with size
docker ps -as

# Filter containers
docker ps --filter "status=exited"
docker ps --filter "name=web"
```

### Start/Stop Containers
```bash
# Start container
docker start my-container

# Stop container
docker stop my-container

# Restart container
docker restart my-container

# Stop all running containers
docker stop $(docker ps -q)

# Kill container (force stop)
docker kill my-container
```

### Remove Containers
```bash
# Remove stopped container
docker rm my-container

# Remove running container (force)
docker rm -f my-container

# Remove all stopped containers
docker container prune -f

# Remove all containers
docker rm $(docker ps -aq)
```

## Logs & Debugging

### View Logs
```bash
# View logs
docker logs my-container

# Follow logs
docker logs -f my-container

# View last N lines
docker logs --tail 100 my-container

# View with timestamp
docker logs -t my-container

# Combine flags
docker logs --tail 50 -f --timestamps my-container
```

### Inspect Container
```bash
# Get container info
docker inspect my-container

# Get specific field
docker inspect -f '{{.State.Status}}' my-container
docker inspect -f '{{.NetworkSettings.IPAddress}}' my-container
docker inspect -f '{{.Config.Env}}' my-container
```

### Execute Commands
```bash
# Run command in container
docker exec my-container ls -la

# Interactive shell
docker exec -it my-container /bin/bash

# Run as different user
docker exec -u root my-container /bin/bash
```

### Container Stats
```bash
# Real-time stats
docker stats

# Stats for specific container
docker stats my-container

# Stats with no streaming
docker stats --no-stream my-container
```

## Image Management

### List Images
```bash
# List all images
docker images

# List with size
docker images -a

# Filter images
docker images --filter "dangling=true"
```

### Pull/Push Images
```bash
# Pull image
docker pull ubuntu:latest

# Pull specific tag
docker pull nginx:alpine

# Push image
docker push myregistry/myimage:latest
```

### Remove Images
```bash
# Remove image
docker rmi my-image:latest

# Remove dangling images
docker image prune -f

# Remove all unused images
docker image prune -a -f
```

## Docker Compose

### Common Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start
docker-compose up -d --build

# Scale service
docker-compose up -d --scale web=3

# Run single service
docker-compose run web bash
```

## Network Management

### List Networks
```bash
# List networks
docker network ls

# Inspect network
docker network inspect bridge
```

### Create Network
```bash
# Create bridge network
docker network create my-network

# Create with subnet
docker network create --subnet 172.20.0.0/16 my-network
```

## Volume Management

### List Volumes
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect my-volume
```

### Create/Remove Volumes
```bash
# Create volume
docker volume create my-volume

# Remove volume
docker volume rm my-volume

# Remove unused volumes
docker volume prune -f
```

## Examples

### Quick Container Health Check
```bash
#!/bin/bash
# Check all container health

for container in $(docker ps --format '{{.Names}}'); do
  status=$(docker inspect -f '{{.State.Health.Status}}' $container 2>/dev/null || echo "no-healthcheck")
  running=$(docker inspect -f '{{.State.Running}}' $container)
  echo "$container: running=$running health=$status"
done
```

### Cleanup Script
```bash
#!/bin/bash
# Docker cleanup script

# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)

# Remove all volumes
docker volume prune -f

# Remove all networks (except default)
docker network prune -f
```

### Monitor Resource Usage
```bash
# Watch container stats
watch -n 1 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"'
```

## Docker Compose Example

```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    environment:
      - NGINX_HOST=localhost
    restart: unless-stopped

  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432/app
    depends_on:
      - db

  db:
    image: postgres:15
    volumes:
      - db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  db-data:
```

## Notes

- Use `docker system df` to see disk usage
- Use `docker system prune` for general cleanup
- Consider using `--restart unless-stopped` for production containers
- Use volumes for persistent data
- Use networks for inter-container communication
