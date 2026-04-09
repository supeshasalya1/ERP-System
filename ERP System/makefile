.PHONY: deploy client-deploy db-init server help all install-and-build

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)Available commands:$(NC)"
	@echo "  $(GREEN)make install-and-build$(NC) - Install deps and build if no build folder"
	@echo "  $(GREEN)make deploy$(NC)            - Start all services (deploy, db, server)"
	@echo "  $(GREEN)make client-deploy$(NC)     - Start client deploy only"
	@echo "  $(GREEN)make db-init$(NC)           - Initialize SQLite database only"
	@echo "  $(GREEN)make server$(NC)            - Start server only"
	@echo "  $(GREEN)make all$(NC)               - Run all services together"

# Install dependencies and build if build folder doesn't exist
install-and-build:
	@echo "$(BLUE)Checking client dependencies...$(NC)"
	@if [ ! -d "client/node_modules" ]; then \
		echo "$(YELLOW)Installing client dependencies...$(NC)"; \
		cd client && npm install && cd ..; \
	else \
		echo "$(GREEN)Client dependencies already installed$(NC)"; \
	fi
	@echo "$(BLUE)Checking if build folder exists...$(NC)"
	@if [ ! -d "client/build" ]; then \
		echo "$(YELLOW)Building client...$(NC)"; \
		cd client && npm run build && cd ..; \
	else \
		echo "$(GREEN)Build folder already exists$(NC)"; \
	fi
	@echo "$(GREEN)Setup complete!$(NC)"

# Run client deployment
client-deploy:
	@echo "$(BLUE)Starting client deploy...$(NC)"
	nodemon client/delpoy.js

# Initialize database
db-init:
	@echo "$(BLUE)Initializing SQLite database...$(NC)"
	nodemon server/src/init-sqlite.js

# Run server
server:
	@echo "$(BLUE)Starting server...$(NC)"
	nodemon server/src/app.js

# Run all three services (default)
deploy: client-deploy db-init server

# Alternative: Run all in parallel (requires GNU Make 4.0+)
all:
	@echo "$(BLUE)Starting all services...$(NC)"
	@echo "$(GREEN)Client Deploy:$(NC)"
	nodemon client/delpoy.js &
	@echo "$(GREEN)Database Init:$(NC)"
	nodemon server/src/init-sqlite.js &
	@echo "$(GREEN)Server:$(NC)"
	nodemon server/src/app.js