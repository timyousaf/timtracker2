/**
 * Mapping from HealthKit workout activity types to our canonical workout types.
 */

/**
 * Numeric HKWorkoutActivityType values from Apple HealthKit
 * https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype
 */
const WORKOUT_TYPE_BY_NUMBER: Record<number, string> = {
  1: 'American Football',
  2: 'Archery',
  3: 'Australian Football',
  4: 'Badminton',
  5: 'Baseball',
  6: 'Basketball',
  7: 'Bowling',
  8: 'Boxing',
  9: 'Climbing',
  10: 'Cricket',
  11: 'Cross Training',
  12: 'Curling',
  13: 'Cycling',
  14: 'Dance',
  16: 'Elliptical',
  17: 'Equestrian Sports',
  18: 'Fencing',
  19: 'Fishing',
  20: 'Functional Strength Training',
  21: 'Golf',
  22: 'Gymnastics',
  23: 'Handball',
  24: 'Hiking',
  25: 'Hockey',
  26: 'Hunting',
  27: 'Lacrosse',
  28: 'Martial Arts',
  29: 'Mind and Body',
  30: 'Mixed Metabolic Cardio',
  31: 'Paddle Sports',
  32: 'Play',
  33: 'Preparation and Recovery',
  34: 'Racquetball',
  35: 'Rowing',
  36: 'Rugby',
  37: 'Running',
  38: 'Sailing',
  39: 'Skating Sports',
  40: 'Snow Sports',
  41: 'Soccer',
  42: 'Softball',
  43: 'Squash',
  44: 'Stair Climbing',
  45: 'Surfing Sports',
  46: 'Swimming',
  47: 'Table Tennis',
  48: 'Tennis',
  49: 'Track and Field',
  50: 'Strength Training',
  51: 'Volleyball',
  52: 'Walking',
  53: 'Water Fitness',
  54: 'Water Polo',
  55: 'Water Sports',
  56: 'Wrestling',
  57: 'Yoga',
  58: 'Barre',
  59: 'Core Training',
  60: 'Cross Country Skiing',
  61: 'Downhill Skiing',
  62: 'Flexibility',
  63: 'HIIT',
  64: 'Jump Rope',
  65: 'Kickboxing',
  66: 'Pilates',
  67: 'Snowboarding',
  68: 'Stairs',
  69: 'Step Training',
  70: 'Wheelchair Walk Pace',
  71: 'Wheelchair Run Pace',
  72: 'Tai Chi',
  73: 'Mixed Cardio',
  74: 'Hand Cycling',
  75: 'Disc Sports',
  76: 'Fitness Gaming',
  77: 'Cardio Dance',
  78: 'Social Dance',
  79: 'Pickleball',
  80: 'Cooldown',
  82: 'Swim Bike Run',
  83: 'Transition',
  84: 'Underwater Diving',
  3000: 'Other',
};

/**
 * Map HealthKit workout activity type to our display name
 * 
 * The library may return workout types as numbers or strings
 */
export function getWorkoutTypeName(healthkitType: string | number): string {
  // Handle numeric type IDs from HealthKit
  const numericType = typeof healthkitType === 'number' 
    ? healthkitType 
    : parseInt(healthkitType, 10);
  
  if (!isNaN(numericType) && WORKOUT_TYPE_BY_NUMBER[numericType]) {
    return WORKOUT_TYPE_BY_NUMBER[numericType];
  }
  
  // Fall back to string mapping for named types
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

  // Try string mapping
  const stringType = String(healthkitType);
  if (typeMap[stringType]) {
    return typeMap[stringType];
  }
  
  // Last resort: format the type or return as-is
  return formatWorkoutType(stringType);
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
