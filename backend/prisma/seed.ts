import bcrypt from 'bcrypt';
import { PrismaClient, WaterbodyType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Seed Waterbodies (California) ──────────────────
  // 30 popular California fishing locations across lakes, reservoirs, and rivers.

  const waterbodies = [
    // Southern California lakes & reservoirs
    { name: "Big Bear Lake", type: WaterbodyType.LAKE, state: "CA", latitude: 34.2439, longitude: -116.9114, source: "curated" },
    { name: "Lake Perris", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 33.8631, longitude: -117.1681, source: "curated" },
    { name: "Irvine Lake", type: WaterbodyType.LAKE, state: "CA", latitude: 33.7872, longitude: -117.7361, source: "curated" },
    { name: "Lake Castaic", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 34.5308, longitude: -118.6106, source: "curated" },
    { name: "Diamond Valley Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 33.6942, longitude: -117.1792, source: "curated" },
    { name: "Lake Elsinore", type: WaterbodyType.LAKE, state: "CA", latitude: 33.6680, longitude: -117.3473, source: "curated" },
    { name: "Puddingstone Reservoir", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 34.0825, longitude: -117.7778, source: "curated" },
    { name: "Lake Hodges", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 33.0686, longitude: -117.0989, source: "curated" },
    { name: "Lake Cachuma", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 34.5919, longitude: -119.9533, source: "curated" },
    { name: "Pyramid Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 34.6661, longitude: -118.7561, source: "curated" },
    { name: "Lake Casitas", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 34.3919, longitude: -119.3389, source: "curated" },
    { name: "Silverwood Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 34.2839, longitude: -117.3239, source: "curated" },

    // Central California lakes & reservoirs
    { name: "Pine Flat Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 36.8500, longitude: -119.3333, source: "curated" },
    { name: "Bass Lake", type: WaterbodyType.LAKE, state: "CA", latitude: 37.3325, longitude: -119.5550, source: "curated" },
    { name: "Don Pedro Reservoir", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 37.7000, longitude: -120.4167, source: "curated" },
    { name: "New Melones Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 37.9500, longitude: -120.5167, source: "curated" },
    { name: "Lake McClure", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 37.5833, longitude: -120.2667, source: "curated" },
    { name: "June Lake", type: WaterbodyType.LAKE, state: "CA", latitude: 37.7825, longitude: -119.0758, source: "curated" },

    // Northern California lakes & reservoirs
    { name: "Lake Tahoe", type: WaterbodyType.LAKE, state: "CA", latitude: 39.0968, longitude: -120.0324, source: "curated" },
    { name: "Lake Berryessa", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 38.5800, longitude: -122.1700, source: "curated" },
    { name: "Folsom Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 38.7000, longitude: -121.1500, source: "curated" },
    { name: "Trinity Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 40.8000, longitude: -122.7500, source: "curated" },
    { name: "Shasta Lake", type: WaterbodyType.RESERVOIR, state: "CA", latitude: 40.8500, longitude: -122.3500, source: "curated" },
    { name: "Lake Almanor", type: WaterbodyType.LAKE, state: "CA", latitude: 40.2500, longitude: -121.1500, source: "curated" },
    { name: "Eagle Lake", type: WaterbodyType.LAKE, state: "CA", latitude: 40.6500, longitude: -120.7500, source: "curated" },

    // Rivers
    { name: "Santa Ana River", type: WaterbodyType.RIVER, state: "CA", latitude: 33.8675, longitude: -117.7514, source: "curated" },
    { name: "Sacramento River", type: WaterbodyType.RIVER, state: "CA", latitude: 38.5816, longitude: -121.4944, source: "curated" },
    { name: "American River", type: WaterbodyType.RIVER, state: "CA", latitude: 38.6014, longitude: -121.5081, source: "curated" },
    { name: "Stanislaus River", type: WaterbodyType.RIVER, state: "CA", latitude: 37.7833, longitude: -120.6500, source: "curated" },
    { name: "Klamath River", type: WaterbodyType.RIVER, state: "CA", latitude: 41.9583, longitude: -123.4500, source: "curated" },
  ];

  for (const wb of waterbodies) {
    await prisma.waterbody.upsert({
      where: {
        name_state: { name: wb.name, state: wb.state },
      },
      update: {},
      create: wb,
    });
  }

  console.log(`Seeded ${waterbodies.length} waterbodies`);

  await prisma.user.upsert({
    where: { email: "dev@casttrack.local" },
    update: {},
    create: {
      email: "dev@casttrack.local",
      passwordHash: await bcrypt.hash("devpassword123", 12),
      displayName: "Dev Admin",
      role: "ADMIN",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
