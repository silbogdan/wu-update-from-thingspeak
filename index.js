import cron from "node-cron"
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));

const { CHANNEL_ID, API_KEY, WU_ID, WU_KEY } = argv;

if (!CHANNEL_ID || !API_KEY || !WU_ID || !WU_KEY) {
  console.error("Missing required arguments!");
  process.exit(1);
}

const WU_BASE_URL = `https://rtupdate.wunderground.com/weatherstation/updateweatherstation.php?ID=${WU_ID}&PASSWORD=${WU_KEY}&dateutc=now`;

// "Cached" last update that will be compared with the last update from thingspeak
let lastUpdate = new Date();

console.info("Scheduling 15 seconds weather update cronjob...")

cron.schedule("*/15 * * * * *", async () => {
  // Get thingspeak data
  const res = await fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${API_KEY}&results=1`);
  const data = await res.json();

  // Check if last update is newer than stored update
  const lastUpdateFromThingspeak = new Date(data.feeds[0].created_at);

  if (lastUpdateFromThingspeak > lastUpdate) {
    lastUpdate = lastUpdateFromThingspeak;

    const { field1: tempC, field2: hum, field3: pressureMetric, field4: uvIndex } = data.feeds[0];

    // Convert to imperial units to integrate with Weather Underground
    const tempF = (tempC * 9 / 5) + 32;
    const pressureInHg = pressureMetric * 0.02953;

    const url = `${WU_BASE_URL}&tempf=${tempF}&humidity=${hum}&baromin=${pressureInHg}&UV=${uvIndex.trim()}`;

    console.log(`Updating weather data... (${url})`);
    await fetch(url);
  } else {
    console.log("No new data received, skipping update...");
  }
})