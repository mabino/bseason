#!/bin/zsh

# ─── B-Season Container & Environment Manager ───

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

function show_help() {
  echo "${CYAN}🧸 B-Season — Container & Environment Manager${NC}"
  echo "================================================="
  echo "Usage: ./scripts/test-local.sh [command]"
  echo ""
  echo "Commands:"
  echo "  dev       Start containerized development environment with hot-reloading (Port 3030)"
  echo "  test      Run automated tests inside a containerized testing stage"
  echo "  prod      Build and spin up the optimized production container (Internal Port 8080)"
  echo "  down      Shut down all active B-Season containers"
  echo "  help      Show this help menu"
  echo "-------------------------------------------------"
}

if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

COMMAND=$1

case "$COMMAND" in
  dev)
    echo "${YELLOW}Starting B-Season in containerized DEVELOPMENT environment...${NC}"
    echo "${CYAN}Mounting source directory for active hot-reloading.${NC}"
    docker-compose -f docker-compose.dev.yml up --build
    ;;
  
  test)
    echo "${YELLOW}Building and running containerized TEST environment...${NC}"
    # Run tests using the testing target in docker-compose.test.yml
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
    TEST_EXIT_CODE=$?
    
    # Tear down test containers
    docker-compose -f docker-compose.test.yml down -v
    
    if [ $TEST_EXIT_CODE -eq 0 ]; then
      echo "${GREEN}✓ Containerized tests PASSED successfully!${NC}"
      exit 0
    else
      echo "${RED}✗ Containerized tests FAILED.${NC}"
      exit 1
    fi
    ;;
    
  prod)
    echo "${YELLOW}Starting B-Season in containerized PRODUCTION environment...${NC}"
    echo "${CYAN}Conforms to homelab apps_net and ommits local port mappings.${NC}"
    # Ensure network exists
    docker network create apps_net 2>/dev/null || true
    docker-compose up --build -d
    if [ $? -eq 0 ]; then
      echo "${GREEN}✓ Production container successfully launched in the background!${NC}"
      echo "${CYAN}Ingress is managed via proxy attached to apps_net.${NC}"
    else
      echo "${RED}✗ Failed to launch production container.${NC}"
    fi
    ;;
    
  down)
    echo "${YELLOW}Stopping all B-Season containers...${NC}"
    docker-compose -f docker-compose.dev.yml down -v 2>/dev/null
    docker-compose -f docker-compose.test.yml down -v 2>/dev/null
    docker-compose down -v 2>/dev/null
    echo "${GREEN}✓ Containers stopped and networks cleaned.${NC}"
    ;;
    
  help|*)
    show_help
    ;;
esac
