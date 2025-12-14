# ============================================================================
# TASKTRACK PRO - QUICK SETUP SCRIPT
# ============================================================================
# Este script automatiza los pasos iniciales para comenzar desarrollo
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TASKTRACK PRO - SETUP RÁPIDO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "[1/4] Verificando Node.js y npm..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version

if ($nodeVersion -and $npmVersion) {
    Write-Host "✅ Node.js $nodeVersion encontrado" -ForegroundColor Green
    Write-Host "✅ npm $npmVersion encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js o npm no están instalados" -ForegroundColor Red
    Write-Host "   Descarga desde: https://nodejs.org" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 2. Instalar dependencias
Write-Host "[2/4] Instalando dependencias npm..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error durante npm install" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Verificar Angular CLI
Write-Host "[3/4] Verificando Angular CLI..." -ForegroundColor Yellow
$ngVersion = npx ng version 2>&1 | Select-String "Angular CLI"

if ($ngVersion) {
    Write-Host "✅ Angular CLI disponible" -ForegroundColor Green
} else {
    Write-Host "⚠️  Angular CLI no encontrado, instalando..." -ForegroundColor Yellow
    npm install -g @angular/cli@20
}

Write-Host ""

# 4. Configuración requerida
Write-Host "[4/4] Próximos pasos de configuración..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE - Completar ANTES de ejecutar la app:" -ForegroundColor Red
Write-Host ""
Write-Host "1️⃣  CONFIGURAR FIREBASE:" -ForegroundColor Cyan
Write-Host "   ├─ Ir a: https://console.firebase.google.com" -ForegroundColor Gray
Write-Host "   ├─ Crear proyecto 'tasktrack-pro'" -ForegroundColor Gray
Write-Host "   ├─ Habilitar Email/Password authentication" -ForegroundColor Gray
Write-Host "   └─ Copiar credenciales a src/environments/environment.ts" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  CONFIGURAR API URL:" -ForegroundColor Cyan
Write-Host "   └─ Editar src/environments/environment.ts" -ForegroundColor Gray
Write-Host "      Actualizar: apiUrl = 'https://tu-api-backend.com'" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  EJECUTAR TESTS (opcional):" -ForegroundColor Cyan
Write-Host "   └─ npm run test:jest" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  INICIAR DESARROLLO:" -ForegroundColor Cyan
Write-Host "   └─ ng serve" -ForegroundColor Gray
Write-Host "      Luego abrir: http://localhost:4200" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para documentación detallada, revisar:" -ForegroundColor Yellow
Write-Host "  📖 TECHNICAL_README.md" -ForegroundColor Gray
Write-Host "  📖 ARCHITECTURE_DETAILED.md" -ForegroundColor Gray
Write-Host "  📖 NEXT_STEPS.md" -ForegroundColor Gray
