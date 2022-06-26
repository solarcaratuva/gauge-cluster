#
# ~/.bash_profile
#

[[ -f ~/.bashrc ]] && . ~/.bashrc

[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && tvservice -e "DMT 81 HDMI" && fbset -xres 1366 -yres 768 && startx -- -nocursor

