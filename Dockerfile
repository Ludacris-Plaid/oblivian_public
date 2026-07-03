# Frontend build stage
FROM node:23-alpine AS frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

# Backend stage
FROM python:3.13-slim

WORKDIR /app

# Install system deps for hacking tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap hydra sqlmap hashcat gobuster smbmap whatweb \
    john curl git ruby ruby-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install nikto from git
RUN git clone --depth 1 https://github.com/sullo/nikto /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto

# Install enum4linux from git
RUN git clone --depth 1 https://github.com/CiscoCXSecurity/enum4linux /opt/enum4linux && \
    ln -s /opt/enum4linux/enum4linux.pl /usr/local/bin/enum4linux

# Install searchsploit from git
RUN git clone --depth 1 https://gitlab.com/exploit-database/exploitdb /opt/exploitdb && \
    ln -s /opt/exploitdb/searchsploit /usr/local/bin/searchsploit

# Install wpscan gem
RUN gem install wpscan

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Copy frontend build
COPY --from=frontend /build/dist /app/dist

# Expose port
EXPOSE 8000

# Start the server
CMD ["uvicorn", "src.c2_server.app:app", "--host", "0.0.0.0", "--port", "8000"]