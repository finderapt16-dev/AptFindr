#!/usr/bin/env pwsh

# Project Cleanup Script - Removes Duplicates and Organizes Folders
# Run this script to complete the project reorganization

Write-Host "🧹 Starting Project Cleanup..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Get-Location
Write-Host "📍 Working directory: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Track what we're doing
$itemsRemoved = 0
$itemsMoved = 0

# 1. Remove duplicate component files
Write-Host "❌ Removing duplicate component files..." -ForegroundColor Yellow
$duplicateFiles = @(
    "src/app/components/ApartmentCard.tsx",
    "src/app/components/Chatbot.tsx",
    "src/app/components/EditApartmentDialog.tsx",
    "src/app/components/FilterBar.tsx",
    "src/app/components/Header.tsx",
    "src/app/components/LocationPicker.tsx",
    "src/app/components/MapView.tsx"
)

foreach ($file in $duplicateFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "   ✓ Deleted: $file"
        $itemsRemoved++
    }
}

Write-Host ""

# 2. Remove empty src/imports folder
Write-Host "📁 Removing empty src/imports folder..." -ForegroundColor Yellow
if (Test-Path "src/imports") {
    if ((Get-ChildItem -Path "src/imports" -Recurse | Measure-Object).Count -eq 0) {
        Remove-Item -Path "src/imports" -Force -Recurse
        Write-Host "   ✓ Deleted: src/imports"
        $itemsRemoved++
    } else {
        Write-Host "   ⚠ src/imports contains files - skipping removal" -ForegroundColor Gray
    }
}

Write-Host ""

# 3. Move images to public/images (if they still exist in src/imports)
Write-Host "🖼️  Moving images to public/images..." -ForegroundColor Yellow
if (Test-Path "src/imports") {
    $images = Get-ChildItem -Path "src/imports" -File -ErrorAction SilentlyContinue
    if ($images) {
        foreach ($image in $images) {
            Move-Item -Path $image.FullName -Destination "public/images/$($image.Name)" -Force
            Write-Host "   ✓ Moved: $($image.Name) → public/images/"
            $itemsMoved++
        }
    }
}

Write-Host ""

# 4. Move documentation files
Write-Host "📚 Moving documentation files to docs/..." -ForegroundColor Yellow
$docFiles = @(
    "ATTRIBUTIONS.md",
    "auth_testing_guide.md",
    "COLOR_AND_ANIMATION_UPDATE.md",
    "FINAL_STATUS_REPORT.md",
    "LANDLORD_VERIFICATION_SYSTEM.md",
    "NAVIGATION_AUDIT.md",
    "RESPONSIVE_DESIGN_AUDIT.md",
    "ROLE_SPECIFIC_SETTINGS.md"
)

foreach ($file in $docFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs/$file" -Force
        Write-Host "   ✓ Moved: $file → docs/"
        $itemsMoved++
    }
}

Write-Host ""

# Summary
Write-Host "✨ Cleanup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Items Removed: $itemsRemoved"
Write-Host "   Items Moved:   $itemsMoved"
Write-Host ""
Write-Host "📋 New Project Structure:" -ForegroundColor Green
Write-Host "   ✓ Duplicate components removed"
Write-Host "   ✓ Images organized in public/images/"
Write-Host "   ✓ Documentation organized in docs/"
Write-Host "   ✓ Component folders: common/, features/, figma/, ui/"
Write-Host ""
Write-Host "🚀 Your project is now organized!" -ForegroundColor Green
