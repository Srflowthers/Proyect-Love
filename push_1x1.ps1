$commits = Get-Content "commits.json" -Encoding UTF8 | ConvertFrom-Json

foreach ($commit in $commits) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Agregando archivo: $($commit.archivo)" -ForegroundColor Yellow
    git add $commit.archivo
    
    # Check if there are changes to commit for this file
    $status = git status --porcelain $commit.archivo
    if ($status) {
        Write-Host "Commiteando con mensaje: $($commit.mensaje)" -ForegroundColor Yellow
        git commit -m $commit.mensaje
        Write-Host "Haciendo push..." -ForegroundColor Yellow
        git push
        Write-Host "✅ $($commit.archivo) pusheado con éxito." -ForegroundColor Green
    } else {
        Write-Host "⚠️ No hay cambios pendientes en $($commit.archivo), saltando." -ForegroundColor DarkGray
    }
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 ¡Todos los commits individuales han sido procesados!" -ForegroundColor Green
