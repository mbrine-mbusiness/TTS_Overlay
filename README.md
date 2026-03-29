# TTS Overlay
## The Overlay
Automatically uses Windows TTS to read Twitch chat messages. Voices are "seeded" using the user's name color.
## Installation
1. Rename the file to your twitch channel's name (Not case-sensitive) followed by `.html`
```
MousePrower.html
```
2. Add the file as a browser source in your streaming software
## Commands
`$toggle` toggles the TTS on/off. Default state is on when refreshing the overlay.
```
$toggle
```
`$ignore`/`$ign` ignores the last user whose name is entered. Not case-sensitive.
```
$ignore MousePrower
```
`$cignore`/`$cign` Un-ignores the last user to be ignored.
```
$cignore
```
`$refresh`/`$rf` Refreshes the TTS overlay.
```
$refresh
```
`$debugvoices` Reads the rest of the command using all available voices in the TTS overlay.
```
$debugvoices This is a test message.
```

## Known Issues
+ There seems to be a bug where the first message gets skipped due to no voices being available, likely will have TTS say a blank message on startup if I can't find a way to fix this.

## Things I might add in the future
+ A "whoosh" or "ping" sound when a message is received, obviously that would mean I can't contain everything in 1 file (unless I use an audio source from online? hmm...)
