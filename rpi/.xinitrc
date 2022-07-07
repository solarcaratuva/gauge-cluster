xset -dpms
xset s off
xset s noblank
#xsetroot -cursor blnk_ptr.xbm blnk_ptr.xbm.
xrdb -merge ~/.Xresources

exec ~/start_webserver.sh &
exec ~/can-websocket-bridge/target/release/can-websocket-bridge can0 &
#exec ~/log.sh &
#exec candump -L can0 /run/media/alarm/LOGGING/ &
exec ~/log.sh &
udiskie &
unclutter &
#firefox --kiosk -height 768 -width 1366 http://localhost:8000
chromium http://localhost:8000 --window-size=1366,768 --window-position=0,0 --start-fullscreen --kiosk --incognito --noerrdialogs --disable-translate --no-first-run --fast --fast-start --disable-infobars --disable-overlay-scrollbar --disable-features=TranslateUI --use-fake-ui-for-media-stream --disk-cache-dir=/dev/null --password-store=basic
#exec i3
