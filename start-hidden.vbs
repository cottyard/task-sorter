' TaskSorter hidden launcher.
' Runs start.bat in a fully hidden console window.
' Used by the Windows Task Scheduler job "TaskSorter".
' Locates start.bat relative to this script, so the folder can be moved.
Option Explicit

Dim fso, sh, base
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "cmd /c """ & base & "\start.bat"" --hidden", 0, False
