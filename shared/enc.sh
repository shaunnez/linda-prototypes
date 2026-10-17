#!/bin/sh
f=$1; id=$(basename $f .mp4)
ffmpeg -v error -y -i $f -an -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 27 -preset medium -pix_fmt yuv420p -movflags +faststart video/$id.mp4
ffmpeg -v error -y -i $f -an -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 26 -g 1 -preset medium -pix_fmt yuv420p -movflags +faststart scrub/$id.mp4
ffmpeg -v error -y -i $f -an -t 8 -vf "crop=ih*9/16:ih,scale=540:960,fps=30" -c:v libx264 -crf 28 -preset medium -pix_fmt yuv420p -movflags +faststart vertical/$id.mp4
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)
for p in 15 40 65 90; do t=$(python3 -c "print($d*$p/100)"); ffmpeg -v error -y -ss $t -i $f -frames:v 1 -vf scale=1920:-2 -q:v 3 img/${id}-$p.jpg; ffmpeg -v error -y -ss $t -i $f -frames:v 1 -vf scale=640:-2 -q:v 4 thumb/${id}-$p.jpg; done
echo done $id
