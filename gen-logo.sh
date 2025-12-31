#!/bin/sh

magick -background none -density 600 MSVG:assets/omnibox.svg -resize 16x16 assets/icon_16.png
magick -background none -density 600 MSVG:assets/omnibox.svg -resize 24x24 assets/icon_24.png
magick -background none -density 600 MSVG:assets/omnibox.svg -resize 48x48 assets/icon_48.png
magick -background none -density 600 MSVG:assets/omnibox.svg -resize 128x128 assets/icon_128.png
