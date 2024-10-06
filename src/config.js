// The speed at which each hyperboloid wheel is turned, and the duration of this movement, influences the music output.
// Faster motion and longer activity results in thicker texture and longer and louder passages than slower motion and shorter activity.
const config = {
    // The speed at which each hyperboloid wheel is turned is measured by the number of changes in angle per second.
    // Speed values >= this number are considered medium speed.
    mediumActivityThreshold: 2,
    // The threshold between medium-speed and fast motion.
    fastSpeedThreshold: 3,
    // This determines how much speed and activity is required to bring brass and drums into the mix.
    // The higher the number, the more activity required to bring in these louder instruments.
    loudnessThreshold: 4,
    // The higher this value, the more activity (motion of the wheel) is required to affect the musical output.
    activityResistance: 140,
    // If the number of angle changes per second falls below this value, the input will be considered inactive
    inactivityThreshold: 5,
    preferredDurationForActivity: 'short',
    // Amount of activity required before the preferred duration for clips is applied
    durationThreshold: 3,
    // Amount of activity required before instruments are not filtered depending on the direction the wheel was initially turned
    instrumentFilterThreshold: 8,
    // Turning the wheel in the specified direction triggers the specified instrument groups to play
    directionAssignments: {
        left: ['str', 'pia', 'guitar', 'glass', 'voice'],
        right: ['win', 'per', 'tuned', 'plucked', 'pizz'],
        both: ['bra', 'drums']
    }

}

export default config