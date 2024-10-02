// The speed at which each hyperboloid wheel is turned, and the duration of this movement, influences the music output.
// Faster motion and longer activity results in thicker texture and longer and louder passages than slower motion and shorter activity.
const config = {
    // This determines how much speed and activity is required to bring brass and drums into the mix.
    // The higher the number, the more activity required to bring in these louder instruments.
    loudnessThreshold: 4,
    // The higher this value, the more activity (motion of the wheel) is required to affect the musical output.
    activityResistance: 140,
    // This metric denotes the quantity of angle changes. If it falls below the specified value, the input will be considered inactive
    inactivityThreshold: 5,
    // Intervals between ocs signals that are longer than this value
    // indicate slow motion in turning the wheel. Intervals <= this value indicate fast motion.
    speedThreshold: 40,
    // Turning the wheel in the specified direction triggers the specified instrument groups to play
    directionAssignments: {
        left: ['str', 'pia', 'guitar', 'glass', 'voice'],
        right: ['win', 'per', 'tuned', 'plucked', 'pizz'],
        both: ['bra', 'drums'],
    },
    // After this many seconds of inactivity a randomly chosen audio clip will play
    idleTimeout: 20
}

export default config
