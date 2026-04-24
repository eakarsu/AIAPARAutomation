#!/bin/bash

# ============================================
# AI AP/AR Automation - Start Script
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════╗"
echo "║     AI AP/AR Automation Platform         ║"
echo "║     Starting Application...              ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one.${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# ============================================
# Clean up used ports
# ============================================
echo -e "\n${YELLOW}→ Cleaning up ports...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  ${YELLOW}Killing processes on port $port (PIDs: $pids)${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  echo -e "  ${GREEN}✓ Port $port is free${NC}"
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ============================================
# Check PostgreSQL
# ============================================
echo -e "\n${YELLOW}→ Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}✓ PostgreSQL is running${NC}"
  else
    echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
    if pg_isready -q 2>/dev/null; then
      echo -e "  ${GREEN}✓ PostgreSQL started${NC}"
    else
      echo -e "  ${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
      exit 1
    fi
  fi
else
  echo -e "  ${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# ============================================
# Create database if not exists
# ============================================
echo -e "\n${YELLOW}→ Setting up database...${NC}"

DB_NAME="apar_automation"
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "  ${GREEN}✓ Database '$DB_NAME' exists${NC}"
else
  echo -e "  ${CYAN}Creating database '$DB_NAME'...${NC}"
  createdb "$DB_NAME" 2>/dev/null || psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
  echo -e "  ${GREEN}✓ Database created${NC}"
fi

# ============================================
# Install backend dependencies
# ============================================
echo -e "\n${YELLOW}→ Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "  ${GREEN}✓ Backend dependencies installed${NC}"

# ============================================
# Install frontend dependencies
# ============================================
echo -e "\n${YELLOW}→ Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "  ${GREEN}✓ Frontend dependencies installed${NC}"

# ============================================
# Seed database
# ============================================
echo -e "\n${YELLOW}→ Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node db/seed.js
echo -e "  ${GREEN}✓ Database seeded with sample data${NC}"

# ============================================
# Start backend with hot reload (nodemon)
# ============================================
echo -e "\n${YELLOW}→ Starting backend server (port $BACKEND_PORT)...${NC}"
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
echo -e "  ${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

sleep 2

# ============================================
# Start frontend with hot reload (Vite)
# ============================================
echo -e "\n${YELLOW}→ Starting frontend (port $FRONTEND_PORT)...${NC}"
cd "$PROJECT_DIR/frontend"
npx vite --host &
FRONTEND_PID=$!
echo -e "  ${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

sleep 3

# ============================================
# Summary
# ============================================
echo -e "\n${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC}  ${GREEN}Application is running!${NC}                 ${PURPLE}║${NC}"
echo -e "${PURPLE}╠══════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC}                                          ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${CYAN}Frontend:${NC}  http://localhost:$FRONTEND_PORT      ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${CYAN}Backend:${NC}   http://localhost:$BACKEND_PORT       ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                          ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}Demo Login:${NC}                              ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  Email:    demo@apar.com                 ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  Password: demo123                       ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                          ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${YELLOW}Features:${NC}                                ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  • Invoice Matching (AI)                 ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  • Payment Reconciliation (AI)           ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  • Dunning Optimization (AI)             ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  • Cash Application (AI)                 ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  • Discount Capture (AI)                 ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  • Aging Analysis (AI)                   ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}                                          ${PURPLE}║${NC}"
echo -e "${PURPLE}║${NC}  ${RED}Press Ctrl+C to stop${NC}                    ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"

# Handle shutdown
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo -e "${GREEN}✓ Application stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
