# Run this script as Administrator once to set up the flash sale monitor cron job.
# It polls /api/cron/monitor every 5 minutes while the dev server is running.

$taskName = "PokemonCronMonitor"
$secret   = "dev-cron-secret"
$url      = "http://localhost:3000/api/cron/monitor"

$psArgs = "-NonInteractive -WindowStyle Hidden -Command `"" +
  "try { Invoke-WebRequest -Uri '$url' -Method GET " +
  "-Headers @{Authorization='Bearer $secret'} -UseBasicParsing | Out-Null } " +
  "catch { }`""

$action   = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $psArgs
$trigger  = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)
$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName   $taskName `
  -Action     $action `
  -Trigger    $trigger `
  -Settings   $settings `
  -Description "Pokemon Profit Intel — flash sale monitor every 5 min" `
  -RunLevel   Highest `
  -Force

Write-Host "Task '$taskName' registered. Run 'schtasks /run /tn $taskName' to test it." -ForegroundColor Green
