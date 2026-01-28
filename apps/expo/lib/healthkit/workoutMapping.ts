/**
 * Mapping from HealthKit workout activity types to our canonical workout types.
 */

/**
 * Map HealthKit workout activity type to our display name
 * 
 * The library returns workout types as strings like 'running', 'cycling', etc.
 * We want to store them with proper casing like "Running", "Cycling"
 */
export function getWorkoutTypeName(healthkitType: string): string {
  // Common workout types - add more as needed
  const typeMap: Record<string, string> = {
    americanFootball: 'American Football',
    archery: 'Archery',
    australianFootball: 'Australian Football',
    badminton: 'Badminton',
    baseball: 'Baseball',
    basketball: 'Basketball',
    bowling: 'Bowling',
    boxing: 'Boxing',
    climbing: 'Climbing',
    cricket: 'Cricket',
    crossTraining: 'Cross Training',
    curling: 'Curling',
    cycling: 'Cycling',
    dance: 'Dance',
    elliptical: 'Elliptical',
    equestrianSports: 'Equestrian Sports',
    fencing: 'Fencing',
    fishing: 'Fishing',
    functionalStrengthTraining: 'Functional Strength Training',
    golf: 'Golf',
    gymnastics: 'Gymnastics',
    handball: 'Handball',
    hiking: 'Hiking',
    hockey: 'Hockey',
    hunting: 'Hunting',
    lacrosse: 'Lacrosse',
    martialArts: 'Martial Arts',
    mindAndBody: 'Mind and Body',
    mixedCardio: 'Mixed Cardio',
    paddleSports: 'Paddle Sports',
    play: 'Play',
    preparationAndRecovery: 'Preparation and Recovery',
    racquetball: 'Racquetball',
    rowing: 'Rowing',
    rugby: 'Rugby',
    running: 'Running',
    sailing: 'Sailing',
    skatingSports: 'Skating Sports',
    snowSports: 'Snow Sports',
    soccer: 'Soccer',
    softball: 'Softball',
    squash: 'Squash',
    stairClimbing: 'Stair Climbing',
    surfingSports: 'Surfing Sports',
    swimming: 'Swimming',
    tableTennis: 'Table Tennis',
    tennis: 'Tennis',
    trackAndField: 'Track and Field',
    traditionalStrengthTraining: 'Strength Training',
    volleyball: 'Volleyball',
    walking: 'Walking',
    waterFitness: 'Water Fitness',
    waterPolo: 'Water Polo',
    waterSports: 'Water Sports',
    wrestling: 'Wrestling',
    yoga: 'Yoga',
    barre: 'Barre',
    coreTraining: 'Core Training',
    crossCountrySkiing: 'Cross Country Skiing',
    downhillSkiing: 'Downhill Skiing',
    flexibility: 'Flexibility',
    highIntensityIntervalTraining: 'HIIT',
    jumpRope: 'Jump Rope',
    kickboxing: 'Kickboxing',
    pilates: 'Pilates',
    snowboarding: 'Snowboarding',
    stairs: 'Stairs',
    stepTraining: 'Step Training',
    wheelchairWalkPace: 'Wheelchair Walk Pace',
    wheelchairRunPace: 'Wheelchair Run Pace',
    taiChi: 'Tai Chi',
    mixedMetabolicCardioTraining: 'Mixed Metabolic Cardio',
    handCycling: 'Hand Cycling',
    discSports: 'Disc Sports',
    fitnessGaming: 'Fitness Gaming',
    cardioDance: 'Cardio Dance',
    socialDance: 'Social Dance',
    pickleball: 'Pickleball',
    cooldown: 'Cooldown',
    swimBikeRun: 'Swim Bike Run',
    transition: 'Transition',
    underwaterDiving: 'Underwater Diving',
    other: 'Other',
  };

  return typeMap[healthkitType] || formatWorkoutType(healthkitType);
}

/**
 * Format a workout type string if not in our map
 * e.g., "traditionalStrengthTraining" -> "Traditional Strength Training"
 */
function formatWorkoutType(type: string): string {
  // Convert camelCase to Title Case with spaces
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Workout metric keys we extract from workout statistics
 */
export const WORKOUT_METRIC_KEYS = [
  'Distance (mi)',
  'Total Energy (kcal)',
  'Active Energy (kcal)',
  'Avg Heart Rate (bpm)',
  'Max Heart Rate (bpm)',
  'Avg Speed(mi/hr)',
  'Max Speed(mi/hr)',
  'Step Count (count)',
  'Swimming Strokes Count (count)',
  'Elevation Ascended (m)',
  'Elevation Descended (m)',
] as const;

export type WorkoutMetricKey = (typeof WORKOUT_METRIC_KEYS)[number];
