// Areas of life, colors, repeat options and workout types. Edit freely.
(function () {
  LT.C = {
    // The starting areas. Names, colors and order can be changed in Settings; `fitness` turns on workout tracking.
    DEFAULT_AREAS: [
      { id: 'work', name: 'Work', color: 'blue', icon: 'briefcase' },
      { id: 'congregation', name: 'Congregation', color: 'purple', icon: 'users' },
      { id: 'recreation', name: 'Recreation', color: 'teal', icon: 'sun' },
      { id: 'fitness', name: 'Fitness', color: 'orange', icon: 'dumbbell', fitness: true },
    ],
    COLORS: [
      ['blue', 'Blue'], ['purple', 'Purple'], ['teal', 'Teal'], ['orange', 'Orange'],
      ['gold', 'Gold'], ['green', 'Green'], ['rose', 'Rose'], ['slate', 'Slate'],
    ],
    AREA_ICONS: ['briefcase', 'users', 'sun', 'dumbbell', 'heart', 'book', 'star', 'home'],

    REPEATS: [
      ['', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Every weekday (Mon–Fri)'], ['weekly', 'Every week'],
      ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['yearly', 'Every year'],
    ],

    // Title suggestions offered while typing, per area id.
    SUGGEST: {
      work: ['Team meeting', 'Follow up', 'Send report', 'Call', 'Deadline', '1:1'],
      congregation: ['Midweek meeting', 'Weekend meeting', 'Prepare assignment', 'Visit', 'Cleaning', 'Service'],
      recreation: ['Hike', 'Game night', 'Dinner with friends', 'Movie', 'Trip', 'Fishing'],
      fitness: ['Run', 'Gym', 'Strength', 'Walk', 'Bike ride', 'Stretch'],
    },

    WORKOUT_TYPES: ['Run', 'Walk', 'Strength', 'Bike', 'Swim', 'Sports', 'Yoga', 'Other'],
    EFFORT: [['easy', 'Easy'], ['moderate', 'Moderate'], ['hard', 'Hard']],
    DEFAULT_GOAL: { perWeek: 4, minutes: 150 },

    // Dashboard nudge when an area has nothing dated in this many days.
    QUIET_DAYS: 14,
    BACKUP_DAYS: 14,
  };
})();
