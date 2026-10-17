/**
 * roam-details-data.js
 * ------------------------------------------------------------------
 * Full page content for every roam package, keyed by slug. This is
 * what roams/roam-list/roam.html reads (via ?slug=<slug> in the URL)
 * to render a complete roam detail page, replacing what used to be
 * three (and growing) hand-copied HTML files under roams/roam-list/.
 *
 * This file is a STAND-IN for a database table/API response — see
 * /database/roam-details-fields.txt for the full
 * field-by-field breakdown (intended as a DB schema reference) and
 * additional sample JSON entries for two more roams.
 *
 * Adding a new roam:
 *   1. Add a summary entry to assets/js/roams-data.js (card data: title,
 *      route, dates, image, description, slug, fullPage).
 *   2. Add a full entry here, keyed by that same slug.
 *   3. Link to roams/roam-list/roam.html?slug=<slug> — no new HTML file
 *      needed.
 *
 * Loaded as a plain global (no build step / bundler in this project):
 *   <script src="/assets/js/roam-details-data.js"></script>
 * ------------------------------------------------------------------
 */
var ROAM_DETAILS = {
  "arabisya-indino": {
    "slug": "arabisya-indino",
    "pageTitle": "Arabisya Indino",
    "hero": {
      "image": "https://images.unsplash.com/photo-1524229321985-1e1989075d9b?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      "imageAlt": "Hawa Mahal, the pink palace of Jaipur",
      "by": "By the team of EPSOT Round Trip",
      "title": "Arabisya Indino",
      "subtitle": "Land across the Arabian Sea — nine days through Western and Northern India's cultural spectrum.",
      "meta": [
        "<strong>14–22 October 2026</strong>",
        "Mumbai → Gujarat → Jaipur → Delhi",
        "9 days"
      ]
    },
    "about": {
      "heading": "Immersion over sightseeing",
      "paragraphs": [
        "Arabisya Indino — Land Across the Arabian Sea — is built to move past standard, surface-level tourism across four states. Rather than watching from a bus window, guests take part: this itinerary lands right inside Navratri, the nine-day, nine-colour festival celebrating nine forms of the goddess.",
        "From Mumbai's coastline to Gujarat's Garba nights, Jaipur's pink-city palaces, and Delhi's monuments, the aim is mutual learning in both directions, not a one-way tour."
      ],
      "quote": "“A sense of global community, fostered through the exchange of Cultural Kits among international participants — alongside a proper culinary expedition.”",
      "objectives": [
        "Move beyond standard sightseeing to involve guests in authentic local customs, not just observe them.",
        "Encourage mutual learning and respect through the exchange of “Cultural Kits” among international participants.",
        "Delight the palate with a thoughtfully curated food journey of authentic, iconic local dishes.",
        "Balance high-energy festive days with genuine leisure, so the pace never wears guests down."
      ],
      "image": "https://images.unsplash.com/photo-1762526217288-a783242270dc?fm=jpg&q=80&w=1600&auto=format&fit=crop",
      "imageAlt": "India Gate in New Delhi illuminated at night",
      "badge": "9 days, 4 states"
    },
    "gallery": {
      "heading": "Where this trip actually takes you",
      "subtitle": "A route that runs from the Arabian Sea coastline to Rajasthan's palaces and Delhi's monuments.",
      "cards": [
        {
          "image": "https://images.unsplash.com/photo-1524229321985-1e1989075d9b?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Hawa Mahal, Jaipur",
          "title": "The Pink City",
          "text": "Hawa Mahal, City Palace, Jantar Mantar and Albert Hall — Jaipur's landmarks, with Pyaz Kachori for breakfast."
        },
        {
          "image": "https://images.unsplash.com/photo-1670388425186-1f2ab41b0918?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Atal Bridge over the Sabarmati River, Ahmedabad, lit up at night",
          "title": "Garba Nights in Ahmedabad",
          "text": "Traditional Navratri attire, a Garba event by the Sabarmati, and a full festive mood-setter for the trip ahead."
        },
        {
          "image": "https://images.unsplash.com/photo-1762526217288-a783242270dc?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "India Gate in New Delhi at night",
          "title": "Delhi, Start to Finish",
          "text": "Humayun's Tomb and Baansera Park by day, then Agrasen Baoli, India Gate and Qutub Minar on the final sightseeing day."
        }
      ]
    },
    "itinerary": {
      "heading": "Day by day",
      "subtitle": "Nine days, four states, and a night train or two in between.",
      "items": [
        {
          "type": "day",
          "dayNumber": "1",
          "festive": false,
          "title": "Arrival in Mumbai + Mumbai Darshan",
          "activities": [
            "Arrival in Mumbai, settle into your stay, freshen up.",
            "HOHO-style city tour: Gateway of India, Marine Drive, Chhatrapati Shivaji Maharaj Terminus, and 15+ stops.",
            "Authentic Maharashtrian fish thali for lunch.",
            "Street food tasting, then back to the stay."
          ]
        },
        {
          "type": "day",
          "dayNumber": "2",
          "festive": false,
          "title": "Sanctuary + Night Journey to Gujarat",
          "activities": [
            "A slower day after a late Day 1 and the long flight in — a late breakfast, or WFH if you need it.",
            "Visit the nearby Bird Sanctuary — carry hiking shoes.",
            "Light dinner.",
            "Overnight bus or train to Gujarat."
          ]
        },
        {
          "type": "day",
          "dayNumber": "3",
          "festive": false,
          "title": "Ahmedabad Exploration",
          "activities": [
            "Morning arrival and check-in in Ahmedabad.",
            "Sabarmati Ashram, Akshardham and the Science Museum.",
            "A relaxed lunch (this leg of the trip is in a dry state).",
            "Traditional Navratri attire and a Garba event in the evening — the festive mood-setter."
          ]
        },
        {
          "type": "day",
          "dayNumber": "4",
          "festive": false,
          "title": "Ahmedabad + Night Train to Jaipur",
          "activities": [
            "Breakfast of Khichu and Khaman.",
            "Riverfront, Adalaj Stepwell, Jhulta Minar.",
            "An authentic Gujarati thali for lunch.",
            "Shopping at Law Garden Market for ethnic wear and jewellery.",
            "Board the evening train to Jaipur; a light dinner on board."
          ]
        },
        {
          "type": "day",
          "dayNumber": "5",
          "festive": false,
          "title": "Jaipur Arrival + Garba Night",
          "activities": [
            "Morning arrival in Jaipur; check in to the hostel.",
            "Pyaz Kachori and Ghewar for breakfast.",
            "Hawa Mahal, City Palace, Jantar Mantar, Albert Hall Museum.",
            "Rajasthani Gatte ki Sabzi for lunch, then back to the room to rest."
          ]
        },
        {
          "type": "day",
          "dayNumber": "6",
          "festive": false,
          "title": "Jaipur Excursion",
          "activities": [
            "An early start.",
            "Six or more local attractions.",
            "Back to the room by 7pm — a good window for laundry.",
            "Freshen up and have dinner."
          ]
        },
        {
          "type": "day",
          "dayNumber": "7",
          "festive": true,
          "title": "Dussehra Evening",
          "activities": [
            "A slow morning — catch up on any laundry from the night before.",
            "A Bollywood movie at the theatre.",
            "Lunch, then Birla Mandir.",
            "Traditional attire for the evening, then the Dussehra ground to watch the Ravan Dahan.",
            "Dinner after the fireworks — shower before bed, since the next day starts at 5am."
          ]
        },
        {
          "type": "day",
          "dayNumber": "8",
          "festive": false,
          "title": "Jaipur to Delhi",
          "activities": [
            "An early morning bus to Delhi.",
            "Arrive around 11am and check in to the hostel.",
            "Humayun's Tomb and Hazrat Nizamuddin.",
            "Lunch at Connaught Place.",
            "Back to the room via Baansera Park, then dinner."
          ]
        },
        {
          "type": "day",
          "dayNumber": "9",
          "festive": false,
          "title": "Delhi Darshan",
          "activities": [
            "An early start — paratha and chole for breakfast.",
            "A sightseeing bus through Agrasen Baoli, Gurudwara Bangla Sahib, India Gate, Kartavya Path, Qutub Minar, and Purana Qila.",
            "Lunch at Kake Di Hatti within the day's schedule.",
            "Trip ends with happy memories and great company."
          ]
        }
      ]
    },
    "inclusions": {
      "heading": "What's covered",
      "includedTitle": "What's included",
      "included": [
        "Lodging in Mumbai, Ahmedabad, Delhi and Jaipur — homestays, hotels or hostels.",
        "Sightseeing bus tickets for Mumbai and Delhi.",
        "Organised sightseeing tours for Ahmedabad and Jaipur.",
        "Breakfast and dinner on all days except one dinner in Delhi.",
        "A cultural kit with insights from an Indian perspective.",
        "An identity card and welcome kit."
      ],
      "includedNote": "Breakfast plus one included meal a day — lunch or dinner depending on the day's plan; the remaining meal is at a common place at your own cost.",
      "excludedTitle": "What's not included",
      "excluded": [
        "Visa fees and flights.",
        "Sightseeing beyond the venue itself.",
        "Venue entry fees — these vary by nationality.",
        "Any medical or unforeseen expense.",
        "À la carte orders outside breakfast and dinner.",
        "Shopping of any kind, and SIM card charges.",
        "Any extended stay."
      ],
      "excludedNote": "If you'd like to extend your stay in India beyond this trip, we're happy to suggest places and help you plan it."
    },
    "packing": {
      "heading": "What to pack",
      "subtitle": "Aside from these, it's up to you what else you bring along.",
      "categories": [
        {
          "title": "Clothing",
          "items": [
            "1 formal outfit",
            "1 black t-shirt (group colour)",
            "1 white t-shirt (group colour)",
            "Full-body outfit + scarf for women, at least one set"
          ]
        },
        {
          "title": "Cultural",
          "items": [
            "A cultural kit from your own country",
            "Your national flag",
            "Ideas: spice mix, instant noodles, a local keychain or fridge magnet"
          ]
        },
        {
          "title": "Utilities & docs",
          "items": [
            "Personal medication, if any",
            "Passport and visa copy"
          ]
        },
        {
          "title": "Travel utilities",
          "items": [
            "A small backpack for outdoors",
            "A water bottle",
            "Keep your primary luggage light and easy to carry"
          ]
        },
        {
          "title": "Rain gear",
          "items": [
            "1 pair of flip-flops",
            "A rain coat (upper body)",
            "An umbrella"
          ]
        },
        {
          "title": "Footwear",
          "items": [
            "1 pair of flip-flops or sandals (for rain)",
            "1 pair of good-grip shoes for trekking",
            "1 pair of everyday sneakers"
          ]
        }
      ]
    },
    "eligibility": {
      "heading": "Who this trip is for",
      "criteria": [
        "Young adults, preferably 18 to 30 years old.",
        "Comfortable communicating in English.",
        "Self-reliant, adaptable, and respectful of cultural differences.",
        "Rotary youth, Rotaractors, and friends of Rotary families in the age bracket are warmly encouraged to join."
      ],
      "note": "Seats are limited, and the itinerary can shift at short notice — this trip suits travellers who can roll with that.",
      "priceLabel": "Trip cost",
      "price": "USD 420",
      "priceNote": "per person · entry/monument fees, visa and flights not included"
    },
    "faq": {
      "heading": "Questions people ask",
      "items": [
        {
          "question": "Will you provide any certificate?",
          "answer": "Yes — an arrival kit and certificate are planned, along with an ID card and a button badge."
        },
        {
          "question": "Do we need to carry travel insurance?",
          "answer": "Yes, we suggest carrying your own travel insurance for your safety."
        },
        {
          "question": "Should we carry cash, or will an international debit card work?",
          "answer": "Cash is suggested, depending on your spending habits. It's also worth looking into UPI, India's QR-code payment system, before you land."
        },
        {
          "question": "What if we have WFH commitments — will WiFi be available?",
          "answer": "A local SIM (Reliance Jio or Airtel) gets you around 3GB/day for roughly $6, enough for remote work. Airtel can usually be picked up right at the airport — just confirm the deal before you pay."
        },
        {
          "question": "Are smoking and drinking alcohol allowed?",
          "answer": "Smoking is best kept to designated areas, away from the group. Part of this itinerary passes through a dry state where alcohol is illegal under state law — vapes and e-cigarettes are best left at home too."
        },
        {
          "question": "What should I pack for the trip?",
          "answer": "Light cotton clothing, comfortable walking shoes, power adapters, sunscreen, basic medicines, a reusable water bottle, and modest clothing for cultural sites. See the checklist below for the full list."
        },
        {
          "question": "Is India safe for international travellers?",
          "answer": "Yes, especially in tourist-friendly regions — the usual precautions apply: avoid isolated areas late at night and keep valuables secure."
        },
        {
          "question": "Can I arrange my own transport or extend my stay?",
          "answer": "Yes. You're free to customise your post-tour plans, and we're happy to point you in the right direction — though shared transport is used on itinerary days."
        },
        {
          "question": "What about medication and first aid?",
          "answer": "Bring any prescribed medication with you. Sleep medication in particular isn't sold over the counter in India without a local prescription."
        },
        {
          "question": "How do we get around on break days?",
          "answer": "Tuk-tuks, cabs, and apps like Ola, Uber, or Rapido all work well — travel on these is at your own responsibility."
        }
      ]
    },
    "footer": {
      "image": "https://images.unsplash.com/photo-1524229321985-1e1989075d9b?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      "imageAlt": "Hawa Mahal in Jaipur at dusk",
      "thanksText": "Thank You",
      "dates": "14–22 October 2026",
      "logo": "../../assets/images/roams/arabisya-logo.png",
      "logoAlt": "Arabisya Indino logo",
      "presentedBy": "Presented by EPSOT | Embark Pedia"
    }
  },
  "coromandel-crest": {
    "slug": "coromandel-crest",
    "pageTitle": "Coromandel Crest",
    "hero": {
      "image": "https://images.unsplash.com/photo-1603766806347-54cdf3745953?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      "imageAlt": "Brihadeeswara Temple in Thanjavur at sunrise",
      "by": "By the team of EPSOT Round Trip",
      "title": "Coromandel Crest",
      "subtitle": "Melodies of harvest, echoes of the Cholas — heritage and slow discovery along the Coromandel Coast.",
      "meta": [
        "<strong>11–19 January 2027</strong>",
        "Chennai → Thanjavur → Pondicherry",
        "9 days"
      ]
    },
    "about": {
      "heading": "Pause, immerse, and connect",
      "paragraphs": [
        "This journey is built around heritage and slow discovery. Chennai's urban spirit, Thanjavur's timeless traditions, and Puducherry's relaxed coastal charm each show how history, spirituality, art and everyday life intertwine along the Coromandel Coast.",
        "It lands during Pongal, Tamil Nadu's harvest festival, so the timing lines up with banana-leaf meals, veshti and saree, and genuine local celebration rather than a staged version of it."
      ],
      "quote": "“A ‘Pause, Immerse, and Connect’ lifestyle — deeper cultural understanding through shared experience, local tradition, and unhurried exploration.”",
      "objectives": [
        "Move beyond standard sightseeing to involve guests in authentic local customs, not just observe them.",
        "Encourage mutual learning and respect through the exchange of “Cultural Kits” among international participants.",
        "Delight the palate with a thoughtfully curated food journey of authentic, iconic local dishes.",
        "Balance high-energy festive days with genuine leisure, so the pace never wears guests down."
      ],
      "image": "https://images.unsplash.com/photo-1709744873177-714d7ab0fe02?fm=jpg&q=80&w=1600&auto=format&fit=crop",
      "imageAlt": "Palm-lined beach near Pondicherry and Auroville",
      "badge": "9 days, 3 cities"
    },
    "gallery": {
      "heading": "Where this trip actually takes you",
      "subtitle": "From a thousand-year-old temple to a former French port town, by way of a Pongal harvest festival.",
      "cards": [
        {
          "image": "https://images.unsplash.com/photo-1603766806347-54cdf3745953?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Brihadeeswara Temple, Thanjavur",
          "title": "Brihadeeswara Temple, Thanjavur",
          "text": "The Chola-era “Big Temple,” alongside Thanjai Mamani Koil, the Royal Palace, and the Saraswathi Mahal Library."
        },
        {
          "image": "https://images.unsplash.com/photo-1709744873177-714d7ab0fe02?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Palm-lined beach near Pondicherry",
          "title": "Pondicherry & Auroville",
          "text": "Auroville's Matrimandir and Aurobindo Ashram, then the French Quarter, the Pier, and mangrove boating at sunset."
        }
      ]
    },
    "itinerary": {
      "heading": "Day by day",
      "subtitle": "Nine days along the Coromandel Coast, timed around the Pongal harvest festival.",
      "items": [
        {
          "type": "day",
          "dayNumber": "1",
          "festive": false,
          "title": "Arrival in Chennai",
          "activities": [
            "Arrival in Chennai, settle into your stay, freshen up.",
            "Relax after the long flight.",
            "Mylapore's Kapaleeshwarar Temple, and an authentic meal at Gowri Krishna.",
            "Ashtalakshmi Temple, Vivekananda House, and a chilled-out evening at Marina Beach.",
            "Group dinner at home and the itinerary briefing."
          ]
        },
        {
          "type": "day",
          "dayNumber": "2",
          "festive": false,
          "title": "Mahabalipuram Excursion",
          "activities": [
            "An early breakfast, then out to Mahabalipuram.",
            "Pancha Rathas, Krishna Mandapam, Tiger Cave.",
            "A local lunch and a slow rest.",
            "The Shore Temple — a UNESCO World Heritage Site."
          ]
        },
        {
          "type": "day",
          "dayNumber": "3",
          "festive": false,
          "title": "Nature, Museum and a Slow Evening",
          "activities": [
            "Morning check-out, then Guindy National Park and the adjoining Snake Park.",
            "Lunch at Junior Kuppanna.",
            "Santhome Cathedral Basilica, the Railway Museum, and Valluvar Kottam.",
            "Dinner, then the overnight bus to Thanjavur."
          ]
        },
        {
          "type": "note",
          "text": "Day 1 and Day 2, and Day 7 and Day 8, might be swapped depending on when everyone actually lands."
        },
        {
          "type": "day",
          "dayNumber": "4",
          "festive": false,
          "title": "Thanjavur, the Architectural Paradise",
          "activities": [
            "Arrival, breakfast at a local place, then check in.",
            "Brihadeeswara Temple, Thanjai Mamani Koil, the Royal Palace, and the Library.",
            "Lunch and dinner stopovers along the way.",
            "Overnight stay to ease out."
          ]
        },
        {
          "type": "day",
          "dayNumber": "5",
          "festive": true,
          "title": "Pongal Celebrations and Cultural Fiesta",
          "activities": [
            "Visit the nearby places celebrating Pongal.",
            "Veshti or saree — dress the part.",
            "A traditional banana-leaf meal."
          ]
        },
        {
          "type": "day",
          "dayNumber": "6",
          "festive": false,
          "title": "Enroute Pondicherry",
          "activities": [
            "Morning departure after breakfast, checking in to Pondicherry by train.",
            "Arrive and settle into the room.",
            "A genuine laundry day — slow down for once.",
            "Evening Bollywood movie together; dinner ordered in.",
            "An early night before tomorrow."
          ]
        },
        {
          "type": "day",
          "dayNumber": "7",
          "festive": false,
          "title": "Auroville Excursion",
          "activities": [
            "A relaxed breakfast in the room.",
            "Head to Auroville to experience the peaceful township.",
            "Visit the Matrimandir.",
            "Lunch nearby, then Aurobindo Ashram and an evening at the Botanical Garden.",
            "Back to the stay, dinner ordered in."
          ]
        },
        {
          "type": "day",
          "dayNumber": "8",
          "festive": false,
          "title": "Pondicherry Local Excursion",
          "activities": [
            "The French Quarter and the Basilica of the Sacred Heart of Jesus.",
            "A lunch stopover.",
            "The Pier, for photographs.",
            "Mangrove boating as the sun goes down."
          ]
        },
        {
          "type": "day",
          "dayNumber": "9",
          "festive": false,
          "title": "Chennai Drop",
          "activities": [
            "Start the day around noon.",
            "A direct bus back to Chennai.",
            "Lunch on the way, or in Chennai.",
            "Reach Chennai by 4pm — time for a little shopping, or straight to the airport.",
            "Trip ends with happy memories."
          ]
        },
        {
          "type": "note",
          "text": "This last day can vary depending on the exit route — where possible, we'll try to fit in the Shore Temple."
        }
      ]
    },
    "inclusions": {
      "heading": "What's covered",
      "includedTitle": "What's included",
      "included": [
        "Lodging in Chennai, Thanjavur and Pondicherry — homestays, hotels or hostels.",
        "Sightseeing for Chennai.",
        "Organised sightseeing tours.",
        "Breakfast and meals on all days, except one breakfast and one lunch in Thanjavur, and the last day's dinner.",
        "Inland bus and train tickets.",
        "A cultural kit with insights from an Indian perspective.",
        "An identity card and welcome kit."
      ],
      "includedNote": "Museums, national parks and forts may charge separate entry — payable at the counter.",
      "excludedTitle": "What's not included",
      "excluded": [
        "Visa fees and flights.",
        "Sightseeing beyond the venue itself.",
        "Venue entry fees — these vary by nationality.",
        "Any medical or unforeseen expense.",
        "À la carte orders outside breakfast and dinner.",
        "Shopping of any kind, and SIM card charges.",
        "Any extended stay."
      ],
      "excludedNote": "If you'd like to extend your stay in India beyond this trip, we're happy to suggest places and help you plan it."
    },
    "packing": {
      "heading": "What to pack",
      "subtitle": "Aside from these, it's up to you what else you bring along.",
      "categories": [
        {
          "title": "Clothing",
          "items": [
            "1 formal outfit",
            "1 black t-shirt (group colour)",
            "1 white t-shirt (group colour)",
            "Full-body outfit + scarf for women, at least one set"
          ]
        },
        {
          "title": "Cultural",
          "items": [
            "A cultural kit from your own country",
            "Your national flag",
            "Ideas: spice mix, instant noodles, a local keychain or fridge magnet"
          ]
        },
        {
          "title": "Utilities & docs",
          "items": [
            "Personal medication, if any",
            "Passport and visa copy"
          ]
        },
        {
          "title": "Travel utilities",
          "items": [
            "A small backpack for outdoors",
            "A water bottle",
            "Keep your primary luggage light and easy to carry"
          ]
        },
        {
          "title": "Rain gear",
          "items": [
            "1 pair of flip-flops",
            "A sun shrug (upper-body cover)",
            "Umbrella or cap",
            "Sunscreen and eyeshades"
          ]
        },
        {
          "title": "Footwear",
          "items": [
            "1 pair of flip-flops or sandals (for sand)",
            "1 pair of good-grip shoes for trekking",
            "1 pair of everyday sneakers"
          ]
        }
      ]
    },
    "eligibility": {
      "heading": "Who this trip is for",
      "criteria": [
        "Young adults, preferably 18 to 30 years old.",
        "Comfortable communicating in English.",
        "Self-reliant, adaptable, and respectful of cultural differences.",
        "Rotary youth, Rotaractors, and friends of Rotary families in the age bracket are warmly encouraged to join."
      ],
      "note": "Seats are limited, and the itinerary can shift at short notice — this trip suits travellers who can roll with that.",
      "priceLabel": "Trip cost",
      "price": "USD 380",
      "priceNote": "per person · entry/monument fees, visa and flights not included"
    },
    "faq": {
      "heading": "Questions people ask",
      "items": [
        {
          "question": "Will you provide any certificate?",
          "answer": "Yes — an arrival kit and certificate are planned, along with an ID card and a button badge."
        },
        {
          "question": "Do we need to carry travel insurance?",
          "answer": "Yes, we suggest carrying your own travel insurance for your safety."
        },
        {
          "question": "Should we carry cash, or will an international debit card work?",
          "answer": "Cash is suggested, depending on your spending habits. It's also worth looking into UPI, India's QR-code payment system, before you land."
        },
        {
          "question": "What if we have WFH commitments — will WiFi be available?",
          "answer": "A local SIM (Reliance Jio or Airtel) gets you around 3GB/day for roughly $6, enough for remote work. Airtel can usually be picked up right at the airport — just confirm the deal before you pay."
        },
        {
          "question": "Are smoking and drinking alcohol allowed?",
          "answer": "Smoking is best kept to designated areas, away from the group. Part of this itinerary passes through a dry state where alcohol is illegal under state law — vapes and e-cigarettes are best left at home too."
        },
        {
          "question": "What should I pack for the trip?",
          "answer": "Light cotton clothing, comfortable walking shoes, power adapters, sunscreen, basic medicines, a reusable water bottle, and modest clothing for cultural sites. See the checklist below for the full list."
        },
        {
          "question": "Is India safe for international travellers?",
          "answer": "Yes, especially in tourist-friendly regions — the usual precautions apply: avoid isolated areas late at night and keep valuables secure."
        },
        {
          "question": "Can I arrange my own transport or extend my stay?",
          "answer": "Yes. You're free to customise your post-tour plans, and we're happy to point you in the right direction — though shared transport is used on itinerary days."
        },
        {
          "question": "What about medication and first aid?",
          "answer": "Bring any prescribed medication with you. Sleep medication in particular isn't sold over the counter in India without a local prescription."
        },
        {
          "question": "How do we get around on break days?",
          "answer": "Tuk-tuks, cabs, and apps like Ola, Uber, or Rapido all work well — travel on these is at your own responsibility."
        }
      ]
    },
    "footer": {
      "image": "https://images.unsplash.com/photo-1709744873177-714d7ab0fe02?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      "imageAlt": "Palm-lined beach near Pondicherry",
      "thanksText": "Thank You",
      "dates": "11–19 January 2027",
      "logo": "../../assets/images/roams/coromandel-logo.png",
      "logoAlt": "Coromandel Crest logo",
      "presentedBy": "Presented by EPSOT | Embark Pedia"
    }
  },
  "goanique-ganeshika": {
    "slug": "goanique-ganeshika",
    "pageTitle": "Goanique Ganeshika",
    "hero": {
      "image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      "imageAlt": "Crowd before the Gateway of India in Mumbai under pink evening clouds",
      "by": "By the team of EPSOT Round Trip",
      "title": "Goanique Ganeshika",
      "subtitle": "Work, wander, and celebrate the Indian spirit — Mumbai's energy, Goa's coastline, and Pune in full festival flow.",
      "meta": [
        "<strong>19–27 September 2026</strong>",
        "Mumbai → Goa → Pune",
        "9 days"
      ]
    },
    "about": {
      "heading": "Utsav, as a universal connector",
      "paragraphs": [
        "This journey is built around Utsav — celebration — as something that connects people regardless of where they're from. Mumbai's fast-paced modern energy, Goa's serene coastal spirituality, and Pune's high-octane cultural devotion each show a different face of the same idea: joy, music, and tradition as a shared language.",
        "That's the whole premise of “Work, Wander, and Celebrate”: you can log on for a call in the morning and be dancing in a Ganesh Chaturthi procession by evening."
      ],
      "quote": "“Global citizens can keep their professional drive while still anchoring themselves in shared human harmony, empathy, and collective celebration.”",
      "objectives": [
        "Move beyond standard sightseeing to involve guests in authentic local customs, not just observe them.",
        "Encourage mutual learning and respect through the exchange of “Cultural Kits” among international participants.",
        "Delight the palate with a thoughtfully curated food journey of authentic, iconic local dishes.",
        "Balance high-energy festive days with genuine leisure, so the pace never wears guests down."
      ],
      "image": "https://images.unsplash.com/photo-1695453463057-aa5d48d9e3d4?fm=jpg&q=80&w=1600&auto=format&fit=crop",
      "imageAlt": "Tropical Goa beach at sunset with palm trees",
      "badge": "9 days, 3 cities"
    },
    "gallery": {
      "heading": "Where this trip actually takes you",
      "subtitle": "Three cities, three completely different moods — pulled straight from the itinerary, not a brochure.",
      "cards": [
        {
          "image": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Gateway of India, Mumbai",
          "title": "Mumbai Darshan",
          "text": "A HOHO-style tour past the Gateway of India, Marine Drive, and CSMT — 15+ stops before the night bus to Goa."
        },
        {
          "image": "https://images.unsplash.com/photo-1695453463057-aa5d48d9e3d4?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Goa beach at sunset",
          "title": "North & South Goa",
          "text": "Colva, Benaulim and Palolem by day; Fort Aguada, Calangute and Baga by the next — shack lunches and a sunset dinner with live music."
        },
        {
          "image": "https://images.unsplash.com/photo-1732960251840-f6d2c1810f1e?fm=jpg&q=80&w=1400&auto=format&fit=crop",
          "imageAlt": "Ganpati idol in a Mumbai procession",
          "title": "Ganesh Chaturthi in Pune",
          "text": "Dagdusheth Halwai, Tulshibaug and Kasba Ganpati, then the Miravnuk procession — dhol-tasha, lezim, and the whole city out celebrating."
        }
      ]
    },
    "itinerary": {
      "heading": "Day by day",
      "subtitle": "Nine days, loosely swappable at the edges depending on when your flight actually lands.",
      "items": [
        {
          "type": "day",
          "dayNumber": "1",
          "festive": false,
          "title": "Arrival in Mumbai + Sanctuary",
          "activities": [
            "Arrival in Mumbai, settle into your stay, freshen up.",
            "Relax after the long flight.",
            "Authentic Maharashtrian fish thali for lunch.",
            "Visit the nearby Bird Sanctuary — carry hiking shoes.",
            "Group dinner and itinerary briefing."
          ]
        },
        {
          "type": "day",
          "dayNumber": "2",
          "festive": false,
          "title": "Mumbai Darshan + Night Journey to Goa",
          "activities": [
            "Early breakfast, then out to coastal Mumbai (about an hour's commute).",
            "HOHO-style city tour: Gateway of India, Marine Drive, Chhatrapati Shivaji Maharaj Terminus, and 15+ stops.",
            "Street food tasting, then a light dinner back at the stay.",
            "Overnight bus or train to Goa."
          ]
        },
        {
          "type": "note",
          "text": "Day 1 and Day 2, and Day 3 and Day 5, might be swapped depending on when everyone actually lands."
        },
        {
          "type": "day",
          "dayNumber": "3",
          "festive": false,
          "title": "South Goa Exploration",
          "activities": [
            "Morning arrival and check-in in South Goa.",
            "Colva, Benaulim and Palolem beaches.",
            "A relaxed seafood lunch or shack experience.",
            "Sunset beach walk and café hopping."
          ]
        },
        {
          "type": "day",
          "dayNumber": "4",
          "festive": false,
          "title": "North Goa Adventure",
          "activities": [
            "Breakfast at a beach café in North Goa.",
            "Fort Aguada, Calangute Beach, Baga Beach, Anjuna Beach.",
            "Optional water sports — parasailing or jet ski.",
            "Sunset dinner with live music."
          ]
        },
        {
          "type": "day",
          "dayNumber": "5",
          "festive": false,
          "title": "Temples of Goa + Overnight Bus to Pune",
          "activities": [
            "Goa's spiritual and heritage temples: Shree Mangueshi, Shanta Durga, Nageshi.",
            "A Gomantak / Saraswat pure-veg Goan cultural lunch.",
            "Shopping stop for ethnic clothing and jewellery before Pune.",
            "Freshen up and board the overnight bus to Pune."
          ]
        },
        {
          "type": "day",
          "dayNumber": "6",
          "festive": false,
          "title": "Pune Break Day + Bollywood Movie",
          "activities": [
            "Morning arrival and check-in in Pune.",
            "A genuine laundry day — slow down for once.",
            "Explore Pune's malls independently (Ola / Uber).",
            "Evening Bollywood movie together.",
            "Sleep early — tomorrow is a big day."
          ]
        },
        {
          "type": "day",
          "dayNumber": "7",
          "festive": true,
          "title": "Anant Chaturdashi Miravnuk Experience",
          "activities": [
            "Saree or traditional attire, early start.",
            "Visit the Ganpati mandals: Dagdusheth Halwai, Tulshibaug, Kasba Ganpati.",
            "Walk the procession in traditional Indian dress.",
            "Dhol-tasha performances and traditional lezim groups — massive cultural energy.",
            "Street food during the procession; late-evening celebrations and photography."
          ]
        },
        {
          "type": "note",
          "text": "Day 7 tends to run long — walking without much food, and a late night. Keep Day 6 short and start Day 8 late."
        },
        {
          "type": "day",
          "dayNumber": "8",
          "festive": false,
          "title": "Pune Heritage Exploration",
          "activities": [
            "Morning visit to Shaniwar Wada.",
            "Lal Mahal and a look into Maratha history.",
            "Authentic Maharashtrian lunch — Sukanta Thali.",
            "Evening spiritual visit to ISKCON NVCC Temple.",
            "Back to the room, and a proper night's sleep."
          ]
        },
        {
          "type": "day",
          "dayNumber": "9",
          "festive": false,
          "title": "Mumbai Drop + Enroute Sightseeing",
          "activities": [
            "Start the day around 10am.",
            "Visit Lonavala and 2–3 local spots on the way.",
            "Leave Lonavala for Mumbai by 4pm, reaching the airport by around 7pm.",
            "Trip ends with happy memories."
          ]
        }
      ]
    },
    "inclusions": {
      "heading": "What's covered",
      "includedTitle": "What's included",
      "included": [
        "Lodging in Mumbai, Goa and Pune — homestays, hotels or hostels.",
        "Sightseeing bus tickets for Mumbai.",
        "Organised sightseeing tours for Pune and Goa.",
        "Breakfast and meals on all days, except one breakfast and one dinner in Goa, and the last day's dinner.",
        "Inland bus and train tickets.",
        "A cultural kit with insights from an Indian perspective.",
        "An identity card and welcome kit."
      ],
      "includedNote": "Museums, national parks and forts may charge separate entry — payable at the counter.",
      "excludedTitle": "What's not included",
      "excluded": [
        "Visa fees and flights.",
        "Sightseeing beyond the venue itself.",
        "Venue entry fees — these vary by nationality.",
        "Any medical or unforeseen expense.",
        "À la carte orders outside breakfast and dinner.",
        "Shopping of any kind, and SIM card charges.",
        "Any extended stay."
      ],
      "excludedNote": "If you'd like to extend your stay in India beyond this trip, we're happy to suggest places and help you plan it."
    },
    "packing": {
      "heading": "What to pack",
      "subtitle": "Aside from these, it's up to you what else you bring along.",
      "categories": [
        {
          "title": "Clothing",
          "items": [
            "1 formal outfit",
            "1 black t-shirt (group colour)",
            "1 white t-shirt (group colour)",
            "Full-body outfit + scarf for women, at least one set"
          ]
        },
        {
          "title": "Cultural",
          "items": [
            "A cultural kit from your own country",
            "Your national flag",
            "Ideas: spice mix, instant noodles, a local keychain or fridge magnet"
          ]
        },
        {
          "title": "Utilities & docs",
          "items": [
            "Personal medication, if any",
            "Passport and visa copy"
          ]
        },
        {
          "title": "Travel utilities",
          "items": [
            "A small backpack for outdoors",
            "A water bottle",
            "Keep your primary luggage light and easy to carry"
          ]
        },
        {
          "title": "Rain gear",
          "items": [
            "1 pair of flip-flops",
            "A rain coat (upper body)",
            "An umbrella"
          ]
        },
        {
          "title": "Footwear",
          "items": [
            "1 pair of flip-flops or sandals (for rain)",
            "1 pair of good-grip shoes for trekking",
            "1 pair of everyday sneakers"
          ]
        }
      ]
    },
    "eligibility": {
      "heading": "Who this trip is for",
      "criteria": [
        "Young adults, preferably 18 to 30 years old.",
        "Comfortable communicating in English.",
        "Self-reliant, adaptable, and respectful of cultural differences.",
        "Rotary youth, Rotaractors, and friends of Rotary families in the age bracket are warmly encouraged to join."
      ],
      "note": "Seats are limited, and the itinerary can shift at short notice — this trip suits travellers who can roll with that.",
      "priceLabel": "Trip cost",
      "price": "USD 380–415",
      "priceNote": "per person · entry/monument fees, visa and flights not included"
    },
    "faq": {
      "heading": "Questions people ask",
      "items": [
        {
          "question": "Will you provide any certificate?",
          "answer": "Yes — an arrival kit and certificate are planned, along with an ID card and a button badge."
        },
        {
          "question": "Do we need to carry travel insurance?",
          "answer": "Yes, we suggest carrying your own travel insurance for your safety."
        },
        {
          "question": "Should we carry cash, or will an international debit card work?",
          "answer": "Cash is suggested, depending on your spending habits. It's also worth looking into UPI, India's QR-code payment system, before you land."
        },
        {
          "question": "What if we have WFH commitments — will WiFi be available?",
          "answer": "A local SIM (Reliance Jio or Airtel) gets you around 3GB/day for roughly $6, enough for remote work. Airtel can usually be picked up right at the airport — just confirm the deal before you pay."
        },
        {
          "question": "Are smoking and drinking alcohol allowed?",
          "answer": "Smoking is best kept to designated areas, away from the group. Part of this itinerary passes through a dry state where alcohol is illegal under state law — vapes and e-cigarettes are best left at home too."
        },
        {
          "question": "What should I pack for the trip?",
          "answer": "Light cotton clothing, comfortable walking shoes, power adapters, sunscreen, basic medicines, a reusable water bottle, and modest clothing for cultural sites. See the checklist below for the full list."
        },
        {
          "question": "Is India safe for international travellers?",
          "answer": "Yes, especially in tourist-friendly regions — the usual precautions apply: avoid isolated areas late at night and keep valuables secure."
        },
        {
          "question": "Can I arrange my own transport or extend my stay?",
          "answer": "Yes. You're free to customise your post-tour plans, and we're happy to point you in the right direction — though shared transport is used on itinerary days."
        },
        {
          "question": "What about medication and first aid?",
          "answer": "Bring any prescribed medication with you. Sleep medication in particular isn't sold over the counter in India without a local prescription."
        },
        {
          "question": "How do we get around on break days?",
          "answer": "Tuk-tuks, cabs, and apps like Ola, Uber, or Rapido all work well — travel on these is at your own responsibility."
        }
      ]
    },
    "footer": {
      "image": "https://images.unsplash.com/photo-1732960251840-f6d2c1810f1e?fm=jpg&q=80&w=2400&auto=format&fit=crop",
      "imageAlt": "Ganpati procession idol in Mumbai",
      "thanksText": "Thank You",
      "dates": "19–27 September 2026",
      "logo": "../../assets/images/roams/goanique-logo.png",
      "logoAlt": "Goanique Ganeshika logo",
      "presentedBy": "Presented by EPSOT | Embark Pedia"
    }
  }
};
