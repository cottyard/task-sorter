# TaskSorter scheduled-task installer.
# Triggers: at startup, at logon, and on resume from sleep (Kernel-Power ID 107).
# Runs start-hidden.vbs so the console window stays hidden.
# This file must stay pure ASCII (Windows PowerShell 5.1 reads it with the
# system ANSI codepage; non-ASCII would corrupt parsing).

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$user = "$env:USERDOMAIN\$env:USERNAME"
$vbs = Join-Path $root 'start-hidden.vbs'
$wscriptExe = Join-Path $env:windir 'System32\wscript.exe'

if (-not (Test-Path $vbs)) { throw "start-hidden.vbs not found: $vbs" }

$action = New-ScheduledTaskAction -Execute $wscriptExe -Argument ('"' + $vbs + '"') -WorkingDirectory $root

$boot = New-ScheduledTaskTrigger -AtStartup
$boot.Delay = 'PT20S'

$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$logon.Delay = 'PT10S'

$evtClass = Get-CimClass -ClassName MSFT_TaskEventTrigger -Namespace Root/Microsoft/Windows/TaskScheduler
$evt = New-CimInstance -CimClass $evtClass -ClientOnly
$evt.Enabled = $true
$evt.Delay = 'PT10S'
$evt.Subscription = '<QueryList><Query Id="0" Path="System"><Select Path="System">*[System[Provider[@Name=''Microsoft-Windows-Kernel-Power''] and EventID=107]]</Select></Query></QueryList>'

$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -StartWhenAvailable

Register-ScheduledTask -TaskName 'TaskSorter' -Action $action -Trigger @($boot, $logon, $evt) -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "[OK] Scheduled task 'TaskSorter' installed."
Write-Host "     Triggers: startup / logon / resume-from-sleep."
Write-Host "     Action  : $wscriptExe"
Write-Host "               $vbs"
