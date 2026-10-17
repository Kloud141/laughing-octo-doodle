/**
 * datasets.js
 * ------------------------------------------------------------------
 * Single source of truth for destinations and the vendor trips
 * (tours) offered at each one. Used by:
 *   - destinations/destination-list.html  (grid of destinations)
 *   - destinations/destination-tours.html (tours for ?destination=<slug>)
 *   - destinations/tour-details.html      (one tour, via ?article=<articleId>)
 *
 * Add a destination or a tour here and both pages pick it up.
 * Prices are per person, in INR. Tour images fall back to the
 * destination image unless a tour sets its own `image`.
 *
 * Every tour carries two generated identifiers:
 *   - articleId: 12 chars from [a-z0-9], written as two hyphen-separated
 *     groups of 5-7 chars each (e.g. "hbrpoig-8f1cb"). This is the id
 *     tour-details.html looks up via its `?article=` query param, and
 *     what destination-tours.html's "Show Details" links point at.
 *   - voyageId: a 6-char [a-z0-9] booking reference, unique per tour,
 *     sent along with the "Enquire about this trip" form on
 *     tour-details.html so an enquiry can be matched back to the tour.
 * Both are unique across the whole dataset.
 *
 * Source: tour content transformed from vendor itinerary PDFs
 * (MakeMyTrip / Yatra package screenshots) supplied for each
 * destination folder. Tour names were rewritten from scratch; no
 * names, offers, or personal data from the source documents were
 * carried over. Listed prices are 3/5 of the originally quoted
 * per-adult package price.
 * ------------------------------------------------------------------
 */
