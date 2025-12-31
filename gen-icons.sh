#!/bin/sh

magick -background none -density 600 MSVG:assets/omnibox.svg -resize 48x48 dist/icon_48.png
magick -background none -density 600 MSVG:assets/omnibox.svg -resize 128x128 dist/icon_128.png
