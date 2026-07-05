param(
    [string]$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$nodeExe = 'C:\Users\Ray Mark Cervantes\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pythonExe = 'C:\Users\Ray Mark Cervantes\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$bundledNodeModules = 'C:\Users\Ray Mark Cervantes\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'

$nodeModules = Join-Path $ProjectRoot 'node_modules'
$builder = Join-Path $ProjectRoot 'tools\build_organized_workbook.mjs'
$finalizer = Join-Path $ProjectRoot 'tools\finalize_organized_workbook.py'
$workbook = Join-Path $ProjectRoot 'data\processed\10124-users.organized.xlsx'

foreach ($requiredPath in @($nodeExe, $pythonExe, $bundledNodeModules, $builder, $finalizer)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required path not found: $requiredPath"
    }
}

if (-not (Test-Path -LiteralPath $nodeModules)) {
    New-Item -ItemType Junction -Path $nodeModules -Target $bundledNodeModules | Out-Null
}

Push-Location $ProjectRoot
try {
    & $nodeExe --max-old-space-size=8192 $builder
    & $pythonExe $finalizer $workbook
}
finally {
    Pop-Location
}

Write-Host "Organized workbook rebuilt: $workbook"
