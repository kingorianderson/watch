import type { FranchiseUniverse } from '../types/media';

export const FRANCHISES: FranchiseUniverse[] = [
  {
    id: 'mcu',
    slug: 'mcu',
    name: 'Marvel Cinematic Universe',
    tagline: 'The Infinity Saga & The Multiverse Saga in Story Order',
    description: 'Experience Earth’s Mightiest Heroes across all phases, from the birth of Captain America in WWII to the multiverse incursions.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',
    accentColor: '#e50914',
    phases: [
      {
        phaseTitle: 'Phase 1: Assemble',
        description: 'The foundation of the MCU leading to the first gathering of the Avengers.',
        items: [
          { tmdbId: 1771, type: 'movie', title: 'Captain America: The First Avenger', year: 2011, order: 1, chronologicalNote: 'WWII setting (1942–1945)' },
          { tmdbId: 299537, type: 'movie', title: 'Captain Marvel', year: 2019, order: 2, chronologicalNote: '1995 Setting' },
          { tmdbId: 1726, type: 'movie', title: 'Iron Man', year: 2008, order: 3, chronologicalNote: '2010 Setting' },
          { tmdbId: 10138, type: 'movie', title: 'Iron Man 2', year: 2010, order: 4, chronologicalNote: '2011 Setting' },
          { tmdbId: 1724, type: 'movie', title: 'The Incredible Hulk', year: 2008, order: 5, chronologicalNote: '2011 Setting' },
          { tmdbId: 10195, type: 'movie', title: 'Thor', year: 2011, order: 6, chronologicalNote: '2011 Setting' },
          { tmdbId: 24428, type: 'movie', title: 'The Avengers', year: 2012, order: 7, chronologicalNote: 'The Battle of New York (2012)' },
        ]
      },
      {
        phaseTitle: 'Phase 2: Age of Heroes',
        description: 'New threats emerge as the cosmos expands and Hydra infiltrates SHIELD.',
        items: [
          { tmdbId: 68721, type: 'movie', title: 'Iron Man 3', year: 2013, order: 8, chronologicalNote: 'Post-Avengers trauma' },
          { tmdbId: 76338, type: 'movie', title: 'Thor: The Dark World', year: 2013, order: 9, chronologicalNote: 'The Reality Stone (Aether)' },
          { tmdbId: 100402, type: 'movie', title: 'Captain America: The Winter Soldier', year: 2014, order: 10, chronologicalNote: 'Fall of S.H.I.E.L.D.' },
          { tmdbId: 118340, type: 'movie', title: 'Guardians of the Galaxy', year: 2014, order: 11, chronologicalNote: 'Cosmic introduction / Power Stone' },
          { tmdbId: 283995, type: 'movie', title: 'Guardians of the Galaxy Vol. 2', year: 2017, order: 12, chronologicalNote: 'Set shortly after Vol. 1' },
          { tmdbId: 99861, type: 'movie', title: 'Avengers: Age of Ultron', year: 2015, order: 13, chronologicalNote: 'Birth of Vision & Sokovia disaster' },
          { tmdbId: 102899, type: 'movie', title: 'Ant-Man', year: 2015, order: 14, chronologicalNote: 'Quantum Realm discovery' },
        ]
      },
      {
        phaseTitle: 'Phase 3: The Infinity War',
        description: 'The Avengers fracture during Civil War and Thanos embarks on his quest for the Stones.',
        items: [
          { tmdbId: 271110, type: 'movie', title: 'Captain America: Civil War', year: 2016, order: 15, chronologicalNote: 'The Avengers fracture' },
          { tmdbId: 324857, type: 'movie', title: 'Spider-Man: Homecoming', year: 2017, order: 16, chronologicalNote: 'Peter Parker finds his footing' },
          { tmdbId: 284052, type: 'movie', title: 'Doctor Strange', year: 2016, order: 17, chronologicalNote: 'Master of Mystic Arts / Time Stone' },
          { tmdbId: 284054, type: 'movie', title: 'Black Panther', year: 2018, order: 18, chronologicalNote: 'Coronation of King T’Challa' },
          { tmdbId: 284053, type: 'movie', title: 'Thor: Ragnarok', year: 2017, order: 19, chronologicalNote: 'Destruction of Asgard' },
          { tmdbId: 299536, type: 'movie', title: 'Avengers: Infinity War', year: 2018, order: 20, chronologicalNote: 'The Snap of Thanos' },
          { tmdbId: 363088, type: 'movie', title: 'Ant-Man and the Wasp', year: 2018, order: 21, chronologicalNote: 'Happens concurrently with Infinity War' },
          { tmdbId: 299534, type: 'movie', title: 'Avengers: Endgame', year: 2019, order: 22, chronologicalNote: 'The Time Heist & Final Battle (2023)' },
          { tmdbId: 429617, type: 'movie', title: 'Spider-Man: Far From Home', year: 2019, order: 23, chronologicalNote: 'The Blip aftermath' },
        ]
      },
      {
        phaseTitle: 'Phase 4 & 5: The Multiverse Saga',
        description: 'Timelines branch, secret wars brew, and cosmic conquerors awaken.',
        items: [
          { tmdbId: 497698, type: 'movie', title: 'Black Widow', year: 2021, order: 24, chronologicalNote: 'Set right after Civil War' },
          { tmdbId: 566525, type: 'movie', title: 'Shang-Chi and the Legend of the Ten Rings', year: 2021, order: 25, chronologicalNote: 'Ta Lo and the Ten Rings' },
          { tmdbId: 524434, type: 'movie', title: 'Eternals', year: 2021, order: 26, chronologicalNote: 'Millennia of hidden history' },
          { tmdbId: 634649, type: 'movie', title: 'Spider-Man: No Way Home', year: 2021, order: 27, chronologicalNote: 'The Multiverse ruptures' },
          { tmdbId: 453395, type: 'movie', title: 'Doctor Strange in the Multiverse of Madness', year: 2022, order: 28, chronologicalNote: 'Darkhold & America Chavez' },
          { tmdbId: 616037, type: 'movie', title: 'Thor: Love and Thunder', year: 2022, order: 29, chronologicalNote: 'Gorr the God Butcher' },
          { tmdbId: 505642, type: 'movie', title: 'Black Panther: Wakanda Forever', year: 2022, order: 30, chronologicalNote: 'War with Talokan' },
          { tmdbId: 640146, type: 'movie', title: 'Ant-Man and the Wasp: Quantumania', year: 2023, order: 31, chronologicalNote: 'Kang the Conqueror' },
          { tmdbId: 447365, type: 'movie', title: 'Guardians of the Galaxy Vol. 3', year: 2023, order: 32, chronologicalNote: 'High Evolutionary & Rocket’s origin' },
          { tmdbId: 533535, type: 'movie', title: 'Deadpool & Wolverine', year: 2024, order: 33, chronologicalNote: 'TVA, Void, and Anchor Beings' },
        ]
      }
    ]
  },
  {
    id: 'star-wars',
    slug: 'star-wars',
    name: 'Star Wars: The Skywalker Saga',
    tagline: 'From the fall of the Republic to the Rise of Skywalker',
    description: 'Witness the complete canon timeline in chronological order across the Prequels, Spin-offs, Original Trilogy, and Sequels.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/5Iw7zQTHVRBOYpA0V6z0yypOPZh.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/kOVEVeg59E0wsnXmF9nrh6OmWII.jpg',
    accentColor: '#3b82f6',
    phases: [
      {
        phaseTitle: 'The Age of the Republic (Prequel Era)',
        description: 'The rise of Anakin Skywalker and the fall of the Jedi Order.',
        items: [
          { tmdbId: 1893, type: 'movie', title: 'Star Wars: Episode I - The Phantom Menace', year: 1999, order: 1, chronologicalNote: '32 BBY' },
          { tmdbId: 1894, type: 'movie', title: 'Star Wars: Episode II - Attack of the Clones', year: 2002, order: 2, chronologicalNote: '22 BBY' },
          { tmdbId: 1895, type: 'movie', title: 'Star Wars: Episode III - Revenge of the Sith', year: 2005, order: 3, chronologicalNote: '19 BBY (Order 66)' },
        ]
      },
      {
        phaseTitle: 'The Reign of the Empire (Origins & Heists)',
        description: 'Rebels strike back in the dark times.',
        items: [
          { tmdbId: 348350, type: 'movie', title: 'Solo: A Star Wars Story', year: 2018, order: 4, chronologicalNote: '10 BBY' },
          { tmdbId: 330459, type: 'movie', title: 'Rogue One: A Star Wars Story', year: 2016, order: 5, chronologicalNote: '0 BBY (Minutes before A New Hope)' },
        ]
      },
      {
        phaseTitle: 'The Galactic Civil War (Original Trilogy)',
        description: 'Luke Skywalker restores balance to the Force.',
        items: [
          { tmdbId: 11, type: 'movie', title: 'Star Wars: Episode IV - A New Hope', year: 1977, order: 6, chronologicalNote: '0 ABY (Battle of Yavin)' },
          { tmdbId: 1891, type: 'movie', title: 'Star Wars: Episode V - The Empire Strikes Back', year: 1980, order: 7, chronologicalNote: '3 ABY' },
          { tmdbId: 1892, type: 'movie', title: 'Star Wars: Episode VI - Return of the Jedi', year: 1983, order: 8, chronologicalNote: '4 ABY' },
        ]
      },
      {
        phaseTitle: 'The First Order & The Resistance (Sequel Era)',
        description: 'A new generation faces the resurgence of the dark side.',
        items: [
          { tmdbId: 140607, type: 'movie', title: 'Star Wars: Episode VII - The Force Awakens', year: 2015, order: 9, chronologicalNote: '34 ABY' },
          { tmdbId: 181808, type: 'movie', title: 'Star Wars: Episode VIII - The Last Jedi', year: 2017, order: 10, chronologicalNote: '34 ABY' },
          { tmdbId: 181812, type: 'movie', title: 'Star Wars: Episode IX - The Rise of Skywalker', year: 2019, order: 11, chronologicalNote: '35 ABY' },
        ]
      }
    ]
  },
  {
    id: 'wizarding-world',
    slug: 'wizarding-world',
    name: 'Wizarding World of Harry Potter',
    tagline: 'From Grindelwald’s uprising to the Battle of Hogwarts',
    description: 'The magic begins with Newt Scamander in 1920s New York and culminates in Harry Potter’s epic duel with Lord Voldemort.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/eKUk4oN4ucwnLJml7wRnjuB9AQH.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/c54HpQmuwXjHq2C9wmoACjxoom3.jpg',
    accentColor: '#f59e0b',
    phases: [
      {
        phaseTitle: 'The Fantastic Beasts Era (1926–1937)',
        description: 'The prelude to the Global Wizarding War.',
        items: [
          { tmdbId: 259316, type: 'movie', title: 'Fantastic Beasts and Where to Find Them', year: 2016, order: 1, chronologicalNote: '1926 New York' },
          { tmdbId: 338952, type: 'movie', title: 'Fantastic Beasts: The Crimes of Grindelwald', year: 2018, order: 2, chronologicalNote: '1927 Paris' },
          { tmdbId: 338953, type: 'movie', title: 'Fantastic Beasts: The Secrets of Dumbledore', year: 2022, order: 3, chronologicalNote: '1932 Berlin/Bhutan' },
        ]
      },
      {
        phaseTitle: 'The Hogwarts Years (1991–1998)',
        description: 'The boy who lived and the second wizarding war.',
        items: [
          { tmdbId: 671, type: 'movie', title: 'Harry Potter and the Sorcerer’s Stone', year: 2001, order: 4, chronologicalNote: 'Year 1 at Hogwarts (1991)' },
          { tmdbId: 672, type: 'movie', title: 'Harry Potter and the Chamber of Secrets', year: 2002, order: 5, chronologicalNote: 'Year 2 (1992)' },
          { tmdbId: 673, type: 'movie', title: 'Harry Potter and the Prisoner of Azkaban', year: 2004, order: 6, chronologicalNote: 'Year 3 (1993)' },
          { tmdbId: 674, type: 'movie', title: 'Harry Potter and the Goblet of Fire', year: 2005, order: 7, chronologicalNote: 'Year 4 (1994 - Triwizard)' },
          { tmdbId: 675, type: 'movie', title: 'Harry Potter and the Order of the Phoenix', year: 2007, order: 8, chronologicalNote: 'Year 5 (1995)' },
          { tmdbId: 767, type: 'movie', title: 'Harry Potter and the Half-Blood Prince', year: 2009, order: 9, chronologicalNote: 'Year 6 (1996 - Horcruxes)' },
          { tmdbId: 12444, type: 'movie', title: 'Harry Potter and the Deathly Hallows: Part 1', year: 2010, order: 10, chronologicalNote: 'Year 7 Part 1 (1997)' },
          { tmdbId: 12445, type: 'movie', title: 'Harry Potter and the Deathly Hallows: Part 2', year: 2011, order: 11, chronologicalNote: 'The Battle of Hogwarts (1998)' },
        ]
      }
    ]
  },
  {
    id: 'batman-dark-knight',
    slug: 'batman-dark-knight',
    name: 'The Dark Knight & Gotham Universe',
    tagline: 'Christopher Nolan’s Legendary Trilogy & Matt Reeves’ Detective Noir',
    description: 'Gotham’s greatest protector faces the Joker, Bane, and the Riddler in the most acclaimed comic book adaptations ever made.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/9FE5eD92WfVCiivM9Pq9GVSrlWk.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    accentColor: '#9333ea',
    phases: [
      {
        phaseTitle: 'Christopher Nolan’s The Dark Knight Trilogy',
        description: 'The definitive realistic Batman origin and climax.',
        items: [
          { tmdbId: 272, type: 'movie', title: 'Batman Begins', year: 2005, order: 1, chronologicalNote: 'Training with the League of Shadows' },
          { tmdbId: 155, type: 'movie', title: 'The Dark Knight', year: 2008, order: 2, chronologicalNote: 'The Joker’s reign of chaos' },
          { tmdbId: 49026, type: 'movie', title: 'The Dark Knight Rises', year: 2012, order: 3, chronologicalNote: 'Bane and the liberation of Gotham' },
        ]
      },
      {
        phaseTitle: 'The Batman Noir Universe (Matt Reeves)',
        description: 'The gritty detective noir era of Bruce Wayne.',
        items: [
          { tmdbId: 414906, type: 'movie', title: 'The Batman', year: 2022, order: 4, chronologicalNote: 'Year Two of Batman’s crusade' },
        ]
      }
    ]
  },
  {
    id: 'middle-earth',
    slug: 'middle-earth',
    name: 'The Lord of the Rings & Middle-earth',
    tagline: 'One Ring to Rule Them All',
    description: 'Peter Jackson’s multi-Oscar winning epic saga following Bilbo and Frodo Baggins across the treacherous lands of Middle-earth.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ctiw6FZK4N36LmkjSklWEbuvlq9.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
    accentColor: '#10b981',
    phases: [
      {
        phaseTitle: 'The Hobbit Trilogy (There and Back Again)',
        description: 'Bilbo Baggins and Thorin Oakenshield’s quest to reclaim the Lonely Mountain.',
        items: [
          { tmdbId: 49051, type: 'movie', title: 'The Hobbit: An Unexpected Journey', year: 2012, order: 1, chronologicalNote: 'Bilbo finds the One Ring' },
          { tmdbId: 57158, type: 'movie', title: 'The Hobbit: The Desolation of Smaug', year: 2013, order: 2, chronologicalNote: 'Encounter with Smaug the Dragon' },
          { tmdbId: 122917, type: 'movie', title: 'The Hobbit: The Battle of the Five Armies', year: 2014, order: 3, chronologicalNote: 'The Clash at Erebor' },
        ]
      },
      {
        phaseTitle: 'The Lord of the Rings Trilogy',
        description: 'The fellowship sets out to destroy the Ring of Power in Mount Doom.',
        items: [
          { tmdbId: 120, type: 'movie', title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001, order: 4, chronologicalNote: 'Departure from the Shire' },
          { tmdbId: 121, type: 'movie', title: 'The Lord of the Rings: The Two Towers', year: 2002, order: 5, chronologicalNote: 'The Battle of Helm’s Deep' },
          { tmdbId: 122, type: 'movie', title: 'The Lord of the Rings: The Return of the King', year: 2003, order: 6, chronologicalNote: 'The Siege of Minas Tirith & Mount Doom' },
        ]
      }
    ]
  },
  {
    id: 'fast-and-furious',
    slug: 'fast-and-furious',
    name: 'The Fast & Furious Saga',
    tagline: 'It’s All About Family',
    description: 'From street racing in Los Angeles to international high-stakes espionage and global heists in chronological story order.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ehzI1mVcnHqB58NqPyQwpMqcVoz.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/ktofZ9Htrjiy0P6LEowsDaxd3Ri.jpg',
    accentColor: '#f97316',
    phases: [
      {
        phaseTitle: 'The Street Racing & Heist Eras',
        description: 'Chronological timeline (Tokyo Drift fits after Fast & Furious 6).',
        items: [
          { tmdbId: 9799, type: 'movie', title: 'The Fast and the Furious', year: 2001, order: 1, chronologicalNote: 'LA Quarter-Mile Street Racing' },
          { tmdbId: 584, type: 'movie', title: '2 Fast 2 Furious', year: 2003, order: 2, chronologicalNote: 'Miami Operation' },
          { tmdbId: 13804, type: 'movie', title: 'Fast & Furious', year: 2009, order: 3, chronologicalNote: 'Dom & Brian reunite' },
          { tmdbId: 51497, type: 'movie', title: 'Fast Five', year: 2011, order: 4, chronologicalNote: 'Rio De Janeiro Vault Heist' },
          { tmdbId: 76341, type: 'movie', title: 'Fast & Furious 6', year: 2013, order: 5, chronologicalNote: 'Shaw brothers introduction' },
          { tmdbId: 9615, type: 'movie', title: 'The Fast and the Furious: Tokyo Drift', year: 2006, order: 6, chronologicalNote: 'Takes place chronologically right after Fast 6' },
          { tmdbId: 168259, type: 'movie', title: 'Furious 7', year: 2014, order: 7, chronologicalNote: 'Deckard Shaw’s revenge' },
          { tmdbId: 337339, type: 'movie', title: 'The Fate of the Furious', year: 2017, order: 8, chronologicalNote: 'Cipher arrives' },
          { tmdbId: 384018, type: 'movie', title: 'Fast & Furious Presents: Hobbs & Shaw', year: 2019, order: 9, chronologicalNote: 'Spinoff mission' },
          { tmdbId: 385128, type: 'movie', title: 'F9: The Fast Saga', year: 2021, order: 10, chronologicalNote: 'Jakob Toretto returns' },
          { tmdbId: 385687, type: 'movie', title: 'Fast X', year: 2023, order: 11, chronologicalNote: 'Dante Reyes’ ultimate payback' },
        ]
      }
    ]
  },
  {
    id: 'spider-man-universe',
    slug: 'spider-man-universe',
    name: 'Spider-Man Multiverse',
    tagline: 'With Great Power Comes Great Responsibility',
    description: 'Explore every iteration of the web-slinger: Tobey Maguire, Andrew Garfield, Tom Holland, and the animated Spider-Verse.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/iQFcwSGbZXMkeyKrxbPnwnRo5fl.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    accentColor: '#ef4444',
    phases: [
      {
        phaseTitle: 'The Sam Raimi Trilogy',
        description: 'Tobey Maguire’s iconic turn as Peter Parker.',
        items: [
          { tmdbId: 557, type: 'movie', title: 'Spider-Man', year: 2002, order: 1, chronologicalNote: 'Green Goblin' },
          { tmdbId: 558, type: 'movie', title: 'Spider-Man 2', year: 2004, order: 2, chronologicalNote: 'Doctor Octopus' },
          { tmdbId: 559, type: 'movie', title: 'Spider-Man 3', year: 2007, order: 3, chronologicalNote: 'Venom & Sandman' },
        ]
      },
      {
        phaseTitle: 'The Amazing Spider-Man Duology',
        description: 'Andrew Garfield’s emotional portrayal.',
        items: [
          { tmdbId: 1930, type: 'movie', title: 'The Amazing Spider-Man', year: 2012, order: 4, chronologicalNote: 'The Lizard & Gwen Stacy' },
          { tmdbId: 102382, type: 'movie', title: 'The Amazing Spider-Man 2', year: 2014, order: 5, chronologicalNote: 'Electro & Green Goblin' },
        ]
      },
      {
        phaseTitle: 'The Animated Spider-Verse Saga',
        description: 'Miles Morales traverses the boundless Spider-Verse.',
        items: [
          { tmdbId: 324857, type: 'movie', title: 'Spider-Man: Into the Spider-Verse', year: 2018, order: 6, chronologicalNote: 'Oscar-winning multiverse introduction' },
          { tmdbId: 569094, type: 'movie', title: 'Spider-Man: Across the Spider-Verse', year: 2023, order: 7, chronologicalNote: 'The Spider-Society & Canon Events' },
        ]
      }
    ]
  },
  {
    id: 'john-wick',
    slug: 'john-wick',
    name: 'John Wick: The Continental Universe',
    tagline: 'Yeah, I’m Thinking I’m Back',
    description: 'Keanu Reeves stars as the legendary assassin fighting for his freedom against the High Table.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2u89.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
    accentColor: '#06b6d4',
    phases: [
      {
        phaseTitle: 'The Baba Yaga Tetralogy',
        description: 'The unstoppable journey of John Wick across the globe.',
        items: [
          { tmdbId: 245891, type: 'movie', title: 'John Wick', year: 2014, order: 1, chronologicalNote: 'The legendary assassin reawakens' },
          { tmdbId: 324552, type: 'movie', title: 'John Wick: Chapter 2', year: 2017, order: 2, chronologicalNote: 'Excommunicado in Rome' },
          { tmdbId: 458156, type: 'movie', title: 'John Wick: Chapter 3 - Parabellum', year: 2019, order: 3, chronologicalNote: 'The open contract & High Table war' },
          { tmdbId: 603692, type: 'movie', title: 'John Wick: Chapter 4', year: 2023, order: 4, chronologicalNote: 'Duel with the Marquis de Gramont' },
        ]
      }
    ]
  },
  {
    id: 'monsterverse',
    slug: 'monsterverse',
    name: 'The MonsterVerse (Titans & Hollow Earth)',
    tagline: 'Let Them Fight',
    description: 'Godzilla, Kong, and ancient Titans collide for supremacy on surface Earth and inside the Hollow Earth.',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/gvLG3Fnznkxl4SmYfcK8gUuqxM8.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w780/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg',
    accentColor: '#14b8a6',
    phases: [
      {
        phaseTitle: 'Chronological MonsterVerse Era',
        description: 'From Monarch’s 1973 expedition to the Hollow Earth wars.',
        items: [
          { tmdbId: 293167, type: 'movie', title: 'Kong: Skull Island', year: 2017, order: 1, chronologicalNote: '1973 Vietnam War Expedition' },
          { tmdbId: 143370, type: 'movie', title: 'Godzilla', year: 2014, order: 2, chronologicalNote: '2014 San Francisco Titan Awakening' },
          { tmdbId: 373571, type: 'movie', title: 'Godzilla: King of the Monsters', year: 2019, order: 3, chronologicalNote: 'King Ghidorah & Alpha Titan reign' },
          { tmdbId: 399566, type: 'movie', title: 'Godzilla vs. Kong', year: 2021, order: 4, chronologicalNote: 'Clash in Hong Kong & Hollow Earth entrance' },
          { tmdbId: 823464, type: 'movie', title: 'Godzilla x Kong: The New Empire', year: 2024, order: 5, chronologicalNote: 'Skar King & the subterranean ice age threat' },
        ]
      }
    ]
  }
];

export function getFranchiseBySlug(slug: string): FranchiseUniverse | undefined {
  return FRANCHISES.find((f) => f.slug.toLowerCase() === slug.toLowerCase() || f.id.toLowerCase() === slug.toLowerCase());
}
