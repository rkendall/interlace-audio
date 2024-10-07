# Audio for Interlace

## Installation

Make sure yarn and node are installed. From the root run

`install` \
`yarn build`

## Running the App

run

`yarn start:both`

In the terminal you should see a message saying something like:

![alt text](image.png)

Copy the first host address and port and use these to specify the Chromatic output. This is the server that is listening for OSC messages to forward over the WebSocket to the client music application.

Running `yarn start` should also open the browser and load the Web App. You will need to configure the browser to allow audio to autoplay without user intervention. Here are the instructions for doing this in Chrome after you have launched the audio Web app:

https://championcr.com/topic/enable-auto-play/#:~:text=Mac%2C%20and%20Firefox.-,Google%20Chrome,)%E2%80%9D%20to%20%E2%80%9CAllow%E2%80%9C.

NOTE: If you can't install yarn, you might be able to use npm instead.

If you want to start the server without launching the browser, run

`yarn start`

## Configuration

You can change the settings in `src/config.js` to adjust how the audio responds to user interaction. The speed at which each hyperboloid wheel is turned, and the duration of this movement, influences the music output. These are the adjustable values:

**loudnessThreshold**: This determines how much speed and activity is required to bring brass and drums into the mix. The higher the number, the more activity required to bring in these louder instruments.
**activityResistance:**: The higher this value, the more activity (motion of the wheel) is required to affect the musical output.
**inactivityThreshold**: When the activity level (motion of the wheels) falls below this level, the user input will be considered inactive.
**speedThreshold**: Intervals between ocs signals that are longer than this value indicate slow motion in turning the wheel. Intervals <= this value indicate fast motion.
**directionAssignments**: Turning the wheel in the specified direction triggers the specified instrument groups to play
**idleTimeout**: After this many seconds of inactivity a randomly chosen audio clip will play


## How the App Works

The app listens for OSC messages with an address that begins with `/lx/modulation/Angles/`. It then parses the last character of the address to determine which hyperboloid has sent the message. The last character should be a digit with a value of 1, 2, or 3. The app assigns the low notes to Hyperboloid 1, the mid-range notes to Hyperboloid 2, and the high notes to Hyperboloid 3. The value of the OSC messages should be a number from 0 to 1. The app converts these values to numbers with the following ranges:

Hyperboloid 1: 0 - 49\
Hyperboloid 2: 50 - 99\
Hyperboloid 3: 100 - 149

Each number from 0 to 149 corresponds to a different audio clip, so each OSC message will trigger one of the audio clips.

There are 24 different compositions that are loaded by the app, corresponding to different times of day. Every hour, on the hour, the app will switch to the composition for the designated time. Here are the names of the compositions and the times of day \(using the 24-hour clock\) to which they are assigned:

```
waterDreams: 1
glassDreams: 2
ironDreams: 3
bumpsInTheNight: 4
dreamlandRushHour: 5
aubade: 6
afterCoffee: 7
treadmillToccata: 8
commuterProcessional: 9
downToBusiness: 10
reverie: 11
tableMusic: 12
danceOfTheAfternoonShadows: 13
siesta: 14
fiesta: 15
teatime: 16
rushHour: 17
tunesOnTap: 18
apollosExitAria: 19
eveningEmbers: 20
twilitBallad: 21
elegyForTheDaylight: 22
nocturne: 23
midnightBlues: 24
```