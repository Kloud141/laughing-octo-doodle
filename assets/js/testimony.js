/**
 * testimony.js - single source of truth for traveller testimonials.
 * Used by:
 *   - index.html        (dual-card carousel,   testimony-dual-carousel.js)
 *   - about/about.html  (flip carousel,        testimony-carousel.js)
 * Add, edit or remove a story here and both pages update.
 *
 * Image paths are relative to /assets/ and resolved from this script's own
 * location, so they work from any page depth:
 *   photo -> assets/images/testimony/<file>.jpg        (trip photo / avatar)
 *   bg    -> assets/images/testimony/bg/testimony-N.png (flip-card background, about page)
 * Load this file BEFORE the carousel script.
 */
(function () {
  "use strict";
  var src = (document.currentScript && document.currentScript.src) || "";
  var base = src.replace(/js\/testimony\.js(\?.*)?$/, "");

  var data = [
  {"name": "DHAVAL JADHAV", "place": "Leh", "date": "October-2024", "quote": "After meeting a group of like-minded people from all around India, we traveled to Leh together as a wolf pack of old friends. The trip was meticulously planned, and our trip manager was always on hand to provide any assistance we needed. We got to see Leh as it is in the region. Thanks to Embark Pedia's strategically arranged visits, we were able to view all the magnificent wonders worldwide, awaiting the upcoming plans! Comforts of nature, the comfort food, the culture, the people, the streets ... everything was LIT.", "photo": "images/testimony/leh.jpg", "bg": "images/testimony/bg/testimony-1.png"},
  {"name": "MAYUR SHINDE", "place": "Goa", "date": "July-2026", "quote": "A deeply moving experience. Thanks to you everyone, this tour was a success. This vacation was precisely planned and tailored to fit the restrictions and adjustments, thanks to the hotel, the cuisine, the guide, and the transport and tour program that included visiting important sights in Goa. || I appreciate your hard work. It was my 1st trip and travelling without any hassle was only possible cause of you guys.", "photo": "images/testimony/goa-beach.jpg", "bg": "images/testimony/bg/testimony-5.png"},
  {"name": "SAACHI BAGHEL", "place": "Rajasthan", "date": "May-2022", "quote": "Rajasthan trip was like a dream come true. Meeting so many new people and getting together so well. Best part of the trip was the itinerary was never forced on someone and spots were so perfectly planned that we couldn't deny. Also they had taken care of all aspects like Group, Couple, Solo travelers anyone could easily fit in the itinerary. Udaipur was the best part and I am sure that I am traveling with Embark Pedia real soon.", "photo": "images/testimony/rajasthan.jpg", "bg": "images/testimony/bg/testimony-2.png"},
  {"name": "SHANTANU SINHA", "place": "Kedarkanth", "date": "December-2021", "quote": "Traveling for me puts things into perspective. It allows me to realize that there are far bigger things. So what if the wifi is slow or if my favorite ramen place is closed. Traveling allows you to see that the world is not always about you. It allows me to see how other people live and what they have to deal with on a daily basis. || Increasing appetite to climb more heights helped me to get through the Kedarkanth. Embark Pedia was best companion.", "photo": "images/testimony/kedarkanth.jpg", "bg": "images/testimony/bg/testimony-3.png"},
  {"name": "SUHASI BUCHE", "place": "Goa", "date": "March-2022", "quote": "The ideal action-packed vacation in the beautiful Goa! Meeting up with active, like-minded travelers and touring the island with them significantly increased the enjoyment factor! from experiencing exhilarating activities and being free to travel independently! || Overall, the accommodations were really good, and the stay was hassle-free and comfortable. I wholeheartedly endorse it! || LOVE EMBARK PEDIA", "photo": "images/testimony/goa-north.jpg", "bg": "images/testimony/bg/testimony-4.png"},
  {"name": "UTKARSH DAVE", "place": "Pune", "date": "August-2019", "quote": "Driving from the misty Western Ghats into Pune for Ganpati was a dream, and Embark Pedia made it flawless. They handled the entire route, from scenic mountain stays to securing prime spots for the grand visarjan. Our manager anticipated every need, keeping the journey smooth and festive. A perfect blend of nature, culture, and pure celebration. Truly a Ganpati experience like no other.", "photo": "images/testimony/western-ghats.jpg", "bg": "images/testimony/bg/testimony-6.png"},
  {"name": "GAURAV BORSE", "place": "Thailand", "date": "November-2026", "quote": "The boys and I finally made it happen. A bachelor trip across Thailand, and Embark Pedia made sure we didn't lift a finger. From the street food of Bangkok to the full-moon energy of Phuket and cliff-jumping in Krabi, every day hit different. The itinerary was built for us: late starts, beach clubs, and island hops. Our manager sorted transfers, stays, and local spots. Brotherhood, beers and breathtaking views. This trip was perfect before the big day. Embark Pedia nailed it...", "photo": "images/testimony/ooty.jpg", "bg": "images/testimony/bg/testimony-7.png"},
  {"name": "TINA MAKHIJA", "place": "Vietnam", "date": "October-2023", "quote": "Fourteen girls, zero plans, and total trust in Embark Pedia. That's how our Vietnam trip began. We wanted beaches, rural charm, and safety on our own terms. From quiet fishing villages to the turquoise waters of Phu Quoc and the misty countryside of Ninh Binh, every stop was magical. Our manager checked in subtly, homestays were secure, and the pace was perfect. We returned with sunkissed skin, 100 photos, and a bond no city trip could give. Solo travel, never alone.", "photo": "images/testimony/vietnam.jpg", "bg": "images/testimony/bg/testimony-8.png"}
  ];

  window.TESTIMONIALS = data.map(function (t) {
    return {
      name: t.name, place: t.place, date: t.date, quote: t.quote,
      photo: base + t.photo,
      img: base + t.bg
    };
  });
})();
