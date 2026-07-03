FROM python:3.13-slim

WORKDIR /app

# Install system deps for hacking tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap hydra sqlmap hashcat gobuster smbmap whatweb ffuf \
    john curl git ruby ruby-dev build-essential wget \
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

# ── Wordlists ────────────────────────────────────────────────────
RUN mkdir -p /usr/share/wordlists/dirb

# Small dirb wordlist for ffuf/gobuster (always succeeds)
RUN wget -q -O /usr/share/wordlists/dirb/common.txt \
    https://raw.githubusercontent.com/daviddias/node-dirbuster/master/lists/directory-list-2.3-small.txt \
    || printf "admin\nlogin\nwp-admin\napi\nbackup\ntest\ndev\nstaging\nconfig\n.git\n.env\n.htaccess\nrobots.txt" > /usr/share/wordlists/dirb/common.txt

# Rockyou — try compressed first (faster download), fall back to uncompressed
RUN wget -q -O /tmp/rockyou.txt.gz \
    https://github.com/praetorian-inc/Hob0Rules/raw/master/wordlists/rockyou.txt.gz \
    && gunzip /tmp/rockyou.txt.gz \
    && mv /tmp/rockyou.txt /usr/share/wordlists/rockyou.txt \
    || wget -q https://github.com/brannondorsey/naive-hashcat/releases/download/data/rockyou.txt \
    -O /usr/share/wordlists/rockyou.txt \
    || true

# Ensure we have something usable
RUN if [ ! -s /usr/share/wordlists/rockyou.txt ]; then \
      echo -e "password\n123456\n12345678\n123456789\npassword1\niloveyou\nprincess\nrockyou\nabc123\nnicole\ndaniel\nbabygirl\nmonkey\nlovely\nmichael\nashley\nqwerty\n111111\niloveu\n000000\nmichelle\ntigger\nsunshine\nchocolate\npassword123\nsoccer\nanthony\nfriends\nbutterfly\npurple\nangel\njordan\nliverpool\njustin\nloveme\nfuckyou\nhunter\nranger\nbuster\nsnoopy\nbatman\nthomas\naustin\npepper\nsummer\njessica\n123123\nshadow\njoshua\nandrea\nhannah\nmatthew\nrobert\njennifer\ncookie\nbanana\norange\napple\nstrawberry\ncoffee\ndragon\nmaster\nshadow\nthunder\nlightning\nchelsea\nsuperman\nspiderman\nharley\nmustang\ncorvette\nferrari\nmercedes\ncowboy\nranger\npepper\nnicole\nashley\njessica\namanda\njennifer\nmichelle\nstephanie\nmelissa\nsamantha\nsarah\nmegan\nlauren\nrachel\nkatherine\nemily\nhannah\nmadison\naustin\ntaylor\njordan\nmorgan\nbailey\nriley\nsydney\npayton\nkelsey\nalexis\nbrooke\nhaley\nmarissa\nkaitlyn\nsavannah\nolivia\nabigail\nisabella\nemma\nava\nmia\ncharlotte\namelia\nharper\nevelyn\nabigail\nemily\nelizabeth\nsofia\navery\nella\nscarlett\ngrace\nchloe\nvictoria\nriley\naria\nlily\nzoey\nlayla\nstella\nhazel\nellie\naurora\nnova\nluna\nsavannah\nbrooklyn\nbella\nclaire\nskylar\nlucy\npaisley\neverly\nanna\ncaroline\ngenesis\naaliyah\nkennedy\nkinsley\nallison\nmaya\nsarah\nmadelyn\nadeline\nalexa\nariana\nelena\nnaomi\nvalentina\njade\nleah\nalice\nruby" > /usr/share/wordlists/rockyou.txt; fi

RUN chmod 644 /usr/share/wordlists/rockyou.txt && \
    echo "Wordlist dir:" && ls -lh /usr/share/wordlists/ && \
    echo "Rockyou lines: $$(wc -l < /usr/share/wordlists/rockyou.txt)"

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir impacket responder

# Copy source (includes pre-built dist/)
COPY . .

# Expose port
EXPOSE 8000

# Start the server
CMD ["uvicorn", "src.c2_server.app:app", "--host", "0.0.0.0", "--port", "8000"]