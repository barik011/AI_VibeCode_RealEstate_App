import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('src/data', { recursive: true });
const write = (name, data) =>
  writeFileSync(`src/data/${name}.json`, JSON.stringify(data, null, 2) + '\n');
const image = (id, width = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const images = {
  skyline: image('photo-1512453979798-5ea266f8880c', 2000),
  marina: image('photo-1682410601760-6372fd33ad2b', 1800),
  city: image('photo-1682410601760-6372fd33ad2b', 1800),
  architecture: image('photo-1518684079-3c830dcef090', 1200),
  villa: image('photo-1613977257363-707ba9348227'),
  residence: image('photo-1600607687920-4e2a09cf159d'),
  interior: image('photo-1600210492486-724fe5c67fb0'),
  pool: image('photo-1613490493576-7fde63acd811'),
  apartment: image('photo-1600607687939-ce8a6c25118c'),
  townbayt: image('photo-1600047509782-20d39509f26d'),
  office: image('photo-1497366811353-6870744d04b2'),
  palm: image('photo-1764212193268-dba11709dc38', 1600),
  avatar: image('photo-1472099645785-5658abf4ff4e', 100),
};
write('site', {
  brand: 'Dubai bayt',
  email: 'hello@dubaibayt.example',
  phone: '+971 4 000 0000',
  currency: 'AED',
  paginationSize: 9,
  fallback: '/images/fallback.svg',
  images,
  heroImages: [images.skyline, images.pool, images.marina, images.interior, images.palm],
  socials: {
    instagram: 'https://www.instagram.com/',
    linkedin: 'https://www.linkedin.com/',
    youtube: 'https://www.youtube.com/',
    facebook: 'https://www.facebook.com/',
  },
});
const locations = [
  [
    'downtown-dubai',
    'Downtown Dubai',
    'At the heart of extraordinary.',
    'Landmark architecture, celebrated dining and the rhythm of a global city. Downtown brings the best of Dubai to your doorstep.',
    images.skyline,
    25.1972,
    55.2744,
  ],
  [
    'palm-jumeirah',
    'Palm Jumeirah',
    'An island. A world of its own.',
    'Wake to calm water and uninterrupted horizons. Discover private beach living on Dubai’s most distinctive island.',
    images.palm,
    25.1124,
    55.139,
  ],
  [
    'dubai-marina',
    'Dubai Marina',
    'Life, beautifully by the water.',
    'A lively waterfront neighbourhood with yacht-lined promenades, independent cafés and exceptional sea-view residences.',
    images.marina,
    25.0805,
    55.1403,
  ],
  [
    'emirates-hills',
    'Emirates Hills',
    'Space to live exceptionally.',
    'Generous private estates, quiet green streets and golf-course views create a truly peaceful address.',
    images.villa,
    25.0664,
    55.1646,
  ],
  [
    'dubai-creek-harbour',
    'Dubai Creek Harbour',
    'A fresh perspective on Dubai.',
    'Modern waterfront homes, open promenades and a growing community overlooking the historic Dubai Creek.',
    images.city,
    25.2068,
    55.345,
  ],
  [
    'business-bay',
    'Business Bay',
    'Where ambition feels at home.',
    'A connected urban district with canal-side living, contemporary workspaces and the city within easy reach.',
    images.office,
    25.185,
    55.261,
  ],
  [
    'jumeirah',
    'Jumeirah',
    'A slower pace by the sea.',
    'Leafy residential streets, boutique destinations and beautiful beaches for an effortlessly balanced lifestyle.',
    images.residence,
    25.204,
    55.236,
  ],
  [
    'dubai-hills-estate',
    'Dubai Hills Estate',
    'Room to grow, naturally.',
    'Park-side homes, family-friendly amenities and green spaces in a thoughtfully planned neighbourhood.',
    images.townbayt,
    25.112,
    55.257,
  ],
].map(([slug, name, tagline, description, image, lat, lng]) => ({
  slug,
  name,
  tagline,
  description,
  image,
  coordinates: { lat, lng },
}));
write('locations', locations);
write('categories', [
  { slug: 'villa', name: 'Villas', description: 'Refined living spaces', image: images.villa },
  {
    slug: 'apartment',
    name: 'Apartments',
    description: 'Urban living redefined',
    image: images.marina,
  },
  {
    slug: 'townbayt',
    name: 'Townbayts',
    description: 'Space for every story',
    image: images.townbayt,
  },
  {
    slug: 'pentbayt',
    name: 'Pentbayts',
    description: 'Elevated experiences',
    image: images.residence,
  },
  {
    slug: 'commercial',
    name: 'Commercial',
    description: 'Spaces for growth',
    image: images.office,
  },
]);
const rows = [
  ['Palm Jumeirah Villa', 'villa', 1, 'buy', 28000000, 5, 6, 8200, 'pool'],
  ['Downtown Luxury Apartment', 'apartment', 0, 'buy', 6800000, 3, 4, 2150, 'skyline'],
  ['Waterfront Residence', 'pentbayt', 2, 'buy', 12500000, 4, 5, 3900, 'residence'],
  ['Emirates Signature Estate', 'villa', 3, 'buy', 42000000, 6, 7, 12000, 'villa'],
  ['Creekside Horizon', 'apartment', 4, 'off-plan', 2400000, 2, 3, 1450, 'apartment'],
  ['Marina Vista Apartment', 'apartment', 2, 'rent', 180000, 2, 2, 1350, 'interior'],
  ['The Park Townbayt', 'townbayt', 7, 'buy', 4200000, 4, 4, 3100, 'townbayt'],
  ['Canal View Workspace', 'commercial', 5, 'commercial', 3900000, 0, 2, 2400, 'office'],
  ['Jumeirah Garden Villa', 'villa', 6, 'rent', 480000, 4, 5, 5600, 'villa'],
  ['Palm Sky Pentbayt', 'pentbayt', 1, 'buy', 19500000, 4, 5, 6200, 'interior'],
  ['Downtown Studio Residence', 'apartment', 0, 'rent', 95000, 0, 1, 620, 'apartment'],
  ['Creek Harbour Collection', 'apartment', 4, 'buy', 3100000, 2, 3, 1620, 'city'],
  ['Hills Park Residences', 'townbayt', 7, 'off-plan', 3600000, 3, 4, 2800, 'townbayt'],
  ['Marina Panorama', 'apartment', 2, 'buy', 4500000, 3, 4, 2300, 'marina'],
  ['Business Bay Atelier', 'commercial', 5, 'rent', 240000, 0, 2, 1850, 'office'],
  ['Jumeirah Beach Residence', 'apartment', 6, 'buy', 5200000, 3, 3, 2400, 'residence'],
  ['Palm Ocean Collection', 'villa', 1, 'off-plan', 22000000, 5, 6, 7600, 'pool'],
  ['Emirates Golf Retreat', 'villa', 3, 'rent', 780000, 5, 6, 8700, 'villa'],
  ['Downtown Crown Pentbayt', 'pentbayt', 0, 'buy', 24000000, 5, 6, 7100, 'interior'],
  ['Creek Horizon Pentbayt', 'pentbayt', 4, 'off-plan', 7800000, 4, 5, 4100, 'residence'],
];
write(
  'properties',
  rows.map(([title, category, loc, purpose, price, bedrooms, bathrooms, area, img], index) => ({
    id: index + 1,
    slug: title.toLowerCase().replaceAll(' ', '-'),
    title,
    category,
    purpose,
    location: locations[loc].name,
    locationSlug: locations[loc].slug,
    city: 'Dubai',
    price,
    currency: 'AED',
    bedrooms,
    bathrooms,
    area,
    areaUnit: 'sq ft',
    featured: index < 3,
    offPlan: purpose === 'off-plan',
    createdAt: `2026-09-${String(26 - index).padStart(2, '0')}`,
    tenure: 'Freehold',
    furnished: index % 2 === 0 ? 'Fully furnished' : 'Unfurnished',
    reference: `DH-${10240 + index}`,
    images: [images[img], images.interior, images.apartment, images.residence],
    coordinates: locations[loc].coordinates,
    description: `Discover a considered way of living at ${title}. Set within ${locations[loc].name}, this thoughtfully arranged ${category} brings generous proportions, natural light and refined finishes together. Open living spaces connect effortlessly with inviting private rooms, creating a place equally suited to quiet mornings and memorable evenings.\n\nEnjoy convenient access to the neighbourhood’s dining, leisure and everyday essentials. This illustrative listing is part of our demo collection; availability, specifications and prices are sample data.`,
    amenities:
      category === 'commercial'
        ? [
            'Reception',
            'Meeting rooms',
            'Covered parking',
            '24-hour security',
            'High-speed connectivity',
            'Canal views',
          ]
        : [
            'Swimming pool',
            'Fitness studio',
            'Covered parking',
            '24-hour security',
            'Private balcony',
            'Concierge',
          ],
    agent: {
      name: 'Sofia Bennett',
      role: 'Senior Property Advisor',
      languages: 'English · Arabic',
      image: images.avatar,
    },
  })),
);
write('testimonials', [
  {
    id: 1,
    quote:
      'Dubai bayt made our investment journey seamless. Their team was professional, transparent, and truly understood our goals. We couldn’t be happier with our new apartment in Downtown Dubai.',
    name: 'James Carter',
    role: 'Investor from the UK',
    rating: 5,
    avatar: images.avatar,
  },
  {
    id: 2,
    quote:
      'From our first conversation to finding the right neighbourhood, the advice was thoughtful and personal. We found a place that feels like home from the moment you walk in.',
    name: 'Amelia Ross',
    role: 'Homeowner from Australia',
    rating: 5,
    avatar: image('photo-1580489944761-15a19d654956', 100),
  },
  {
    id: 3,
    quote:
      'We appreciated the clear explanations and attention to the small details. The team helped us explore our options with confidence and at our own pace.',
    name: 'Arjun Mehta',
    role: 'Investor from India',
    rating: 5,
    avatar: image('photo-1500648767791-00dcc994a43e', 100),
  },
]);
write('blog', [
  {
    slug: 'finding-your-dubai-neighbourhood',
    title: 'Finding your place in Dubai',
    category: 'Neighbourhoods',
    date: '2026-09-15',
    image: images.marina,
    excerpt:
      'From the waterfront to the heart of the city, discover the neighbourhood that fits your everyday.',
    paragraphs: [
      'A home is more than its floor plan. It is the morning walk, the familiar café and the journey back at the end of the day. Choosing a neighbourhood begins with understanding how you want to spend your time.',
      'Downtown offers a connected city lifestyle, while Dubai Marina brings long waterfront walks and lively evenings. Palm Jumeirah offers a more secluded setting with wide sea views. Each has its own rhythm.',
      'Visit at different times of day, try your regular commute and explore local amenities on foot. Practical details often reveal more than a photograph. Our advisors can help you build a shortlist around your priorities.',
    ],
  },
  {
    slug: 'a-considered-property-investment',
    title: 'A considered approach to property investment',
    category: 'Investment',
    date: '2026-09-08',
    image: images.skyline,
    excerpt:
      'The questions to ask before choosing a property, from your time horizon to ongoing costs.',
    paragraphs: [
      'Start with your objectives. A home for future use and a rental property may call for very different decisions. Define your time horizon, budget and tolerance for uncertainty before comparing individual listings.',
      'Look beyond the advertised purchase price. Ongoing service charges, maintenance, financing and transaction costs all affect affordability. Rental demand and returns vary, and past performance does not guarantee future results.',
      'Request current documentation and independent professional advice before making any commitment. The information in this demo is general editorial content, not financial or legal advice.',
    ],
  },
  {
    slug: 'the-art-of-waterfront-living',
    title: 'The art of waterfront living',
    category: 'Lifestyle',
    date: '2026-08-28',
    image: images.residence,
    excerpt:
      'Open horizons, natural light and space to slow down. A different perspective on home.',
    paragraphs: [
      'There is a quiet appeal to a home by the water. Shifting light and open views bring a sense of space to everyday routines, from a morning coffee to an evening with friends.',
      'When viewing waterfront homes, consider orientation, outdoor space and how the rooms connect. Ask about building maintenance and explore the surrounding promenade to understand the atmosphere.',
      'The best home is the one that works for your life. Think about the spaces you will use every day, the people you will welcome and the details that make you feel at ease.',
    ],
  },
  {
    slug: 'a-guide-to-viewing-your-next-home',
    title: 'A fresh perspective on your next viewing',
    category: 'Buying guides',
    date: '2026-08-17',
    image: images.interior,
    excerpt: 'A thoughtful checklist to help you make the most of every property viewing.',
    paragraphs: [
      'Begin with a short list of essentials and a separate list of preferences. This helps you stay focused when a beautiful view or a striking interior catches your attention.',
      'Look at storage, daylight, noise and the practical flow of rooms. Take notes during each viewing so you can compare properties clearly later. Always request permission before taking photographs.',
      'Ask questions about building management, maintenance history and shared facilities. Take the time you need, and arrange a second visit for any home you are seriously considering.',
    ],
  },
]);
