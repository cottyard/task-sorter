# TaskSorter scheduled-task uninstaller. Pure ASCII.

$ErrorActionPreference = 'Stop'

$t = Get-ScheduledTask -TaskName 'TaskSorter' -ErrorAction SilentlyContinue
if ($t) {
    Unregister-ScheduledTask -TaskName 'TaskSorter' -Confirm:$false
    Write-Host "[OK] Scheduled task 'TaskSorter' removed."
} else {
    Write-Host "[INFO] Scheduled task 'TaskSorter' not found."
}
