# PowerShell script to move VSCode user data from C: to D: drive
# Run this script as Administrator

Write-Host "Moving VSCode User Data to D: Drive" -ForegroundColor Green

# Step 1: Close VSCode completely first!
Write-Host "IMPORTANT: Make sure VSCode is completely closed before running this!" -ForegroundColor Red
Read-Host "Press Enter when VSCode is closed"

# Define paths
$sourceDir = "C:\Users\scole\AppData\Roaming\Code"
$targetDir = "D:\VSCode-Data"

# Step 2: Create target directory
Write-Host "Creating target directory: $targetDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $targetDir -Force

# Step 3: Copy all data to D: drive
Write-Host "Copying VSCode data to D: drive..." -ForegroundColor Yellow
robocopy $sourceDir $targetDir /E /COPYALL /R:3 /W:5

# Step 4: Rename original directory as backup
Write-Host "Creating backup of original directory..." -ForegroundColor Yellow
Rename-Item $sourceDir "$sourceDir.backup"

# Step 5: Create junction point to redirect to D: drive
Write-Host "Creating junction point to redirect to D: drive..." -ForegroundColor Yellow
New-Item -ItemType Junction -Path $sourceDir -Target $targetDir

Write-Host "VSCode data successfully moved to D: drive!" -ForegroundColor Green
Write-Host "Original data backed up to: $sourceDir.backup" -ForegroundColor Cyan
Write-Host "You can now start VSCode - it will use the D: drive location" -ForegroundColor Green
