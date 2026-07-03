/**
 * @file demo/lib/seeds.ts
 *
 * Seeded apartments, hosts, and booking scenarios for the SafeTrust ZK demo.
 * No database, no registration — just realistic data for a compelling demo video.
 */

export interface SeedApartment {
  id: string;
  name: string;
  location: string;
  description: string;
  pricePerNight: number;       // USDC
  priceStroops: string;        // stroops (7 decimal places)
  nights: number;
  totalUsdc: number;
  totalStroops: string;
  hostAddress: string;
  hostName: string;
  image: string;               // emoji stand-in for demo
  amenities: string[];
  checkIn: string;
  checkOut: string;
}

export const SEED_APARTMENTS: SeedApartment[] = [
  {
    id: "apt-stellar-001",
    name: "Casa Stellar",
    location: "San José, Costa Rica",
    description:
      "A modern apartment in the heart of San José with fast Wi-Fi, mountain views, and a rooftop terrace. Perfect for remote workers and digital nomads.",
    pricePerNight: 150,
    priceStroops:  "1500000000",   // 150 USDC in stroops
    nights: 3,
    totalUsdc: 450,
    totalStroops: "4500000000",    // 450 USDC in stroops
    hostAddress:
      "GBVUDZKUNVHBHGFHWP3QZLXFZSQPFBEZOVQHP5DWVVMJZE5TSTV7VAD",
    hostName: "María V.",
    image: "🏠",
    amenities: ["Wi-Fi", "Kitchen", "Rooftop", "A/C", "Parking"],
    checkIn:  "2026-07-10",
    checkOut: "2026-07-13",
  },
  {
    id: "apt-stellar-002",
    name: "Loft Bocas",
    location: "Bocas del Toro, Panama",
    description:
      "Overwater bungalow with direct Caribbean access. Snorkeling gear included. 5 minutes by boat from the main island.",
    pricePerNight: 220,
    priceStroops:  "2200000000",
    nights: 5,
    totalUsdc: 1100,
    totalStroops: "11000000000",
    hostAddress:
      "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3RTLMQPD8",
    hostName: "Carlos M.",
    image: "🌊",
    amenities: ["Ocean View", "Snorkeling", "Boat Access", "Breakfast"],
    checkIn:  "2026-07-15",
    checkOut: "2026-07-20",
  },
  {
    id: "apt-stellar-003",
    name: "Suite Medellín",
    location: "El Poblado, Medellín, Colombia",
    description:
      "Luxury suite in El Poblado with city views, concierge service, and a private gym. Walking distance to top restaurants and nightlife.",
    pricePerNight: 180,
    priceStroops:  "1800000000",
    nights: 4,
    totalUsdc: 720,
    totalStroops: "7200000000",
    hostAddress:
      "GDMXNQBJMS3FYI4PJTZZVFY4ZXZQSZ3IOMKJMZF6ZCQZXE7I7XDOIK",
    hostName: "Ana L.",
    image: "🏙️",
    amenities: ["City View", "Gym", "Concierge", "Rooftop Pool", "Netflix"],
    checkIn:  "2026-07-20",
    checkOut: "2026-07-24",
  },
];

/** Guest balance seeded above the max booking amount — proves solvency range proof passes */
export const SEED_GUEST_BALANCE_STROOPS = "20000000000"; // 2000 USDC

/** TrustlessWork mock contract ID for demo fallback */
export const MOCK_CONTRACT_ID = "STELLAR_ZK_DEMO_CONTRACT_001";

/** Format stroops → human USDC string */
export function formatUsdc(stroops: string | number): string {
  try {
    const n = BigInt(stroops.toString());
    const whole = n / 10_000_000n;
    const frac  = n % 10_000_000n;
    if (frac === 0n) return `${whole} USDC`;
    return `${whole}.${frac.toString().padStart(7, "0").replace(/0+$/, "")} USDC`;
  } catch {
    return "—";
  }
}

/** Format a Stellar address for display */
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}