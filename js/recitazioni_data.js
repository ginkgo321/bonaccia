/* Bonaccia – Dati recitazioni coraniche: 114 Sure, 3 maestri egiziani storici (Hafs Mujawwad) e 2 voci più recenti.
   Campo opzionale «surahs» di un recitatore: se c'è, SOLO quelle Sure sono disponibili con quella voce
   (non compaiono nell'elenco, nella ricerca, nei tasti precedente/successiva né alla fine di una Sura).
   Campi «cons» (numeri di Sura) e «note» (testo per numero): consigliate per il riposo solo con quella voce. */
window.Bonaccia = window.Bonaccia || {};
window.Bonaccia.QuranData = {
  reciters: {
  "basit": {
    "id": "basit",
    "nome": "Abdul Basit Abdul Samad",
    "arabo": "عبد الباسط عبد الصمد",
    "corto": "Abdul Basit",
    "anni": "1927–1988",
    "sub": "1927–1988",
    "stile": "Mujawwad (studio)",
    "desc": "La «Gola d’Oro». Respiro amplissimo, timbro risonante e maestoso ma calmo nelle registrazioni radiofoniche da studio.",
    "baseUrl": "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r1/"
  },
  "minshawi": {
    "id": "minshawi",
    "nome": "Mohamed Siddiq El-Minshawi",
    "arabo": "محمد صديق المنشاوي",
    "corto": "Al-Minshawi",
    "anni": "1920–1969",
    "sub": "1920–1969",
    "stile": "Mujawwad (studio)",
    "desc": "La «Voce che piange». Timbro intimo, caldo, vellutato e leggermente malinconico. Celebre per l'effetto distensivo contro l'angoscia.",
    "baseUrl": "https://cdn.mp3quran.net/audio/muhammad-minshawi/r2/"
  },
  "hussary": {
    "id": "hussary",
    "nome": "Mahmoud Khalil Al-Hussary",
    "arabo": "محمود خليل الحصري",
    "corto": "Al-Hussary",
    "anni": "1917–1980",
    "sub": "1917–1980",
    "stile": "Mujawwad (studio)",
    "desc": "Il riferimento canonico di Al-Azhar. Dizione purissima, ritmo scandito con precisione millimetrica, serenità e distensione continua.",
    "baseUrl": "https://cdn.mp3quran.net/audio/mahmoud-husary/r2/"
  },
  "salimi": {
    "id": "salimi",
    "nome": "Mansour Al-Salimi",
    "arabo": "منصور السالمي",
    "corto": "Al-Salimi",
    "sub": "per la notte",
    "stile": "Hafs",
    "desc": "Voce calma e molto regolare: nelle misure di Bonaccia la sonorità cambia pochissimo, senza picchi improvvisi e senza pause vuote. Pensata per addormentarsi.",
    "baseUrl": "https://cdn.mp3quran.net/audio/mansour-salimi/r1/",
    "cons": [2],
    "note": { "2": "Dura circa 2 ore e 20 minuti, con un ritmo molto regolare: per addormentarsi, con il timer di spegnimento. Si ascolta solo in streaming (il file pesa 269 MB)." }
  },
  "afasy": {
    "id": "afasy",
    "nome": "Mishary Rashid Al-Afasy",
    "arabo": "مشاري راشد العفاسي",
    "corto": "Al-Afasy",
    "sub": "ogni giorno",
    "stile": "Hafs",
    "desc": "Voce chiara e luminosa, per l'ascolto di ogni giorno. Con questa voce trovi 11 Sure scelte: brevi e di sollievo, protezioni quotidiane e racconti.",
    "baseUrl": "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/",
    "surahs": [1, 12, 19, 31, 93, 94, 95, 108, 112, 113, 114]
  }
},
  surahs: [
  {
    "n": 1,
    "pad": "001",
    "nome": "Al-Fātiḥah",
    "ar": "ٱلْفَاتِحَةِ",
    "trad": "L'Apertura",
    "ayahs": 7,
    "cons": true,
    "nota": "L'inizio essenziale, cadenza breve e raccolta."
  },
  {
    "n": 2,
    "pad": "002",
    "nome": "Al-Baqarah",
    "ar": "البَقَرَةِ",
    "trad": "La Giovenca",
    "ayahs": 286,
    "cons": false,
    "nota": ""
  },
  {
    "n": 3,
    "pad": "003",
    "nome": "Āl 'Imrān",
    "ar": "آلِ عِمۡرَانَ",
    "trad": "La Famiglia di Imran",
    "ayahs": 200,
    "cons": false,
    "nota": ""
  },
  {
    "n": 4,
    "pad": "004",
    "nome": "An-Nisā'",
    "ar": "النِّسَاءِ",
    "trad": "Le Donne",
    "ayahs": 176,
    "cons": false,
    "nota": ""
  },
  {
    "n": 5,
    "pad": "005",
    "nome": "Al-Mā'idah",
    "ar": "المَائـِدَةِ",
    "trad": "La Tavola Imbandita",
    "ayahs": 120,
    "cons": false,
    "nota": ""
  },
  {
    "n": 6,
    "pad": "006",
    "nome": "Al-An'ām",
    "ar": "الأَنۡعَامِ",
    "trad": "Il Bestiame",
    "ayahs": 165,
    "cons": false,
    "nota": ""
  },
  {
    "n": 7,
    "pad": "007",
    "nome": "Al-A'rāf",
    "ar": "الأَعۡرَافِ",
    "trad": "I Limbi",
    "ayahs": 206,
    "cons": false,
    "nota": ""
  },
  {
    "n": 8,
    "pad": "008",
    "nome": "Al-Anfāl",
    "ar": "الأَنفَالِ",
    "trad": "Il Bottino",
    "ayahs": 75,
    "cons": false,
    "nota": ""
  },
  {
    "n": 9,
    "pad": "009",
    "nome": "At-Tawbah",
    "ar": "التَّوۡبَةِ",
    "trad": "Il Pentimento",
    "ayahs": 129,
    "cons": false,
    "nota": ""
  },
  {
    "n": 10,
    "pad": "010",
    "nome": "Yūnus",
    "ar": "يُونُسَ",
    "trad": "Giona",
    "ayahs": 109,
    "cons": false,
    "nota": ""
  },
  {
    "n": 11,
    "pad": "011",
    "nome": "Hūd",
    "ar": "هُودٍ",
    "trad": "Hud",
    "ayahs": 123,
    "cons": false,
    "nota": ""
  },
  {
    "n": 12,
    "pad": "012",
    "nome": "Yūsuf",
    "ar": "يُوسُفَ",
    "trad": "Giuseppe",
    "ayahs": 111,
    "cons": true,
    "nota": "Il racconto della pazienza e della speranza nel dolore."
  },
  {
    "n": 13,
    "pad": "013",
    "nome": "Ar-Ra'd",
    "ar": "الرَّعۡدِ",
    "trad": "Il Tuono",
    "ayahs": 43,
    "cons": false,
    "nota": ""
  },
  {
    "n": 14,
    "pad": "014",
    "nome": "Ibrāhīm",
    "ar": "إِبۡرَاهِيمَ",
    "trad": "Abramo",
    "ayahs": 52,
    "cons": false,
    "nota": ""
  },
  {
    "n": 15,
    "pad": "015",
    "nome": "Al-Ḥijr",
    "ar": "الحِجۡرِ",
    "trad": "Al-Hijr",
    "ayahs": 99,
    "cons": false,
    "nota": ""
  },
  {
    "n": 16,
    "pad": "016",
    "nome": "An-Naḥl",
    "ar": "النَّحۡلِ",
    "trad": "Le Api",
    "ayahs": 128,
    "cons": false,
    "nota": ""
  },
  {
    "n": 17,
    "pad": "017",
    "nome": "Al-Isrā'",
    "ar": "الإِسۡرَاءِ",
    "trad": "Il Viaggio Notturno",
    "ayahs": 111,
    "cons": false,
    "nota": ""
  },
  {
    "n": 18,
    "pad": "018",
    "nome": "Al-Kahf",
    "ar": "الكَهۡفِ",
    "trad": "La Caverna",
    "ayahs": 110,
    "cons": false,
    "nota": ""
  },
  {
    "n": 19,
    "pad": "019",
    "nome": "Maryam",
    "ar": "مَرۡيَمَ",
    "trad": "Maria",
    "ayahs": 98,
    "cons": true,
    "nota": "Inizio dolce e sussurrato; celebre per l'effetto profondamente pacificante."
  },
  {
    "n": 20,
    "pad": "020",
    "nome": "Ṭā-Hā",
    "ar": "طه",
    "trad": "Ta-Ha",
    "ayahs": 135,
    "cons": false,
    "nota": ""
  },
  {
    "n": 21,
    "pad": "021",
    "nome": "Al-Anbiyā'",
    "ar": "الأَنبِيَاءِ",
    "trad": "I Profeti",
    "ayahs": 112,
    "cons": false,
    "nota": ""
  },
  {
    "n": 22,
    "pad": "022",
    "nome": "Al-Ḥajj",
    "ar": "الحَجِّ",
    "trad": "Il Pellegrinaggio",
    "ayahs": 78,
    "cons": false,
    "nota": ""
  },
  {
    "n": 23,
    "pad": "023",
    "nome": "Al-Mu'minūn",
    "ar": "المُؤۡمِنُونَ",
    "trad": "I Credenti",
    "ayahs": 118,
    "cons": false,
    "nota": ""
  },
  {
    "n": 24,
    "pad": "024",
    "nome": "An-Nūr",
    "ar": "النُّورِ",
    "trad": "La Luce",
    "ayahs": 64,
    "cons": false,
    "nota": ""
  },
  {
    "n": 25,
    "pad": "025",
    "nome": "Al-Furqān",
    "ar": "الفُرۡقَانِ",
    "trad": "Il Criterio",
    "ayahs": 77,
    "cons": false,
    "nota": ""
  },
  {
    "n": 26,
    "pad": "026",
    "nome": "Ash-Shu'arā'",
    "ar": "الشُّعَرَاءِ",
    "trad": "I Poeti",
    "ayahs": 227,
    "cons": false,
    "nota": ""
  },
  {
    "n": 27,
    "pad": "027",
    "nome": "An-Naml",
    "ar": "النَّمۡلِ",
    "trad": "Le Formiche",
    "ayahs": 93,
    "cons": false,
    "nota": ""
  },
  {
    "n": 28,
    "pad": "028",
    "nome": "Al-Qaṣaṣ",
    "ar": "القَصَصِ",
    "trad": "Il Racconto",
    "ayahs": 88,
    "cons": false,
    "nota": ""
  },
  {
    "n": 29,
    "pad": "029",
    "nome": "Al-'Ankabūt",
    "ar": "العَنكَبُوتِ",
    "trad": "Il Ragno",
    "ayahs": 69,
    "cons": false,
    "nota": ""
  },
  {
    "n": 30,
    "pad": "030",
    "nome": "Ar-Rūm",
    "ar": "الرُّومِ",
    "trad": "I Romani",
    "ayahs": 60,
    "cons": false,
    "nota": ""
  },
  {
    "n": 31,
    "pad": "031",
    "nome": "Luqmān",
    "ar": "لُقۡمَانَ",
    "trad": "Luqman",
    "ayahs": 34,
    "cons": false,
    "nota": ""
  },
  {
    "n": 32,
    "pad": "032",
    "nome": "As-Sajdah",
    "ar": "السَّجۡدَةِ",
    "trad": "La Prosternazione",
    "ayahs": 30,
    "cons": false,
    "nota": ""
  },
  {
    "n": 33,
    "pad": "033",
    "nome": "Al-Aḥzāb",
    "ar": "الأَحۡزَابِ",
    "trad": "I Coalizzati",
    "ayahs": 73,
    "cons": false,
    "nota": ""
  },
  {
    "n": 34,
    "pad": "034",
    "nome": "Saba'",
    "ar": "سَبَإٍ",
    "trad": "I Sabei",
    "ayahs": 54,
    "cons": false,
    "nota": ""
  },
  {
    "n": 35,
    "pad": "035",
    "nome": "Fāṭir",
    "ar": "فَاطِرٍ",
    "trad": "Il Creatore",
    "ayahs": 45,
    "cons": false,
    "nota": ""
  },
  {
    "n": 36,
    "pad": "036",
    "nome": "Yā-Sīn",
    "ar": "يسٓ",
    "trad": "Ya-Sin",
    "ayahs": 83,
    "cons": true,
    "nota": "Il cuore del Corano; meditativa, solenne e rassicurante."
  },
  {
    "n": 37,
    "pad": "037",
    "nome": "Aṣ-Ṣāffāt",
    "ar": "الصَّافَّاتِ",
    "trad": "I Ranghi Serrati",
    "ayahs": 182,
    "cons": false,
    "nota": ""
  },
  {
    "n": 38,
    "pad": "038",
    "nome": "Ṣād",
    "ar": "صٓ",
    "trad": "Sad",
    "ayahs": 88,
    "cons": false,
    "nota": ""
  },
  {
    "n": 39,
    "pad": "039",
    "nome": "Az-Zumar",
    "ar": "الزُّمَرِ",
    "trad": "Le Schiere",
    "ayahs": 75,
    "cons": false,
    "nota": ""
  },
  {
    "n": 40,
    "pad": "040",
    "nome": "Ghāfir",
    "ar": "غَافِرٍ",
    "trad": "Il Perdonatore",
    "ayahs": 85,
    "cons": false,
    "nota": ""
  },
  {
    "n": 41,
    "pad": "041",
    "nome": "Fuṣṣilat",
    "ar": "فُصِّلَتۡ",
    "trad": "I Versetti Chiaramente Esposti",
    "ayahs": 54,
    "cons": false,
    "nota": ""
  },
  {
    "n": 42,
    "pad": "042",
    "nome": "Ash-Shūrā",
    "ar": "الشُّورَىٰ",
    "trad": "La Consultazione",
    "ayahs": 53,
    "cons": false,
    "nota": ""
  },
  {
    "n": 43,
    "pad": "043",
    "nome": "Az-Zukhruf",
    "ar": "الزُّخۡرُفِ",
    "trad": "Gli Ornamenti d'Oro",
    "ayahs": 89,
    "cons": false,
    "nota": ""
  },
  {
    "n": 44,
    "pad": "044",
    "nome": "Ad-Dukhān",
    "ar": "الدُّخَانِ",
    "trad": "Il Fumo",
    "ayahs": 59,
    "cons": false,
    "nota": ""
  },
  {
    "n": 45,
    "pad": "045",
    "nome": "Al-Jāthiyah",
    "ar": "الجَاثِيَةِ",
    "trad": "La Ginocchiata",
    "ayahs": 37,
    "cons": false,
    "nota": ""
  },
  {
    "n": 46,
    "pad": "046",
    "nome": "Al-Aḥqāf",
    "ar": "الأَحۡقَافِ",
    "trad": "Le Dune",
    "ayahs": 35,
    "cons": false,
    "nota": ""
  },
  {
    "n": 47,
    "pad": "047",
    "nome": "Muḥammad",
    "ar": "مُحَمَّدٍ",
    "trad": "Maometto",
    "ayahs": 38,
    "cons": false,
    "nota": ""
  },
  {
    "n": 48,
    "pad": "048",
    "nome": "Al-Fatḥ",
    "ar": "الفَتۡحِ",
    "trad": "La Vittoria",
    "ayahs": 29,
    "cons": false,
    "nota": ""
  },
  {
    "n": 49,
    "pad": "049",
    "nome": "Al-Ḥujurāt",
    "ar": "الحُجُرَاتِ",
    "trad": "Le Stanze",
    "ayahs": 18,
    "cons": false,
    "nota": ""
  },
  {
    "n": 50,
    "pad": "050",
    "nome": "Qāf",
    "ar": "قٓ",
    "trad": "Qaf",
    "ayahs": 45,
    "cons": false,
    "nota": ""
  },
  {
    "n": 51,
    "pad": "051",
    "nome": "Adh-Dhāriyāt",
    "ar": "الذَّارِيَاتِ",
    "trad": "Quelle Che Spargono",
    "ayahs": 60,
    "cons": false,
    "nota": ""
  },
  {
    "n": 52,
    "pad": "052",
    "nome": "Aṭ-Ṭūr",
    "ar": "الطُّورِ",
    "trad": "Il Monte",
    "ayahs": 49,
    "cons": false,
    "nota": ""
  },
  {
    "n": 53,
    "pad": "053",
    "nome": "An-Najm",
    "ar": "النَّجۡمِ",
    "trad": "La Stella",
    "ayahs": 62,
    "cons": false,
    "nota": ""
  },
  {
    "n": 54,
    "pad": "054",
    "nome": "Al-Qamar",
    "ar": "القَمَرِ",
    "trad": "La Luna",
    "ayahs": 55,
    "cons": false,
    "nota": ""
  },
  {
    "n": 55,
    "pad": "055",
    "nome": "Ar-Raḥmān",
    "ar": "الرَّحۡمَٰن",
    "trad": "Il Misericordioso",
    "ayahs": 78,
    "cons": true,
    "nota": "Ritmo regolare e ritornello dolce; eccezionale per il rilassamento."
  },
  {
    "n": 56,
    "pad": "056",
    "nome": "Al-Wāqi'ah",
    "ar": "الوَاقِعَةِ",
    "trad": "L'Evento Inevitabile",
    "ayahs": 96,
    "cons": false,
    "nota": ""
  },
  {
    "n": 57,
    "pad": "057",
    "nome": "Al-Ḥadīd",
    "ar": "الحَدِيدِ",
    "trad": "Il Ferro",
    "ayahs": 29,
    "cons": false,
    "nota": ""
  },
  {
    "n": 58,
    "pad": "058",
    "nome": "Al-Mujādilah",
    "ar": "المُجَادلَةِ",
    "trad": "La Disputante",
    "ayahs": 22,
    "cons": false,
    "nota": ""
  },
  {
    "n": 59,
    "pad": "059",
    "nome": "Al-Ḥashr",
    "ar": "الحَشۡرِ",
    "trad": "L'Esilio",
    "ayahs": 24,
    "cons": false,
    "nota": ""
  },
  {
    "n": 60,
    "pad": "060",
    "nome": "Al-Mumtaḥanah",
    "ar": "المُمۡتَحنَةِ",
    "trad": "L'Esaminata",
    "ayahs": 13,
    "cons": false,
    "nota": ""
  },
  {
    "n": 61,
    "pad": "061",
    "nome": "Aṣ-Ṣaff",
    "ar": "الصَّفِّ",
    "trad": "I Ranghi",
    "ayahs": 14,
    "cons": false,
    "nota": ""
  },
  {
    "n": 62,
    "pad": "062",
    "nome": "Al-Jumu'ah",
    "ar": "الجُمُعَةِ",
    "trad": "Il Venerdì",
    "ayahs": 11,
    "cons": false,
    "nota": ""
  },
  {
    "n": 63,
    "pad": "063",
    "nome": "Al-Munāfiqūn",
    "ar": "المُنَافِقُونَ",
    "trad": "Gli Ipocriti",
    "ayahs": 11,
    "cons": false,
    "nota": ""
  },
  {
    "n": 64,
    "pad": "064",
    "nome": "At-Taghābun",
    "ar": "التَّغَابُنِ",
    "trad": "La Reciproca Perdita",
    "ayahs": 18,
    "cons": false,
    "nota": ""
  },
  {
    "n": 65,
    "pad": "065",
    "nome": "Aṭ-Ṭalāq",
    "ar": "الطَّلَاقِ",
    "trad": "Il Divorzio",
    "ayahs": 12,
    "cons": false,
    "nota": ""
  },
  {
    "n": 66,
    "pad": "066",
    "nome": "At-Taḥrīm",
    "ar": "التَّحۡرِيمِ",
    "trad": "L'Interdizione",
    "ayahs": 12,
    "cons": false,
    "nota": ""
  },
  {
    "n": 67,
    "pad": "067",
    "nome": "Al-Mulk",
    "ar": "المُلۡكِ",
    "trad": "La Sovranità",
    "ayahs": 30,
    "cons": true,
    "nota": "La Sura raccomandata tradizionalmente da ascoltare ogni sera prima del sonno."
  },
  {
    "n": 68,
    "pad": "068",
    "nome": "Al-Qalam",
    "ar": "القَلَمِ",
    "trad": "Il Calamo",
    "ayahs": 52,
    "cons": false,
    "nota": ""
  },
  {
    "n": 69,
    "pad": "069",
    "nome": "Al-Ḥāqqah",
    "ar": "الحَاقَّةِ",
    "trad": "L'Inevitabile",
    "ayahs": 52,
    "cons": false,
    "nota": ""
  },
  {
    "n": 70,
    "pad": "070",
    "nome": "Al-Ma'ārij",
    "ar": "المَعَارِجِ",
    "trad": "Le Vie dell'Ascensione",
    "ayahs": 44,
    "cons": false,
    "nota": ""
  },
  {
    "n": 71,
    "pad": "071",
    "nome": "Nūḥ",
    "ar": "نُوحٍ",
    "trad": "Noè",
    "ayahs": 28,
    "cons": false,
    "nota": ""
  },
  {
    "n": 72,
    "pad": "072",
    "nome": "Al-Jinn",
    "ar": "الجِنِّ",
    "trad": "I Geni",
    "ayahs": 28,
    "cons": false,
    "nota": ""
  },
  {
    "n": 73,
    "pad": "073",
    "nome": "Al-Muzzammil",
    "ar": "المُزَّمِّلِ",
    "trad": "L'Avvolto nel Mantello",
    "ayahs": 20,
    "cons": false,
    "nota": ""
  },
  {
    "n": 74,
    "pad": "074",
    "nome": "Al-Muddaththir",
    "ar": "المُدَّثِّرِ",
    "trad": "L'Avvolto nella Coperta",
    "ayahs": 56,
    "cons": false,
    "nota": ""
  },
  {
    "n": 75,
    "pad": "075",
    "nome": "Al-Qiyāmah",
    "ar": "القِيَامَةِ",
    "trad": "La Resurrezione",
    "ayahs": 40,
    "cons": false,
    "nota": ""
  },
  {
    "n": 76,
    "pad": "076",
    "nome": "Al-Insān",
    "ar": "الإِنسَانِ",
    "trad": "L'Uomo",
    "ayahs": 31,
    "cons": false,
    "nota": ""
  },
  {
    "n": 77,
    "pad": "077",
    "nome": "Al-Mursalāt",
    "ar": "المُرۡسَلَاتِ",
    "trad": "Le Inviate",
    "ayahs": 50,
    "cons": false,
    "nota": ""
  },
  {
    "n": 78,
    "pad": "078",
    "nome": "An-Naba'",
    "ar": "النَّبَإِ",
    "trad": "Il Grande Annuncio",
    "ayahs": 40,
    "cons": false,
    "nota": ""
  },
  {
    "n": 79,
    "pad": "079",
    "nome": "An-Nāzi'āt",
    "ar": "النَّازِعَاتِ",
    "trad": "Coloro Che Strappano",
    "ayahs": 46,
    "cons": false,
    "nota": ""
  },
  {
    "n": 80,
    "pad": "080",
    "nome": "'Abasa",
    "ar": "عَبَسَ",
    "trad": "S'Accigliò",
    "ayahs": 42,
    "cons": false,
    "nota": ""
  },
  {
    "n": 81,
    "pad": "081",
    "nome": "At-Takwīr",
    "ar": "التَّكۡوِيرِ",
    "trad": "L'Oscuramento",
    "ayahs": 29,
    "cons": false,
    "nota": ""
  },
  {
    "n": 82,
    "pad": "082",
    "nome": "Al-Infiṭār",
    "ar": "الانفِطَارِ",
    "trad": "Lo Squarcio",
    "ayahs": 19,
    "cons": false,
    "nota": ""
  },
  {
    "n": 83,
    "pad": "083",
    "nome": "Al-Muṭaffifīn",
    "ar": "المُطَفِّفِينَ",
    "trad": "I Frodatoli",
    "ayahs": 36,
    "cons": false,
    "nota": ""
  },
  {
    "n": 84,
    "pad": "084",
    "nome": "Al-Inshiqāq",
    "ar": "الانشِقَاقِ",
    "trad": "La Fenditura",
    "ayahs": 25,
    "cons": false,
    "nota": ""
  },
  {
    "n": 85,
    "pad": "085",
    "nome": "Al-Burūj",
    "ar": "البُرُوجِ",
    "trad": "Le Costellazioni",
    "ayahs": 22,
    "cons": false,
    "nota": ""
  },
  {
    "n": 86,
    "pad": "086",
    "nome": "Aṭ-Ṭāriq",
    "ar": "الطَّارِقِ",
    "trad": "L'Astro Notturno",
    "ayahs": 17,
    "cons": false,
    "nota": ""
  },
  {
    "n": 87,
    "pad": "087",
    "nome": "Al-A'lā",
    "ar": "الأَعۡلَىٰ",
    "trad": "L'Altissimo",
    "ayahs": 19,
    "cons": false,
    "nota": ""
  },
  {
    "n": 88,
    "pad": "088",
    "nome": "Al-Ghāshiyah",
    "ar": "الغَاشِيَةِ",
    "trad": "L'Avvolgente",
    "ayahs": 26,
    "cons": false,
    "nota": ""
  },
  {
    "n": 89,
    "pad": "089",
    "nome": "Al-Fajr",
    "ar": "الفَجۡرِ",
    "trad": "L'Alba",
    "ayahs": 30,
    "cons": true,
    "nota": "I versi finali (27-30) dell'Anima Acquietata donano quiete profonda."
  },
  {
    "n": 90,
    "pad": "090",
    "nome": "Al-Balad",
    "ar": "البَلَدِ",
    "trad": "La Contrada",
    "ayahs": 20,
    "cons": false,
    "nota": ""
  },
  {
    "n": 91,
    "pad": "091",
    "nome": "Ash-Shams",
    "ar": "الشَّمۡسِ",
    "trad": "Il Sole",
    "ayahs": 15,
    "cons": false,
    "nota": ""
  },
  {
    "n": 92,
    "pad": "092",
    "nome": "Al-Layl",
    "ar": "اللَّيۡلِ",
    "trad": "La Notte",
    "ayahs": 21,
    "cons": false,
    "nota": ""
  },
  {
    "n": 93,
    "pad": "093",
    "nome": "Aḍ-Ḍuḥā",
    "ar": "الضُّحَىٰ",
    "trad": "La Luce del Mattino",
    "ayahs": 11,
    "cons": true,
    "nota": "Conforto nella tristezza: la promessa che la quiete ritornerà."
  },
  {
    "n": 94,
    "pad": "094",
    "nome": "Ash-Sharḥ (Al-Inshirāḥ)",
    "ar": "الشَّرۡحِ",
    "trad": "Il Sollievo",
    "ayahs": 8,
    "cons": true,
    "nota": "«Con la difficoltà viene il sollievo»: cadenza brevissima per fermare l'ansia."
  },
  {
    "n": 95,
    "pad": "095",
    "nome": "At-Tīn",
    "ar": "التِّينِ",
    "trad": "I Fichi",
    "ayahs": 8,
    "cons": false,
    "nota": ""
  },
  {
    "n": 96,
    "pad": "096",
    "nome": "Al-'Alaq",
    "ar": "العَلَقِ",
    "trad": "L'Aderenza",
    "ayahs": 19,
    "cons": false,
    "nota": ""
  },
  {
    "n": 97,
    "pad": "097",
    "nome": "Al-Qadr",
    "ar": "القَدۡرِ",
    "trad": "Il Destino",
    "ayahs": 5,
    "cons": false,
    "nota": ""
  },
  {
    "n": 98,
    "pad": "098",
    "nome": "Al-Bayyinah",
    "ar": "البَيِّنَةِ",
    "trad": "La Prova Evidente",
    "ayahs": 8,
    "cons": false,
    "nota": ""
  },
  {
    "n": 99,
    "pad": "099",
    "nome": "Az-Zalzalah",
    "ar": "الزَّلۡزَلَةِ",
    "trad": "Il Terremoto",
    "ayahs": 8,
    "cons": false,
    "nota": ""
  },
  {
    "n": 100,
    "pad": "100",
    "nome": "Al-'Ādiyāt",
    "ar": "العَادِيَاتِ",
    "trad": "I Corridori",
    "ayahs": 11,
    "cons": false,
    "nota": ""
  },
  {
    "n": 101,
    "pad": "101",
    "nome": "Al-Qāri'ah",
    "ar": "القَارِعَةِ",
    "trad": "La Percotente",
    "ayahs": 11,
    "cons": false,
    "nota": ""
  },
  {
    "n": 102,
    "pad": "102",
    "nome": "At-Takāthur",
    "ar": "التَّكَاثُرِ",
    "trad": "La Rivalità",
    "ayahs": 8,
    "cons": false,
    "nota": ""
  },
  {
    "n": 103,
    "pad": "103",
    "nome": "Al-'Aṣr",
    "ar": "العَصۡرِ",
    "trad": "Il Pomeriggio",
    "ayahs": 3,
    "cons": false,
    "nota": ""
  },
  {
    "n": 104,
    "pad": "104",
    "nome": "Al-Humazah",
    "ar": "الهُمَزَةِ",
    "trad": "Il Diffamatore",
    "ayahs": 9,
    "cons": false,
    "nota": ""
  },
  {
    "n": 105,
    "pad": "105",
    "nome": "Al-Fīl",
    "ar": "الفِيلِ",
    "trad": "L'Elefante",
    "ayahs": 5,
    "cons": false,
    "nota": ""
  },
  {
    "n": 106,
    "pad": "106",
    "nome": "Quraysh",
    "ar": "قُرَيۡشٍ",
    "trad": "I Coreisciti",
    "ayahs": 4,
    "cons": false,
    "nota": ""
  },
  {
    "n": 107,
    "pad": "107",
    "nome": "Al-Mā'ūn",
    "ar": "المَاعُونِ",
    "trad": "L'Aiuto Minimo",
    "ayahs": 7,
    "cons": false,
    "nota": ""
  },
  {
    "n": 108,
    "pad": "108",
    "nome": "Al-Kawthar",
    "ar": "الكَوۡثَرِ",
    "trad": "L'Abbondanza",
    "ayahs": 3,
    "cons": false,
    "nota": ""
  },
  {
    "n": 109,
    "pad": "109",
    "nome": "Al-Kāfirūn",
    "ar": "الكَافِرُونَ",
    "trad": "I Miscredenti",
    "ayahs": 6,
    "cons": false,
    "nota": ""
  },
  {
    "n": 110,
    "pad": "110",
    "nome": "An-Naṣr",
    "ar": "النَّصۡرِ",
    "trad": "L'Aiuto Divino",
    "ayahs": 3,
    "cons": false,
    "nota": ""
  },
  {
    "n": 111,
    "pad": "111",
    "nome": "Al-Masad",
    "ar": "المَسَدِ",
    "trad": "Le Fibre di Palma",
    "ayahs": 5,
    "cons": false,
    "nota": ""
  },
  {
    "n": 112,
    "pad": "112",
    "nome": "Al-Ikhlāṣ",
    "ar": "الإِخۡلَاصِ",
    "trad": "La Fede Pura",
    "ayahs": 4,
    "cons": true,
    "nota": "La purezza del monoteismo, breve e pacifica."
  },
  {
    "n": 113,
    "pad": "113",
    "nome": "Al-Falaq",
    "ar": "الفَلَقِ",
    "trad": "L'Alba Nascente",
    "ayahs": 5,
    "cons": true,
    "nota": "Preghiera di protezione contro le oscurità della notte."
  },
  {
    "n": 114,
    "pad": "114",
    "nome": "An-Nās",
    "ar": "النَّاسِ",
    "trad": "Gli Uomini",
    "ayahs": 6,
    "cons": true,
    "nota": "Protezione dai sussurri dell'ansia e dai pensieri notturni."
  }
]
};
