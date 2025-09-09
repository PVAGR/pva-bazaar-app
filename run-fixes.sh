#!/bin/bash

# PVA Bazaar App - Staged Fix & Test Script

echo "🔧 PVA Bazaar App - Staged Fix & Test Script"
echo "============================================"
echo ""
echo "This script will run each fix stage one by one, allowing you to"
echo "verify and commit changes at each step."
echo ""
echo "Available stages:"
echo "1. Fix case-sensitivity imports"
echo "2. Ensure environment setup"
echo "3. Test backend connectivity"
echo "4. Test frontend-backend connection"
echo "5. Final integration test"
echo ""
echo "Note: After each stage, you'll need to commit the changes before"
echo "proceeding to the next stage."
echo ""

# Make all scripts executable
chmod +x /workspaces/pva-bazaar-app/scripts/stage*.sh

# Function to run a specific stage
run_stage() {
  local stage=$1
  echo "📋 Running Stage $stage..."
  /workspaces/pva-bazaar-app/scripts/stage$stage-*.sh
  
  echo ""
  echo "Stage $stage completed. Would you like to:"
  echo "1. Commit changes and continue to next stage"
  echo "2. Skip commit and continue to next stage"
  echo "3. Abort and exit"
  read -p "Enter your choice (1-3): " choice
  
  case $choice in
    1)
      # Get commit message from script file
      commit_msg=$(grep "git commit -m" /workspaces/pva-bazaar-app/scripts/stage$stage-*.sh | head -1 | cut -d"'" -f2)
      git add -A && git commit -m "$commit_msg"
      return 0
      ;;
    2)
      echo "Skipping commit, continuing to next stage..."
      return 0
      ;;
    3)
      echo "Aborting script."
      return 1
      ;;
    *)
      echo "Invalid choice. Aborting."
      return 1
      ;;
  esac
}

# Main execution
echo "Starting staged fix process..."
read -p "Press Enter to begin..."

for stage in {1..5}; do
  if ! run_stage $stage; then
    echo "Process aborted at stage $stage."
    exit 1
  fi
  
  if [ $stage -lt 5 ]; then
    echo ""
    echo "Stage $stage complete. Proceed to stage $((stage+1))?"
    read -p "Press Enter to continue or Ctrl+C to exit..."
  fi
done

echo "🎉 All stages completed successfully!"
echo "The PVA Bazaar App should now be fully operational."
