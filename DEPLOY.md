# Deploying Dreamer to Proxmox

This guide explains how to deploy Dreamer as a self-hosted web application on your Proxmox server.

## Prerequisites

- Proxmox server with a Linux VM or LXC container
- Docker and Docker Compose installed
- (Optional) Tailscale for secure remote access

## Quick Deploy with Docker Compose

1. **Clone or copy the project to your server:**
   ```bash
   git clone <your-repo> dreamer
   cd dreamer
   ```

2. **Build and start the container:**
   ```bash
   docker compose up -d --build
   ```

3. **Access Dreamer:**
   - Open `http://<your-server-ip>:3000` in your browser
   - If using Tailscale: `http://<tailscale-hostname>:3000`

## Manual Deploy (without Docker)

1. **Install Node.js 20+:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and install:**
   ```bash
   git clone <your-repo> dreamer
   cd dreamer
   npm run install:all
   ```

3. **Build the frontend:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Run as a service (systemd):**

   Create `/etc/systemd/system/dreamer.service`:
   ```ini
   [Unit]
   Description=Dreamer Notes App
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/dreamer/server
   ExecStart=/usr/bin/node index.js
   Restart=on-failure
   Environment=NODE_ENV=production
   Environment=PORT=3000
   Environment=DATA_DIR=/path/to/dreamer/server/data
   Environment=PROJECTS_BASE=/path/to/dreamer/server/projects

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable dreamer
   sudo systemctl start dreamer
   ```

## Reverse Proxy (Nginx)

If you want to serve Dreamer on port 80/443 with a domain name:

```nginx
server {
    listen 80;
    server_name notes.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Data Storage

- **Projects**: Stored in `/app/server/projects` (Docker) or `server/projects` (manual)
- **Settings**: Stored in `/app/server/data` (Docker) or `server/data` (manual)

### Backup

To backup your data:
```bash
# Docker
docker compose exec dreamer tar -czf - /app/server/projects /app/server/data > dreamer-backup.tar.gz

# Manual
tar -czf dreamer-backup.tar.gz server/projects server/data
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `DATA_DIR` | `./data` | App data directory |
| `PROJECTS_BASE` | `./projects` | Projects storage directory |

## Tailscale Integration

Since you're using Tailscale for authentication:

1. Install Tailscale on your Proxmox VM/container
2. Dreamer will be accessible via your Tailscale network at `http://<tailscale-ip>:3000`
3. Only devices on your Tailscale network can access it

No additional authentication is needed since Tailscale + Proxmox handles access control.
