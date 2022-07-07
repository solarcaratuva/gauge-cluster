#!/bin/sh
LOGGING_DIR=/run/media/alarm/LOGGING
PREFIX=rivanna2
IFACE=can0
(cd $LOGGING_DIR && candump -L $IFACE > $(date +"$PREFIX-%Y_%m_%d_%I_%M_%p").log)
