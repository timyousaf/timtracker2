import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.NEON_DATABASE_URL);

const metrics = await sql`SELECT COUNT(*) as count FROM ios_apple_health_metrics`;
const workouts = await sql`SELECT COUNT(*) as count FROM ios_apple_health_workouts`;
const sleep = await sql`SELECT COUNT(*) as count FROM ios_apple_health_sleep`;

console.log('ios_apple_health_metrics:', metrics[0].count);
console.log('ios_apple_health_workouts:', workouts[0].count);
console.log('ios_apple_health_sleep:', sleep[0].count);

const workoutTypes = await sql`SELECT type, COUNT(*) as count FROM ios_apple_health_workouts GROUP BY type ORDER BY count DESC LIMIT 10`;
console.log('\nWorkout types:');
workoutTypes.forEach(r => console.log('  ', r.type, ':', r.count));

const metricTypes = await sql`SELECT type, COUNT(*) as count FROM ios_apple_health_metrics GROUP BY type ORDER BY count DESC LIMIT 15`;
console.log('\nMetric types:');
metricTypes.forEach(r => console.log('  ', r.type, ':', r.count));
