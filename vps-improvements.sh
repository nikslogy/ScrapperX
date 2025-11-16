#!/bin/bash
# VPS Optimization Script for ScrapperX
# Run this on your VPS as root or with sudo

echo "=== ScrapperX VPS Optimization ==="

# 1. Add 2GB Swap Space
echo "Adding swap space..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo "✅ Swap space added"

# 2. Optimize MongoDB for Low Memory
echo "Optimizing MongoDB..."
sudo tee /etc/mongod.conf > /dev/null <<EOF
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25  # Limit MongoDB to 250MB RAM

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF
sudo systemctl restart mongod
echo "✅ MongoDB optimized"

# 3. Setup automatic file cleanup cron job
echo "Setting up automatic cleanup..."
(crontab -l 2>/dev/null; echo "0 2 * * * cd /home/scrapperx/ScrapperX && find backend/exports -name '*.md' -mtime +7 -delete && find backend/exports -name '*.json' -mtime +7 -delete") | crontab -
echo "✅ Automatic cleanup configured (runs daily at 2 AM)"

# 4. Optimize system parameters
echo "Optimizing system parameters..."
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF
# Network optimizations
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65000

# Memory management
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOF
sudo sysctl -p
echo "✅ System parameters optimized"

echo ""
echo "=== Optimization Complete! ==="
echo "Please restart PM2 processes: pm2 restart all"

