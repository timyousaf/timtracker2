/**
 * Unit conversion utilities for HealthKit data.
 * 
 * HealthKit may return data in different units than what we store.
 * These functions help normalize values to our canonical units.
 */

/**
 * Convert kilograms to pounds
 */
export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert pounds to kilograms
 */
export function lbToKg(lb: number): number {
  return lb / 2.20462;
}

/**
 * Convert meters to miles
 */
export function mToMi(meters: number): number {
  return meters / 1609.344;
}

/**
 * Convert miles to meters
 */
export function miToM(miles: number): number {
  return miles * 1609.344;
}

/**
 * Convert centimeters to inches
 */
export function cmToIn(cm: number): number {
  return cm / 2.54;
}

/**
 * Convert inches to centimeters
 */
export function inToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert meters per second to miles per hour
 */
export function msToMph(ms: number): number {
  return ms * 2.23694;
}

/**
 * Convert kilometers to miles
 */
export function kmToMi(km: number): number {
  return km * 0.621371;
}

/**
 * Convert seconds to minutes
 */
export function secToMin(seconds: number): number {
  return seconds / 60;
}

/**
 * Convert seconds to hours
 */
export function secToHr(seconds: number): number {
  return seconds / 3600;
}

/**
 * Convert milliseconds to hours
 */
export function msToHr(ms: number): number {
  return ms / 3600000;
}

/**
 * Convert joules to kilocalories
 */
export function jToKcal(joules: number): number {
  return joules / 4184;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Convert a value from one unit to another based on unit strings
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number {
  if (fromUnit === toUnit) return value;

  // Weight
  if (fromUnit === 'kg' && toUnit === 'lb') return kgToLb(value);
  if (fromUnit === 'lb' && toUnit === 'kg') return lbToKg(value);

  // Distance
  if (fromUnit === 'm' && toUnit === 'mi') return mToMi(value);
  if (fromUnit === 'mi' && toUnit === 'm') return miToM(value);
  if (fromUnit === 'km' && toUnit === 'mi') return kmToMi(value);

  // Length
  if (fromUnit === 'cm' && toUnit === 'in') return cmToIn(value);
  if (fromUnit === 'in' && toUnit === 'cm') return inToCm(value);

  // Speed
  if (fromUnit === 'm/s' && toUnit === 'mi/hr') return msToMph(value);

  // Time
  if (fromUnit === 's' && toUnit === 'min') return secToMin(value);
  if (fromUnit === 's' && toUnit === 'hr') return secToHr(value);
  if (fromUnit === 'ms' && toUnit === 'hr') return msToHr(value);

  // Energy
  if (fromUnit === 'J' && toUnit === 'kcal') return jToKcal(value);

  console.warn(`Unknown unit conversion: ${fromUnit} -> ${toUnit}`);
  return value;
}
