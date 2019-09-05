REM Node mode
start cmd /c "D:\Programmes\nodejs\nodevars.bat & pug src/pug --out lib/html --watch"
start cmd /c "D:\Programmes\nodejs\nodevars.bat & stylus src/styl -o lib/css --watch"