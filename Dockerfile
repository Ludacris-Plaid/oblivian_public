FROM python:3.13-slim

WORKDIR /app

# Install system deps for hacking tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap hydra sqlmap hashcat metasploit-framework \
    nikto gobuster enum4linux smbmap whatweb \
    wordlists curl git ruby && \
    rm -rf /var/lib/apt/lists/*

# Install wpscan gem
RUN gem install wpscan

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Expose port
EXPOSE 8000

# Start the server
CMD ["uvicorn", "src.c2_server.app:app", "--host", "0.0.0.0", "--port", "8000"]
