#!/usr/bin/osascript

delay 3

tell application "System Events"
	set frontApp to name of first application process whose frontmost is true
end tell

tell application frontApp
	-- Format: {Left, Top, Right, Bottom}
	-- This sets the window to 1280 width x 800 height, starting at top-left (0,0)
	set bounds of front window to {0, 0, 1280 - 112, 800 - 112}
end tell
