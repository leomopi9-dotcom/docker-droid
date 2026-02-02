#!/bin/sh
# ====================================================
# Alpine Linux Auto-Setup Script for Docker on Android
# ====================================================
# This script is automatically executed on first boot
# to configure Alpine Linux with Docker.
# ====================================================

set -e

echo "=============================================="
echo "Docker Android - Alpine Linux Setup"
echo "=============================================="
echo ""

# Configure hostname
echo "docker-android" > /etc/hostname
hostname docker-android

# Setup networking
echo "Configuring network..."
cat > /etc/network/interfaces << 'EOF'
auto lo
iface lo inet loopback

auto eth0
iface eth0 inet dhcp
EOF

# Start networking
/sbin/setup-interfaces -a
/etc/init.d/networking start || true

# Wait for network
echo "Waiting for network..."
sleep 5

# Update and upgrade
echo "Updating package repositories..."
apk update
apk upgrade

# Install essential packages
echo "Installing essential packages..."
apk add \
    docker \
    docker-compose \
    docker-cli-buildx \
    openrc \
    openssh \
    curl \
    wget \
    vim \
    htop \
    iptables \
    ip6tables \
    ca-certificates \
    bash

# Configure Docker daemon
echo "Configuring Docker daemon..."
mkdir -p /etc/docker

cat > /etc/docker/daemon.json << 'EOF'
{
    "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"],
    "storage-driver": "overlay2",
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "max-concurrent-downloads": 3,
    "max-concurrent-uploads": 2,
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 65536,
            "Soft": 65536
        }
    }
}
EOF

# Create Docker service override for TCP access
mkdir -p /etc/conf.d
cat > /etc/conf.d/docker << 'EOF'
DOCKER_OPTS="-H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock"
EOF

# Enable and start Docker
echo "Starting Docker daemon..."
rc-update add docker boot
rc-update add docker default

# Ensure cgroups are mounted properly
mount -t cgroup2 none /sys/fs/cgroup || true

# Start Docker
/etc/init.d/docker start || {
    echo "Docker failed to start, trying alternative method..."
    dockerd --host=unix:///var/run/docker.sock --host=tcp://0.0.0.0:2375 &
    sleep 10
}

# Wait for Docker to be ready
echo "Waiting for Docker to be ready..."
for i in $(seq 1 30); do
    if docker info >/dev/null 2>&1; then
        echo "Docker is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Verify Docker is working
if docker info >/dev/null 2>&1; then
    echo ""
    echo "Docker version:"
    docker version
    echo ""
else
    echo "ERROR: Docker failed to start properly"
    exit 1
fi

# Configure SSH for remote access
echo "Configuring SSH..."
sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Set root password (for development - change in production!)
echo "root:docker" | chpasswd

# Generate SSH host keys
ssh-keygen -A

# Enable and start SSH
rc-update add sshd boot
rc-update add sshd default
/etc/init.d/sshd start

# Pull commonly used images
echo ""
echo "Pulling base Docker images..."
docker pull alpine:latest || true
docker pull nginx:alpine || true
docker pull busybox:latest || true

# Create a test container
echo ""
echo "Creating test container..."
docker run -d --name hello-docker -p 8080:80 nginx:alpine || true

# Display status
echo ""
echo "=============================================="
echo "Setup Complete!"
echo "=============================================="
echo ""
echo "Services:"
echo "  - Docker API: http://localhost:2375"
echo "  - SSH: ssh root@localhost -p 2222 (password: docker)"
echo "  - Test container: http://localhost:8080"
echo ""
echo "Docker Status:"
docker info | grep -E "Server Version|Storage Driver|Containers|Images"
echo ""
echo "Running Containers:"
docker ps
echo ""
echo "=============================================="

# Keep the system running
exec /sbin/init
