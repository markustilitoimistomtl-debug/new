; TabRec – Win+J twice = quick MP4 recording in Chrome or Edge
; Requires AutoHotkey v2 (https://www.autohotkey.com).
;
; Windows never passes Win-key shortcuts to the browser, so this script turns
; every Win+J into Alt+Shift+J, TabRec's quick-record shortcut. Pressing Win+J
; twice in a row (within 0.8 s) starts recording the active tab as MP4; twice
; again stops and saves it as Downloads\TabRec\hotkeyMMSS.mp4.
;
; If the browser is not the active window, the most recent Chrome or Edge
; window is brought to the front first.

#Requires AutoHotkey v2.0
#SingleInstance Force

GroupAdd "TabRecBrowsers", "ahk_exe chrome.exe"
GroupAdd "TabRecBrowsers", "ahk_exe msedge.exe"

#j::
{
    if !WinActive("ahk_group TabRecBrowsers") {
        if !WinExist("ahk_group TabRecBrowsers")
            return
        WinActivate
        WinWaitActive "ahk_group TabRecBrowsers", , 1
    }
    Send "!+j"
}