var DESTINATIONS_DATA = [
  {
    "slug": "vaishno-devi",
    "name": "Vaishno Devi",
    "region": "Spiritual",
    "image": "https://images.unsplash.com/photo-1591018534326-fbc7c1a5b1c4?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "A cave shrine in the Trikuta hills, reached on foot, on pony, or by faith alone.",
    "tours": [
      {
        "title": "Sacred Katra Darshan Weekend",
        "days": 3,
        "nights": 2,
        "category": "Spiritual",
        "price": 3230,
        "articleId": "8ob3du-6hdpit",
        "voyageId": "cu8wuc"
      },
      {
        "title": "Vaishno Devi to the Vale of Kashmir",
        "days": 8,
        "nights": 7,
        "category": "Group",
        "price": 11990,
        "articleId": "o9b4kfe-l3gux",
        "voyageId": "ntcchy"
      }
    ]
  },
  {
    "slug": "varanasi-ayodhya-prayagraj",
    "name": "Varanasi, Ayodhya & Prayagraj",
    "region": "Spiritual",
    "image": "https://images.unsplash.com/photo-1561361058-c24cecae35ca?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Ghats, temples and the sangam of three rivers along the Gangetic plain.",
    "tours": [
      {
        "title": "Ganga Aarti & Ram Janmabhoomi Trail",
        "days": 5,
        "nights": 4,
        "category": "Spiritual",
        "price": 13370,
        "articleId": "1q7nig-2ckrmq",
        "voyageId": "vcsfm7"
      },
      {
        "title": "Riverside Varanasi Retreat",
        "days": 4,
        "nights": 3,
        "category": "Cultural",
        "price": 18770,
        "articleId": "by1u5l-zvuq48",
        "voyageId": "rxczx9"
      },
      {
        "title": "Ayodhya Ram Mandir & Kashi Pilgrimage",
        "days": 5,
        "nights": 4,
        "category": "Spiritual",
        "price": 18610,
        "articleId": "knyaqg-ec1eio",
        "voyageId": "5cqt53"
      },
      {
        "title": "Triveni Sangam & Twin Cities Circuit",
        "days": 6,
        "nights": 5,
        "category": "Group",
        "price": 11950,
        "articleId": "kom58fg-iirvj",
        "voyageId": "apnu8y"
      }
    ]
  },
  {
    "slug": "mathura-vrindavan",
    "name": "Mathura & Vrindavan",
    "region": "Spiritual",
    "image": "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Krishna's birthplace and childhood home, alive with temple bells and raslila.",
    "tours": [
      {
        "title": "Krishna Janmabhoomi & Taj Explorer",
        "days": 5,
        "nights": 4,
        "category": "Spiritual",
        "price": 10830,
        "articleId": "8x0q58y-uooro",
        "voyageId": "g9pdvd"
      },
      {
        "title": "Braj Bhoomi Temple Trail",
        "days": 4,
        "nights": 3,
        "category": "Spiritual",
        "price": 8230,
        "articleId": "fdna5wf-jmne4",
        "voyageId": "9qrddm"
      },
      {
        "title": "Mathura-Agra Heritage Weekend",
        "days": 4,
        "nights": 3,
        "category": "Cultural",
        "price": 6200,
        "articleId": "rysh8n-y61kxd",
        "voyageId": "4s6mit"
      },
      {
        "title": "Timeless Agra & Mathura Getaway",
        "days": 4,
        "nights": 3,
        "category": "Cultural",
        "price": 11000,
        "articleId": "li39433-0ismb",
        "voyageId": "bkjy8q"
      }
    ]
  },
  {
    "slug": "chennai-pondicherry",
    "name": "Chennai & Pondicherry",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Dravidian temple towns meet French promenades along the Coromandel coast.",
    "tours": [
      {
        "title": "Shore Temples & French Quarter Escape",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 9630,
        "articleId": "98nhihh-w64rx",
        "voyageId": "2dx621"
      },
      {
        "title": "Pondicherry Promenade Break",
        "days": 4,
        "nights": 3,
        "category": "Couple",
        "price": 6960,
        "articleId": "6pwd8z-q0df9a",
        "voyageId": "vqxwvr"
      },
      {
        "title": "South India Church Heritage Circuit",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 11410,
        "articleId": "fta20d-0f9h5b",
        "voyageId": "hs1lt4"
      }
    ]
  },
  {
    "slug": "coorg-ooty-kodaikanal",
    "name": "Coorg, Ooty & Kodaikanal",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Coffee estates, misty viewpoints and toy-train hill stations of the Western Ghats.",
    "tours": [
      {
        "title": "Mysore Palace & Bandipur Jungle Trail",
        "days": 5,
        "nights": 4,
        "category": "Adventure",
        "price": 18940,
        "articleId": "6mqv6-p7stsap",
        "voyageId": "ga2gr0"
      },
      {
        "title": "Coorg & Wayanad Rainforest Retreat",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 11860,
        "articleId": "cytr15c-gbdqb",
        "voyageId": "6cl9vh"
      },
      {
        "title": "Nilgiris Grand Hill Trail",
        "days": 5,
        "nights": 4,
        "category": "Group",
        "price": 24720,
        "articleId": "qtr7z5-7ju74e",
        "voyageId": "epcicy"
      },
      {
        "title": "Ooty & Coorg Misty Hills Escape",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 18610,
        "articleId": "6fzxf-58h8or9",
        "voyageId": "3fpsmh"
      }
    ]
  },
  {
    "slug": "delhi-agra",
    "name": "Delhi & Agra",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1548013146-72479768bada?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Mughal monuments and a living capital, from Red Fort to Taj Mahal.",
    "tours": [
      {
        "title": "Capital, Taj & Pink City Circuit",
        "days": 6,
        "nights": 5,
        "category": "Group",
        "price": 17630,
        "articleId": "dnmqzn-sk8e7i",
        "voyageId": "5dj6g1"
      }
    ]
  },
  {
    "slug": "himachal-pradesh",
    "name": "Himachal Pradesh",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Pine-covered ridgelines, colonial hill towns and valleys that empty into snow.",
    "tours": [
      {
        "title": "Grand Himachal Hill Circuit",
        "days": 10,
        "nights": 9,
        "category": "Group",
        "price": 13600,
        "articleId": "4y8ots-rlk2g6",
        "voyageId": "jadjvi"
      },
      {
        "title": "Dalhousie-Khajjiar Trail with Amritsar",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 9060,
        "articleId": "5qmt7j-esidfb",
        "voyageId": "hlk1ks"
      },
      {
        "title": "Dharamshala, Dalhousie & Golden Temple Tour",
        "days": 7,
        "nights": 6,
        "category": "Cultural",
        "price": 10330,
        "articleId": "j29ba-s9siqxx",
        "voyageId": "xt58lh"
      },
      {
        "title": "Himachal Panorama Journey",
        "days": 10,
        "nights": 9,
        "category": "Group",
        "price": 14720,
        "articleId": "m3zwo-mbec0jf",
        "voyageId": "d45yki"
      },
      {
        "title": "Khajjiar Meadows & Amritsar Express",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 10690,
        "articleId": "bgjanl-9lb5hg",
        "voyageId": "mdkxi1"
      },
      {
        "title": "Kullu Valley Misty Escape",
        "days": 4,
        "nights": 3,
        "category": "Couple",
        "price": 3260,
        "articleId": "jdoba-kivt1xz",
        "voyageId": "5ol9f0"
      },
      {
        "title": "Shimla-Manali Classic Hill Trail",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 9600,
        "articleId": "f3zspzs-61u3a",
        "voyageId": "y2z8xd"
      },
      {
        "title": "Heritage Shimla Weekend",
        "days": 4,
        "nights": 3,
        "category": "Couple",
        "price": 8220,
        "articleId": "emd4u-wwyra20",
        "voyageId": "stxc0j"
      }
    ]
  },
  {
    "slug": "kashmir",
    "name": "Kashmir",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1566837497312-7be4c17b7a28?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Houseboats on Dal Lake, meadows at Gulmarg, and apple orchards in bloom.",
    "tours": [
      {
        "title": "Dal Lake Houseboat & Gulmarg Meadows",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 10830,
        "articleId": "4i1ix-q4c6kbw",
        "voyageId": "hvlxyw"
      },
      {
        "title": "Pahalgam Pines & Gulmarg Gondola Trip",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 10200,
        "articleId": "acjyy-yksqqe6",
        "voyageId": "h97aq3"
      },
      {
        "title": "Srinagar Shikara & Pahalgam Valley Trail",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 8850,
        "articleId": "9n67cd-0jmvwk",
        "voyageId": "enr5of"
      }
    ]
  },
  {
    "slug": "kerala",
    "name": "Kerala",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Backwaters, tea hills and spice-scented air along God's Own Country.",
    "tours": [
      {
        "title": "Cochin to Varkala Backwater Trail",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 12610,
        "articleId": "yo0one-llmo7h",
        "voyageId": "a0jco5"
      },
      {
        "title": "Munnar, Thekkady & Kovalam Grand Tour",
        "days": 8,
        "nights": 7,
        "category": "Group",
        "price": 22710,
        "articleId": "mpjbd-4k7ijsg",
        "voyageId": "n853w6"
      },
      {
        "title": "Munnar Hills & Alleppey Houseboat Escape",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 12120,
        "articleId": "tzb0q1x-kb7eq",
        "voyageId": "mk09jx"
      },
      {
        "title": "Cochin, Munnar & Thekkady Short Break",
        "days": 5,
        "nights": 4,
        "category": "Cultural",
        "price": 9080,
        "articleId": "ryexcs-3tql1p",
        "voyageId": "tiguln"
      }
    ]
  },
  {
    "slug": "mumbai-pune-konkan",
    "name": "Mumbai, Pune & Konkan",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1620766165457-a8025baa82e0?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Deccan hill stations, pilgrim towns and tiger country rolled into one.",
    "tours": [
      {
        "title": "Lonavala & Mahabaleshwar Monsoon Retreat",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 21530,
        "articleId": "ha5n0hj-1rumy",
        "voyageId": "t24d6n"
      },
      {
        "title": "Nashik-Shirdi-Aurangabad Pilgrim Trail",
        "days": 7,
        "nights": 6,
        "category": "Spiritual",
        "price": 20060,
        "articleId": "q845abz-6rvao",
        "voyageId": "7349id"
      },
      {
        "title": "Tadoba Tiger Trail from Nagpur",
        "days": 3,
        "nights": 2,
        "category": "Adventure",
        "price": 10170,
        "articleId": "f8d3z-46d1aeu",
        "voyageId": "bz8wtp"
      }
    ]
  },
  {
    "slug": "nainital-rishikesh-corbett",
    "name": "Nainital, Rishikesh & Corbett",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1544634076-a90160ddf44d?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Lake-view hill towns, river rapids and a national park famous for its tigers.",
    "tours": [
      {
        "title": "Nainital Lakes & Corbett Safari Special",
        "days": 5,
        "nights": 4,
        "category": "Adventure",
        "price": 18110,
        "articleId": "dk7gj-2at9kl4",
        "voyageId": "istbox"
      },
      {
        "title": "Ranikhet Pines & Corbett Wildlife Trail",
        "days": 5,
        "nights": 4,
        "category": "Adventure",
        "price": 9250,
        "articleId": "arypj-y7ibmpy",
        "voyageId": "h20sh8"
      },
      {
        "title": "Nainital & Mussoorie Hill Loop",
        "days": 6,
        "nights": 5,
        "category": "Group",
        "price": 9470,
        "articleId": "1gqj6d-wv6r6c",
        "voyageId": "v7bavo"
      },
      {
        "title": "Haridwar to Corbett Grand Uttarakhand Tour",
        "days": 9,
        "nights": 8,
        "category": "Group",
        "price": 14780,
        "articleId": "co65097-lg70b",
        "voyageId": "xnnlga"
      }
    ]
  },
  {
    "slug": "rajasthan",
    "name": "Rajasthan",
    "region": "Indian",
    "image": "https://images.unsplash.com/photo-1477587458883-47145ed94245?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Desert forts, painted havelis and camel dunes across the land of kings.",
    "tours": [
      {
        "title": "Udaipur Lakeside Escape",
        "days": 4,
        "nights": 3,
        "category": "Couple",
        "price": 8570,
        "articleId": "cp5u1n-1l2dzh",
        "voyageId": "tql0rw"
      },
      {
        "title": "Udaipur & Mount Abu Hilltop Break",
        "days": 4,
        "nights": 3,
        "category": "Couple",
        "price": 18650,
        "articleId": "31bbc-7j06mj8",
        "voyageId": "wjzlja"
      },
      {
        "title": "Jaipur-Jodhpur-Jaisalmer Royal Trail",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 21080,
        "articleId": "6w7air8-8njpr",
        "voyageId": "7g2031"
      },
      {
        "title": "Marwar Desert Dunes & Dining Trail",
        "days": 7,
        "nights": 6,
        "category": "Adventure",
        "price": 15550,
        "articleId": "i5q2vso-foxrt",
        "voyageId": "fpdcwh"
      },
      {
        "title": "Rajasthan Royal Honeymoon Trail",
        "days": 9,
        "nights": 8,
        "category": "Couple",
        "price": 28560,
        "articleId": "rzqipw-y04xe4",
        "voyageId": "kun0hi"
      },
      {
        "title": "Grand Rajasthan Desert Expedition",
        "days": 10,
        "nights": 9,
        "category": "Group",
        "price": 26590,
        "articleId": "ik6gc-jisxdqb",
        "voyageId": "a5iqn5"
      },
      {
        "title": "Udaipur to Jaisalmer Desert Road Trip",
        "days": 6,
        "nights": 5,
        "category": "Adventure",
        "price": 15680,
        "articleId": "eg9u7-n5qj18d",
        "voyageId": "vwhnfh"
      },
      {
        "title": "Rajputana Romance Trail",
        "days": 9,
        "nights": 8,
        "category": "Couple",
        "price": 23080,
        "articleId": "b0633o-nwcbrr",
        "voyageId": "o2xftx"
      },
      {
        "title": "Finest of Marwar & Mewar Circuit",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 18690,
        "articleId": "zokl8l-umo59n",
        "voyageId": "h0ha6p"
      }
    ]
  },
  {
    "slug": "malaysia-singapore",
    "name": "Malaysia & Singapore",
    "region": "International",
    "image": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Skyline gardens, island beaches and hawker food across two nations.",
    "tours": [
      {
        "title": "Petronas Towers City Break",
        "days": 5,
        "nights": 4,
        "category": "Cultural",
        "price": 11060,
        "articleId": "o5qfa-tx6dwns",
        "voyageId": "fks7dr"
      },
      {
        "title": "Singapore, KL & Bali Grand Tour",
        "days": 11,
        "nights": 10,
        "category": "Group",
        "price": 67870,
        "articleId": "k4b6l-vwdzy6x",
        "voyageId": "4wwhru"
      },
      {
        "title": "Langkawi & Penang Island Hopper",
        "days": 7,
        "nights": 6,
        "category": "Couple",
        "price": 37360,
        "articleId": "osnei-06bu1b4",
        "voyageId": "evtwlp"
      },
      {
        "title": "Marina Bay & KL Twin City Saver",
        "days": 6,
        "nights": 5,
        "category": "Group",
        "price": 39790,
        "articleId": "ionsga9-qqw34",
        "voyageId": "3ocmn2"
      },
      {
        "title": "Kuala Lumpur & Bali Island Combo",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 34050,
        "articleId": "sbwc01s-bsn8e",
        "voyageId": "4903g9"
      }
    ]
  },
  {
    "slug": "nepal-bhutan",
    "name": "Nepal & Bhutan",
    "region": "International",
    "image": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Himalayan kingdoms of stupas, dzongs and the world's highest peaks.",
    "tours": [
      {
        "title": "Thimphu, Punakha & Paro Dzong Trail",
        "days": 9,
        "nights": 8,
        "category": "Cultural",
        "price": 35630,
        "articleId": "k32yzh-3vjlw6",
        "voyageId": "qj8rvw"
      },
      {
        "title": "Bumthang & Phobjikha Valley Discovery",
        "days": 11,
        "nights": 10,
        "category": "Cultural",
        "price": 40790,
        "articleId": "lbgf7-y6g2etw",
        "voyageId": "m5tu5d"
      },
      {
        "title": "Kathmandu & Pokhara Couple's Escape",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 18510,
        "articleId": "wo2j9um-1pg0b",
        "voyageId": "3jx9vx"
      },
      {
        "title": "Luxury Thimphu & Paro Retreat",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 60210,
        "articleId": "00hkwp-nbrwbb",
        "voyageId": "ukstok"
      },
      {
        "title": "Classic Paro Valley & Thimphu Trail",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 37760,
        "articleId": "hwre7-ifdw52o",
        "voyageId": "jaxumx"
      },
      {
        "title": "Punakha Valley & Paro Grand Tour",
        "days": 8,
        "nights": 7,
        "category": "Group",
        "price": 31820,
        "articleId": "vsrfac-agf6dw",
        "voyageId": "xhosxx"
      },
      {
        "title": "Paro & Thimphu Short Escape",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 13480,
        "articleId": "3glkb6-2za40q",
        "voyageId": "0qidib"
      },
      {
        "title": "Kathmandu, Pokhara & Nagarkot Explorer",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 19230,
        "articleId": "677jbw-yy78k7",
        "voyageId": "6dsg64"
      },
      {
        "title": "Kathmandu Weekend Discovery",
        "days": 4,
        "nights": 3,
        "category": "Cultural",
        "price": 5300,
        "articleId": "80l5l-i6wyx9q",
        "voyageId": "4z4p0u"
      },
      {
        "title": "Pokhara Lakeside & Kathmandu Trail",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 13010,
        "articleId": "2ovugb-ewf9zb",
        "voyageId": "exbcb4"
      },
      {
        "title": "Nepal Twin City Heritage Tour",
        "days": 5,
        "nights": 4,
        "category": "Cultural",
        "price": 14080,
        "articleId": "h8tx51-znihb8",
        "voyageId": "61d1wr"
      }
    ]
  },
  {
    "slug": "thailand",
    "name": "Thailand",
    "region": "International",
    "image": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Golden temples, limestone islands and street food from Bangkok to Phuket.",
    "tours": [
      {
        "title": "Pattaya Beaches & Bangkok City Lights",
        "days": 5,
        "nights": 4,
        "category": "Group",
        "price": 10890,
        "articleId": "d1hlp-ajkznl8",
        "voyageId": "s4wbop"
      },
      {
        "title": "Krabi Cliffs & Phuket Beach Combo",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 15910,
        "articleId": "mzth5-d3gah19",
        "voyageId": "arr2gr"
      },
      {
        "title": "Krabi, Phi Phi & Phuket Island Trail",
        "days": 7,
        "nights": 6,
        "category": "Couple",
        "price": 31840,
        "articleId": "8suf37-if71r9",
        "voyageId": "udld76"
      },
      {
        "title": "Phuket Beach Value Break",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 7920,
        "articleId": "d5ahj6s-n5iqt",
        "voyageId": "11xmlf"
      },
      {
        "title": "Phuket, Koh Samui & Bangkok Grand Tour",
        "days": 8,
        "nights": 7,
        "category": "Group",
        "price": 43410,
        "articleId": "x0gp1u-eq5igk",
        "voyageId": "z4ffil"
      },
      {
        "title": "Khao Lak & Phuket Coastal Escape",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 26210,
        "articleId": "mi8j89f-xhffk",
        "voyageId": "kjd6k5"
      },
      {
        "title": "Chiang Mai, Chiang Rai & Bangkok Heritage Trail",
        "days": 8,
        "nights": 7,
        "category": "Cultural",
        "price": 63750,
        "articleId": "bo2ysw-qfvo06",
        "voyageId": "pu0piz"
      }
    ]
  },
  {
    "slug": "dubai-saudi-oman-qatar",
    "name": "Dubai, Saudi Arabia, Oman & Qatar",
    "region": "International",
    "image": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?fm=jpg&q=80&w=900&auto=format&fit=crop",
    "blurb": "Desert dunes, futuristic skylines and ancient Arabian coastlines.",
    "tours": [
      {
        "title": "Dubai Skyline & Abu Dhabi Free Nights",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 37340,
        "articleId": "z4yxqlw-dp2zw",
        "voyageId": "jpqwoy"
      },
      {
        "title": "Doha Desert & Heritage City Break",
        "days": 4,
        "nights": 3,
        "category": "Cultural",
        "price": 20900,
        "articleId": "6la36-djhz8hm",
        "voyageId": "4qhra2"
      },
      {
        "title": "Dubai Towers & Doha Skyline Combo",
        "days": 6,
        "nights": 5,
        "category": "Group",
        "price": 54570,
        "articleId": "so8hyo-1e9mcj",
        "voyageId": "oappzm"
      },
      {
        "title": "Doha Grand City Escape",
        "days": 5,
        "nights": 4,
        "category": "Group",
        "price": 30430,
        "articleId": "dko889-8qf7c2",
        "voyageId": "gxz3fx"
      },
      {
        "title": "Dubai Delight City Break",
        "days": 7,
        "nights": 6,
        "category": "Couple",
        "price": 25860,
        "articleId": "qkte4m-4jnjpg",
        "voyageId": "azkikr"
      },
      {
        "title": "Dubai & Beachfront Sharjah Stay",
        "days": 6,
        "nights": 5,
        "category": "Couple",
        "price": 30620,
        "articleId": "wd6fkn-dul7tm",
        "voyageId": "uxhckv"
      },
      {
        "title": "Dubai Towers & Muscat Fjords Trail",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 41480,
        "articleId": "fi1mf62-g6v2y",
        "voyageId": "624hyt"
      },
      {
        "title": "Three Emirates Grand Tour",
        "days": 7,
        "nights": 6,
        "category": "Group",
        "price": 42050,
        "articleId": "4yeep3r-ur6zi",
        "voyageId": "fv0flz"
      },
      {
        "title": "Muscat & Jabal Akhdar Mountain Escape",
        "days": 6,
        "nights": 5,
        "category": "Cultural",
        "price": 24220,
        "articleId": "x4np8c-wwbvy7",
        "voyageId": "l9sr6b"
      },
      {
        "title": "Muscat Oasis Weekend",
        "days": 5,
        "nights": 4,
        "category": "Couple",
        "price": 18960,
        "articleId": "oedxm2t-6kmjb",
        "voyageId": "kmrm95"
      },
      {
        "title": "Oman & Saudi Arabia Discovery Trail",
        "days": 8,
        "nights": 7,
        "category": "Cultural",
        "price": 47320,
        "articleId": "9x2llk-vw2b05",
        "voyageId": "tbkag7"
      },
      {
        "title": "Muscat City & Coast Short Break",
        "days": 4,
        "nights": 3,
        "category": "Couple",
        "price": 10940,
        "articleId": "1cstnfy-y5cbw",
        "voyageId": "wgx5pd"
      }
    ]
  }
];

var DESTINATIONS_BY_SLUG = {};
for (var i = 0; i < DESTINATIONS_DATA.length; i++) {
  DESTINATIONS_BY_SLUG[DESTINATIONS_DATA[i].slug] = DESTINATIONS_DATA[i];
}
