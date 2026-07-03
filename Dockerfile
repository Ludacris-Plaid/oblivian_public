FROM python:3.13-slim

WORKDIR /app

# Install system deps for hacking tools (available in Debian trixie)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap hydra sqlmap hashcat gobuster smbmap whatweb \
    john exploitdb curl git ruby \
    && rm -rf /var/lib/apt/lists/*

# Install nikto from git
RUN git clone --depth 1 https://github.com/sullo/nikto /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto

# Install enum4linux from git
RUN git clone --depth 1 https://github.com/CiscoCXSecurity/enum4linux /opt/enum4linux && \
    ln -s /opt/enum4linux/enum4linux.pl /usr/local/bin/enum4linux

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