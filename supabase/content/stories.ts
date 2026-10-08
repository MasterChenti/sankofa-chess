/**
 * Sankofa Stories — the "Remember" pillar.
 *
 * Editorial rules (see README → Content):
 *  - Facts are checked against the cited sources. Tradition, accounts and
 *    interpretation are labelled as such (`known` vs `debated`).
 *  - No glorification: every story asks what the decision teaches, including its costs.
 *  - Each story ends with a question for the reader, not just information.
 */

export type StoryRegion = "west" | "east" | "north" | "central" | "southern" | "diaspora" | "pan-african";
export type StoryCategory = "history" | "strategy" | "thinkers" | "innovation" | "culture" | "chess";

export type SeedStory = {
  slug: string;
  title: string;
  category: StoryCategory;
  region: StoryRegion;
  country: string | null; // ISO code of the present-day country, for the future map
  place: string;
  era: string;
  readMinutes: number;
  excerpt: string;
  symbol: string;
  kind: "decision" | "idea";
  sections: { title: string; body: string[] }[];
  think: { question: string; options: { key: string; text: string; reflection: string }[] };
  outcome: { title: string; body: string[] };
  sankofa: string;
  known: string[];
  debated: string[];
  source: string;
};

export const STORIES: SeedStory[] = [
  {
    slug: "the-golden-stool",
    title: "The Golden Stool",
    category: "history",
    region: "west",
    country: "GH",
    place: "Asante, present-day Ghana",
    era: "1900",
    readMinutes: 4,
    symbol: "stool",
    kind: "decision",
    excerpt: "A governor asks to sit on a nation’s most sacred object. What does a people do when its soul is put up for negotiation?",
    sections: [
      {
        title: "The situation",
        body: [
          "By 1900 the Asantehene, Prempeh I, had been sent into exile by the British, and Asante was under heavy colonial pressure.",
          "For the Asante, the Golden Stool was not a throne in the ordinary sense. It was held to carry the spirit of the nation: the living, the dead and those not yet born. It was never meant to be sat on, not even by the king.",
        ],
      },
      {
        title: "The pressure",
        body: [
          "In March 1900 the British governor, Sir Frederick Hodgson, addressed Asante leaders in Kumasi. As his speech was recorded, he demanded the Stool for the Queen and asked why it had not been brought for him to sit on.",
          "The chiefs had to answer a demand that touched the deepest symbol of their nation, while their king was in exile and the colonial army was close.",
        ],
      },
    ],
    think: {
      question: "If you were one of the Asante leaders that day, what would you do?",
      options: [
        { key: "a", text: "Hand over the Stool to protect lives and buy time", reflection: "A realistic choice under pressure. But some things, once given, cannot be taken back, and the Stool stood for the nation itself." },
        { key: "b", text: "Refuse, hide the Stool, and prepare to resist", reflection: "This is close to what happened. Protecting the symbol mattered more than winning the battle." },
        { key: "c", text: "Negotiate quietly and offer something else", reflection: "Diplomacy is often wise. Here, the demand itself was the insult, which made a quiet compromise very hard." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "Yaa Asantewaa, Queen Mother of Ejisu, is remembered for rallying resistance: if the men would not fight, she said, the women would. Asante forces besieged the British fort in Kumasi from April until a relief column broke through in mid-July 1900.",
        "Militarily, Asante lost. Yaa Asantewaa and other leaders were exiled to the Seychelles, where she died in 1921, and Asante was absorbed into the Gold Coast colony.",
        "But the Stool was hidden in the forest and never captured. When the British later gave assurances of non-interference, it returned to public life, and it is still at the heart of Asante kingship today.",
      ],
    },
    sankofa: "You can lose a battle and still protect what matters most. Know which things are negotiable and which are not, before the pressure arrives.",
    known: [
      "Hodgson’s March 1900 visit and demand, the siege of the Kumasi fort and its July relief, and the exile of leaders to the Seychelles are documented.",
      "The Golden Stool was never captured by the British.",
    ],
    debated: [
      "The exact words of Hodgson’s speech come to us through translation and later retelling.",
      "The Stool’s origin, called down from the sky by the priest Okomfo Anokye for King Osei Tutu, is Asante tradition, not documented history.",
      "Figures for the size of the Asante force vary widely between sources.",
    ],
    source: "T. C. McCaskie, State and Society in Pre-Colonial Asante (1995); A. Adu Boahen, Yaa Asantewaa and the Asante–British War of 1900–1 (2003).",
  },
  {
    slug: "adwa-1896",
    title: "Adwa: the battle won before it was fought",
    category: "strategy",
    region: "east",
    country: "ET",
    place: "Tigray, Ethiopia",
    era: "1889–1896",
    readMinutes: 5,
    symbol: "shield",
    kind: "decision",
    excerpt: "One treaty, two languages, two meanings. How Ethiopia turned a sentence into a war, and won.",
    sections: [
      {
        title: "The situation",
        body: [
          "In 1889 Emperor Menelik II signed the Treaty of Wuchale with Italy. Article 17 existed in two versions.",
          "In Amharic, Ethiopia could use Italy’s help in foreign affairs if it wished. In Italian, Ethiopia had to conduct its foreign affairs through Italy, which effectively made it a protectorate.",
        ],
      },
      {
        title: "The pressure",
        body: [
          "Italy treated the Italian text as binding. Menelik rejected it. By 1895 the dispute had become a war.",
          "Italy had a modern European army. Menelik had to decide how to face it: fight early, wait, or seek terms.",
        ],
      },
    ],
    think: {
      question: "What would you prioritise before the decisive battle?",
      options: [
        { key: "a", text: "Attack quickly before the enemy is fully ready", reflection: "Speed can win, but an army that is not supplied and united can break in a long campaign." },
        { key: "b", text: "Build alliances, arms and supplies, and let the enemy come to difficult ground", reflection: "This is close to Menelik’s approach: unity among regional rulers, modern rifles bought abroad, and patience." },
        { key: "c", text: "Accept the treaty’s Italian version to avoid war", reflection: "It might have bought peace for a while, at the cost of sovereignty, which was the very thing at stake." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "Menelik and Empress Taytu Betul brought together forces from across the empire. Estimates range from about 73,000 to over 100,000, against roughly 15,000–18,000 Italian and colonial troops. Many Ethiopian soldiers carried modern rifles imported from France and Russia.",
        "On 1 March 1896, the Italian brigades advanced at night through mountain passes with poor maps. Columns lost contact with each other. One brigade followed its guides instead of its map and was cut off. Ethiopian commanders, including Ras Makonnen and Ras Alula, struck the gaps.",
        "Italy suffered one of the heaviest colonial defeats of the era, and its government fell within days. Italy then signed the Treaty of Addis Ababa recognising Ethiopia’s independence.",
      ],
    },
    sankofa: "Read the fine print, in every language that matters. And in strategy, as in chess, the side whose pieces work together usually beats the side with better individual pieces.",
    known: [
      "The two versions of Article 17, the date of the battle, and Italy’s recognition of Ethiopian independence afterwards are documented.",
      "Ethiopia was one of very few African states to stay independent through the Scramble for Africa.",
    ],
    debated: [
      "Troop and casualty figures differ considerably between historians.",
      "Whether the mistranslation was deliberate is still argued.",
    ],
    source: "Raymond Jonas, The Battle of Adwa (2011); Harold G. Marcus, The Life and Times of Menelik II (1975).",
  },
  {
    slug: "mansa-musa-and-the-gold",
    title: "Mansa Musa and the price of gold",
    category: "history",
    region: "west",
    country: "ML",
    place: "Mali Empire → Cairo",
    era: "1324",
    readMinutes: 4,
    symbol: "coin",
    kind: "decision",
    excerpt: "A king travels to Mecca and gives away so much gold that Cairo talks about it for years. Generosity, strategy, or both?",
    sections: [
      {
        title: "The situation",
        body: [
          "Mansa Musa ruled the Mali Empire for about 25 years in the early 14th century. Mali controlled major sources of West African gold, which flowed north across the Sahara.",
          "In 1324 he set out on the hajj to Mecca, travelling through Cairo with a large caravan.",
        ],
      },
      {
        title: "The choice",
        body: [
          "A ruler on a long journey through foreign lands decides how to present himself. He can travel quietly, or he can make sure the world sees what his kingdom is.",
        ],
      },
    ],
    think: {
      question: "Why might a ruler give away gold so publicly on a journey abroad?",
      options: [
        { key: "a", text: "Personal piety and generosity", reflection: "Religious giving was part of the hajj and is how many accounts frame it." },
        { key: "b", text: "To build his kingdom’s reputation with traders, scholars and rulers", reflection: "Reputation is a strategic asset. The Mali he advertised attracted scholars and trade afterwards." },
        { key: "c", text: "Both, and it is hard to separate them", reflection: "Probably the most honest answer. Historians often cannot see inside a ruler’s motives." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "He stayed about three months in Cairo. The Egyptian writer al-Umari, writing years later, reported that the value of gold in Egypt fell after Musa’s visit and stayed lower for at least twelve years.",
        "On the way home his party ran short and borrowed from Cairo merchants. Mali’s fame spread: the Catalan Atlas of 1375 shows a West African ruler holding a gold nugget, described as the richest in the region.",
        "Building work in Timbuktu and Gao during his reign helped make Timbuktu a centre of learning.",
      ],
    },
    sankofa: "Reputation travels further than armies. But be careful with legends: the most famous ‘fact’ about Mansa Musa, that he was the richest person in history, cannot actually be measured.",
    known: [
      "His hajj in 1324–25 and his stay in Cairo are recorded in Arabic sources.",
      "Al-Umari reports a fall in the value of gold in Egypt after the visit.",
    ],
    debated: [
      "Claims of tens of thousands of attendants and tons of gold come from later writers and are treated by historians as exaggeration.",
      "Some historians argue the gold-price change was within normal fluctuation.",
      "‘Richest person ever’ is a modern internet claim; his wealth cannot be converted into modern money in any meaningful way.",
    ],
    source: "Nehemia Levtzion, Ancient Ghana and Mali (1973); N. Levtzion & J. Hopkins (eds.), Corpus of Early Arabic Sources for West African History (1981).",
  },
  {
    slug: "timbuktu-manuscripts",
    title: "Saving the manuscripts of Timbuktu",
    category: "thinkers",
    region: "west",
    country: "ML",
    place: "Timbuktu & Bamako, Mali",
    era: "2012–2013",
    readMinutes: 4,
    symbol: "book",
    kind: "decision",
    excerpt: "Armed groups take a city of libraries. A librarian has to decide what knowledge is worth risking your life for.",
    sections: [
      {
        title: "The situation",
        body: [
          "For centuries, families in Timbuktu kept manuscripts in their homes: works on law, medicine, astronomy, philosophy, letters and Qurans, from the late 13th to the 20th century. Most are in Arabic; some are in African languages written in Arabic script.",
          "In 2012, armed Islamist groups took control of northern Mali, including Timbuktu.",
        ],
      },
      {
        title: "The pressure",
        body: [
          "The libraries were at risk of being looted or destroyed. Moving fragile manuscripts openly would draw attention. Doing nothing could mean losing them forever.",
        ],
      },
    ],
    think: {
      question: "If you were responsible for these libraries, what would you do?",
      options: [
        { key: "a", text: "Lock them in the libraries and hope they are ignored", reflection: "It avoids immediate risk, but leaves everything in one place, exactly where an attacker would look." },
        { key: "b", text: "Quietly spread them across many family homes, then smuggle them south in small loads", reflection: "Close to what happened. Spreading risk and trusting a network of ordinary people." },
        { key: "c", text: "Appeal publicly to the world for protection", reflection: "Attention can help, but it can also make the manuscripts a bigger target." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "Abdel Kader Haidara, from a long line of Timbuktu manuscript keepers, worked with local families, couriers and international supporters to hide manuscripts and move them to Bamako. Roughly 350,000 manuscripts were evacuated.",
        "Losses still happened: thousands were burned or stolen, including at the Ahmed Baba Institute. Today many of the rescued manuscripts are being digitised, and preserving them in Bamako’s humidity is its own challenge.",
      ],
    },
    sankofa: "Knowledge survives because people decide to carry it. Spreading risk, trusting a network and moving quietly is strategy too.",
    known: ["The occupation of Timbuktu in 2012–13, the evacuation to Bamako and the destruction of thousands of manuscripts are documented."],
    debated: ["Exact numbers of manuscripts saved and lost vary between organisations; most of the collection is still uncatalogued."],
    source: "Charlie English, The Book Smugglers of Timbuktu (2017); Shamil Jeppie & Souleymane Bachir Diagne (eds.), The Meanings of Timbuktu (2008).",
  },
  {
    slug: "great-zimbabwe",
    title: "Great Zimbabwe and the lie about who built it",
    category: "innovation",
    region: "southern",
    country: "ZW",
    place: "Masvingo, Zimbabwe",
    era: "11th–15th century (built) · 20th century (denied)",
    readMinutes: 4,
    symbol: "wall",
    kind: "idea",
    excerpt: "Stone walls 11 metres high, built without mortar. For decades a government insisted Africans could not have built them.",
    sections: [
      {
        title: "The city",
        body: [
          "Great Zimbabwe was built and occupied roughly between the 11th and 15th centuries by ancestors of the Shona. Its Great Enclosure has dry-stone walls, with no mortar, rising about 11 metres.",
          "Finds at the site include Chinese ceramics, Persian and Syrian objects, glass beads and evidence of gold working, signs of a trade network reaching the Indian Ocean coast and beyond.",
        ],
      },
      {
        title: "The denial",
        body: [
          "Archaeologists concluded in 1905 and again in 1929 that the city was built by Africans. African origin was the scientific consensus by the 1950s.",
          "Yet Rhodesia’s white-minority government pushed the claim that others must have built it, and archaeologists who said otherwise faced censorship.",
        ],
      },
    ],
    think: {
      question: "Why would a government deny who built a monument?",
      options: [
        { key: "a", text: "Honest scientific uncertainty", reflection: "Not really: the evidence had been clear for decades." },
        { key: "b", text: "Because history can justify who holds power in the present", reflection: "If Africans had built a great state, colonial claims about African ‘backwardness’ fell apart." },
        { key: "c", text: "Because the site is hard to date", reflection: "Dating can be tricky, but it did not change who the builders were." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "When the country became independent in 1980, it took its name from the site: Zimbabwe. Its carved soapstone birds appear on the national flag, and the site became a UNESCO World Heritage Site in 1986.",
      ],
    },
    sankofa: "Whoever controls the story of the past shapes the present. When someone says ‘your people could not have done that’, ask what they gain from you believing it.",
    known: [
      "Construction dates, dry-stone technique, trade finds and the colonial-era censorship are well documented.",
      "The name Zimbabwe comes from the Shona name for the site.",
    ],
    debated: [
      "Population estimates range from under 10,000 to around 18,000.",
      "Why the city declined is debated: trade shifts, resource strain and political splits have all been proposed.",
    ],
    source: "Peter Garlake, Great Zimbabwe (1973); Innocent Pikirayi, The Zimbabwe Culture (2001); UNESCO World Heritage listing 364.",
  },
  {
    slug: "isandlwana",
    title: "Isandlwana: the army that wasn’t seen",
    category: "strategy",
    region: "southern",
    country: "ZA",
    place: "Zulu Kingdom, present-day South Africa",
    era: "January 1879",
    readMinutes: 5,
    symbol: "horns",
    kind: "decision",
    excerpt: "A British general splits his army to chase an enemy he thinks he has found. The real enemy is somewhere else.",
    sections: [
      {
        title: "The situation",
        body: [
          "In January 1879 Britain invaded the Zulu Kingdom of King Cetshwayo. Lord Chelmsford led a column of about 1,800 soldiers and auxiliaries and camped below the hill of Isandlwana.",
          "The Zulu army, around 20,000 strong under commanders including Ntshingwayo kaMahole, moved slowly and stayed hidden.",
        ],
      },
      {
        title: "The decision",
        body: [
          "On 22 January, believing he had located the Zulu army, Chelmsford took a large part of his force out of camp to attack it. The camp was left under Lieutenant-Colonel Pulleine, and it was not fortified.",
        ],
      },
    ],
    think: {
      question: "What was the biggest mistake on the British side?",
      options: [
        { key: "a", text: "Splitting the force without knowing where the enemy really was", reflection: "Dividing your army is only safe when you know where the threat is." },
        { key: "b", text: "Not fortifying the camp", reflection: "A serious error too: the camp had no defensive perimeter." },
        { key: "c", text: "Underestimating the enemy", reflection: "Arguably the root of the other two mistakes." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "The main Zulu force attacked the camp using the ‘horns and chest of the buffalo’: a central body that held the enemy while two wings swept round to encircle. More than 1,300 men on the British side were killed. It was one of the worst defeats of a modern army by an African force.",
        "The victory was costly: Zulu losses are estimated in the thousands. Britain returned with a much larger army, defeated the Zulu at Ulundi in July 1879, captured Cetshwayo, and split the kingdom into thirteen chiefdoms.",
      ],
    },
    sankofa: "Never split your forces against an enemy you cannot see. And remember: winning one battle is not the same as winning the war. The best strategists plan for what the other side does next.",
    known: [
      "The date, the split of Chelmsford’s column, the unfortified camp, the encirclement and the scale of losses are documented.",
      "The later defeat at Ulundi (4 July 1879) and the partition of Zululand are documented.",
    ],
    debated: ["Zulu force size and casualty figures vary between historians; most give 20,000–25,000 men and 1,000–3,000 killed."],
    source: "Ian Knight, Zulu Rising (2010); John Laband, Kingdom in Crisis: The Zulu Response to the British Invasion of 1879 (1992).",
  },
  {
    slug: "njinga-at-luanda",
    title: "Njinga at the negotiating table",
    category: "strategy",
    region: "central",
    country: "AO",
    place: "Luanda, present-day Angola",
    era: "1622",
    readMinutes: 4,
    symbol: "seat",
    kind: "decision",
    excerpt: "An envoy walks into a room where only the other side has chairs. Her answer became one of the most famous stories in African diplomacy.",
    sections: [
      {
        title: "The situation",
        body: [
          "In the early 1620s the Portuguese colony at Luanda was waging war on the kingdom of Ndongo. King Ngola Mbandi sent his sister, Njinga, to negotiate. She was royal, experienced and spoke Portuguese.",
        ],
      },
      {
        title: "The moment",
        body: [
          "According to the well-known account of the meeting, the Portuguese governor sat in a chair while only a mat was laid out for her. Where you sit at a negotiation signals who is in charge.",
        ],
      },
    ],
    think: {
      question: "What would you do when the room is set up to make you look smaller?",
      options: [
        { key: "a", text: "Sit on the mat and focus on the substance", reflection: "Sometimes wise. But in diplomacy, accepting a lower position can set the tone for everything that follows." },
        { key: "b", text: "Refuse to negotiate until treated as an equal", reflection: "Principled, but it risks ending the talks before they start." },
        { key: "c", text: "Change the room without leaving it", reflection: "That is what the story says she did." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "In the story, one of her attendants knelt and Njinga sat on her back, meeting the governor at eye level. She negotiated a treaty and was baptised in Luanda as Ana de Sousa.",
        "She went on to rule Ndongo and conquer Matamba, allied with the Dutch when they took Luanda in 1641, and made peace with Portugal on her own terms in 1656. She ruled until her death in 1663 and is honoured in Angola today.",
        "She was also a ruler of her time: her states took part in the slave trade, and historians caution against making her a simple hero or villain.",
      ],
    },
    sankofa: "Position is part of every negotiation. Sometimes the most important move is refusing the frame you were given, without walking out of the room.",
    known: [
      "The 1621–22 mission to Luanda, her baptism, her rule over Ndongo and Matamba, the Dutch alliance and the 1656 peace are documented.",
    ],
    debated: [
      "The chair story is a famous account, retold for centuries; details vary and it cannot be verified independently.",
      "Much of what we know comes from Portuguese and Capuchin writers with their own agendas.",
    ],
    source: "Linda M. Heywood, Njinga of Angola: Africa’s Warrior Queen (2017); John Thornton, ‘Legitimacy and Political Power: Queen Njinga, 1624–1663’, Journal of African History (1991).",
  },
  {
    slug: "ibn-khaldun-asabiyya",
    title: "Ibn Khaldun and why empires fall",
    category: "thinkers",
    region: "north",
    country: "TN",
    place: "Tunis → Cairo",
    era: "1332–1406",
    readMinutes: 4,
    symbol: "scroll",
    kind: "idea",
    excerpt: "A North African scholar noticed a pattern in history: the strength that builds a dynasty is the same thing that comfort slowly destroys.",
    sections: [
      {
        title: "The thinker",
        body: [
          "Ibn Khaldun was born in Tunis in 1332. He served rulers across North Africa and Andalusia as a secretary, diplomat and minister, and later became a judge and teacher in Cairo.",
          "In his Muqaddimah, written in the 1370s, he tried to explain why states rise and fall, not through luck, but through patterns.",
        ],
      },
      {
        title: "The idea",
        body: [
          "His key word was asabiyya: group solidarity. A tight, disciplined group with strong asabiyya can take power. Once in power, its members grow comfortable, rely on luxury and paid help, and the solidarity weakens, until a more cohesive group replaces them.",
        ],
      },
    ],
    think: {
      question: "Where do you see asabiyya today?",
      options: [
        { key: "a", text: "In a team that wins because everyone works for each other", reflection: "Exactly: a group can beat more talented individuals through cohesion." },
        { key: "b", text: "In a company that was hungry as a start-up but slow once successful", reflection: "Ibn Khaldun would recognise this immediately." },
        { key: "c", text: "Nowhere: success just depends on resources", reflection: "Resources matter. His point is that resources without cohesion are not enough." },
      ],
    },
    outcome: {
      title: "His legacy",
      body: [
        "Modern scholars count him among the forerunners of sociology, economics and historiography. In 1400, during the siege of Damascus, he was lowered over the city walls to meet the conqueror Timur.",
      ],
    },
    sankofa: "Success is not the end of the struggle; it is the start of a new test. Stay hungry, stay together, and watch for comfort becoming weakness.",
    known: ["His life, career and the Muqaddimah are well documented, including in his own autobiography."],
    debated: ["How far his cycle applies outside the societies he studied is debated; some of his views on other peoples are rightly criticised today."],
    source: "Ibn Khaldun, The Muqaddimah, trans. Franz Rosenthal (1958); Robert Irwin, Ibn Khaldun: An Intellectual Biography (2018).",
  },
  {
    slug: "the-ishango-bone",
    title: "The Ishango bone: what counts as evidence?",
    category: "innovation",
    region: "central",
    country: "CD",
    place: "Ishango, DR Congo → Brussels",
    era: "c. 20,000 years ago",
    readMinutes: 3,
    symbol: "bone",
    kind: "idea",
    excerpt: "Notches on a 20,000-year-old bone. Some see a calculator; others see a tally. This story is about how to tell the difference.",
    sections: [
      {
        title: "The object",
        body: [
          "In 1950 the Belgian geologist Jean de Heinzelin found a small, dark bone near Ishango, by the Semliki River in what is now the DR Congo. It has 168 notches arranged in three columns, and a piece of quartz fixed to one end.",
          "Its age is debated; the current estimate is about 20,000 years. It is kept today at the Royal Belgian Institute of Natural Sciences in Brussels.",
        ],
      },
      {
        title: "The readings",
        body: [
          "One column shows groups of 11, 13, 17 and 19 notches: the prime numbers between 10 and 20. Others have read the bone as a lunar calendar, a counting tool in base 12, or a simple tally.",
        ],
      },
    ],
    think: {
      question: "One column shows four prime numbers. Does that prove the makers understood primes?",
      options: [
        { key: "a", text: "Yes, that cannot be a coincidence", reflection: "Tempting, but four numbers is a small sample, and many patterns can appear by chance." },
        { key: "b", text: "No, it could be a coincidence, and we need more evidence", reflection: "This is the careful answer most researchers give." },
        { key: "c", text: "It shows people were counting and recording, which is already remarkable", reflection: "A strong position: the bone is evidence of early record-keeping, without overclaiming." },
      ],
    },
    outcome: {
      title: "Where scholars stand",
      body: [
        "Most researchers agree the marks were made on purpose and that the bone is one of the oldest known records of counting. Claims about prime numbers or advanced arithmetic are not accepted as proven.",
      ],
    },
    sankofa: "Pride in African history is strongest when it is accurate. Ask ‘how do we know?’, because the true story is impressive enough.",
    known: ["Discovery in 1950, the notch counts, and its location in Brussels are documented."],
    debated: ["Its exact age, and whether the marks show arithmetic, a calendar or a tally, are open questions."],
    source: "Royal Belgian Institute of Natural Sciences; Dirk Huylebrouck, Africa and Mathematics (2019); Olivier Keller, ‘The fables of Ishango’ (2010).",
  },
  {
    slug: "wangari-maathai-trees",
    title: "Wangari Maathai: seven trees",
    category: "thinkers",
    region: "east",
    country: "KE",
    place: "Nairobi, Kenya",
    era: "1977–2004",
    readMinutes: 4,
    symbol: "tree",
    kind: "decision",
    excerpt: "Facing soil loss, failing water and an untouchable government, she chose the smallest possible first move.",
    sections: [
      {
        title: "The situation",
        body: [
          "In the 1970s, rural Kenyan women told Wangari Maathai about streams drying up, firewood getting scarce and food harder to grow. Maathai was a scientist: in 1971 she became the first woman in East and Central Africa to earn a PhD.",
        ],
      },
      {
        title: "The choice",
        body: [
          "The problems were huge: deforestation, poverty, land grabs and a government that did not want to be challenged. Where do you start?",
        ],
      },
    ],
    think: {
      question: "Facing a problem that big, what is the best first move?",
      options: [
        { key: "a", text: "Lobby the government for a national policy", reflection: "Important, but slow, and easy to ignore without public pressure." },
        { key: "b", text: "Start something small that ordinary people can do themselves", reflection: "That is what she did: planting trees, paying women a small amount for each surviving seedling." },
        { key: "c", text: "Write a major report and wait for funding", reflection: "Knowledge matters, but action builds the movement that makes reports matter." },
      ],
    },
    outcome: {
      title: "What happened",
      body: [
        "The Green Belt Movement began on 5 June 1977 with seven trees in Nairobi. It grew into a movement of thousands of community groups planting trees across Kenya.",
        "Tree planting turned into wider struggles: she led campaigns to protect Uhuru Park and Karura Forest from development, and was beaten and arrested. She later became a member of parliament. In 2004 she became the first African woman to win the Nobel Peace Prize.",
      ],
    },
    sankofa: "Big change can start with a move small enough to do today. Every strong position in chess is built one quiet move at a time.",
    known: ["Her PhD (1971), the founding of the Green Belt Movement (1977), the Uhuru Park and Karura Forest campaigns, and the 2004 Nobel Peace Prize are documented."],
    debated: ["Total tree counts vary by source and are best read as estimates."],
    source: "Wangari Maathai, Unbowed: A Memoir (2006); Norwegian Nobel Committee, Nobel Peace Prize 2004.",
  },
  {
    slug: "maurice-ashley",
    title: "Maurice Ashley: the long road to grandmaster",
    category: "chess",
    region: "diaspora",
    country: "JM",
    place: "Jamaica → Brooklyn",
    era: "1966–today",
    readMinutes: 3,
    symbol: "knight",
    kind: "idea",
    excerpt: "A boy from Jamaica learns chess in Brooklyn parks. Decades later he is a grandmaster and the voice of world chess broadcasts.",
    sections: [
      {
        title: "The road",
        body: [
          "Maurice Ashley was born in Jamaica in 1966 and moved to the United States at 12, growing up in Brooklyn. He came to chess late by elite standards, as a teenager, playing in parks and clubs.",
          "While still chasing his own titles, he coached school teams from Harlem, the Raging Rooks and the Dark Knights, to national championships.",
        ],
      },
      {
        title: "The breakthrough",
        body: [
          "In 1999 he earned his final grandmaster norm, becoming widely recognised as the first Black chess grandmaster.",
        ],
      },
    ],
    think: {
      question: "He started chess late and coached others while still improving himself. What does that teach?",
      options: [
        { key: "a", text: "Teaching others is one of the best ways to learn", reflection: "Explaining an idea exposes the parts you don’t yet understand." },
        { key: "b", text: "Starting late is not a reason to stop", reflection: "It changes the route, not the destination." },
        { key: "c", text: "Community makes individuals stronger", reflection: "The teams he built became part of his own story." },
      ],
    },
    outcome: {
      title: "Today",
      body: [
        "He became one of chess’s best-known commentators, covering events from Kasparov vs Deep Blue to the Grand Chess Tour, and was inducted into the US Chess Hall of Fame in 2016.",
      ],
    },
    sankofa: "Your starting point is not your ceiling. Teach what you learn, and build a community that rises with you.",
    known: ["His birth in Jamaica, the GM norm in 1999, his coaching of Harlem teams and his Hall of Fame induction are documented."],
    debated: ["Sources differ on whether his title is dated 1999 (final norm) or 2000 (official award)."],
    source: "US Chess Hall of Fame; Maurice Ashley, Chess for Success (2005); Move by Move (2024).",
  },
  // ---------- Culture & ideas (from the original Sankofa set, restructured) ----------
  {
    slug: "go-back-and-get-it",
    title: "Go back and get it",
    category: "culture",
    region: "west",
    country: "GH",
    place: "Akan tradition, Ghana",
    era: "Proverb",
    readMinutes: 3,
    symbol: "sankofa",
    kind: "idea",
    excerpt: "The Akan word behind this platform, and why it fits a game built on memory.",
    sections: [
      {
        title: "The word",
        body: [
          "Sankofa comes from the Akan of Ghana. It is usually explained as san (return), ko (go) and fa (fetch): go back and get it.",
          "It is tied to a proverb: “Se wo were fi na wosankofa a yenkyi”, it is not wrong to go back for that which you have forgotten.",
        ],
      },
      {
        title: "The symbol",
        body: [
          "One Adinkra form shows a bird whose feet face forward while its head turns back to an egg on its back. The egg is the knowledge of the past; the feet say you keep moving.",
        ],
      },
    ],
    think: {
      question: "What does ‘going back’ look like for a chess player?",
      options: [
        { key: "a", text: "Reviewing the games you lost", reflection: "Exactly. Most improvement hides in the games we would rather forget." },
        { key: "b", text: "Studying old classic games", reflection: "Yes: strong players learn patterns from the past." },
        { key: "c", text: "Never repeating the same mistake", reflection: "That is the goal. Going back is how you get there." },
      ],
    },
    outcome: {
      title: "Why it matters here",
      body: ["Every game review in Sankofa Chess is a small act of sankofa: you return to the moment that mattered, take what it teaches, and move on stronger."],
    },
    sankofa: "Looking back is not going backwards. It is how you collect what you need for the next move.",
    known: ["Sankofa is an Akan concept and an Adinkra symbol."],
    debated: ["The breakdown of the word into san-ko-fa is a common explanation; linguists may describe it differently."],
    source: "W. Bruce Willis, The Adinkra Dictionary (1998).",
  },
  {
    slug: "the-wisdom-knot",
    title: "The wisdom knot",
    category: "culture",
    region: "west",
    country: "GH",
    place: "Asante, Ghana",
    era: "Adinkra tradition",
    readMinutes: 3,
    symbol: "nyansapo",
    kind: "idea",
    excerpt: "Adinkra symbols carry whole ideas in a single shape. One of them describes a strong chess player.",
    sections: [
      {
        title: "Adinkra",
        body: ["Adinkra symbols come from the Asante region of Ghana, where they were traditionally stamped onto cloth. Each stands for a proverb, a value or an idea."],
      },
      {
        title: "Nyansapo",
        body: [
          "Nyansapo, the wisdom knot, is associated with the idea that a wise person chooses the best means to reach a goal.",
          "Dwennimmen, the ram’s horns, stands for strength combined with humility.",
        ],
      },
    ],
    think: {
      question: "Which is closer to good chess: the most brilliant move, or the right one?",
      options: [
        { key: "a", text: "The most brilliant move", reflection: "Brilliance is beautiful, but it often isn’t needed, and it can be risky." },
        { key: "b", text: "The right move for this position", reflection: "That is nyansapo: the best means for the goal in front of you." },
      ],
    },
    outcome: { title: "At the board", body: ["Strong players often choose the simple move that keeps control over the flashy one that gives chances away."] },
    sankofa: "Wisdom is choosing the right tool, not the most impressive one.",
    known: ["Nyansapo and Dwennimmen are recorded Adinkra symbols."],
    debated: ["Meanings of Adinkra symbols can vary between communities and over time."],
    source: "W. Bruce Willis, The Adinkra Dictionary (1998).",
  },
  {
    slug: "senterej",
    title: "Senterej: chess at the Ethiopian court",
    category: "chess",
    region: "east",
    country: "ET",
    place: "Ethiopia",
    era: "Centuries before the 20th",
    readMinutes: 3,
    symbol: "board",
    kind: "idea",
    excerpt: "Ethiopia had its own version of chess, with an opening that rewarded fast development.",
    sections: [
      {
        title: "The game",
        body: [
          "Senterej is a traditional Ethiopian form of chess descended from the older shatranj family. It was played for centuries, including at the royal court.",
          "A notable feature: at the start, players could develop freely at their own pace until the first capture, after which moves alternated normally.",
        ],
      },
    ],
    think: {
      question: "If both sides could make several moves before the first capture, what would you do first?",
      options: [
        { key: "a", text: "Bring out pieces fast and safely", reflection: "Development first: exactly what modern coaches teach." },
        { key: "b", text: "Rush to attack", reflection: "In senterej, an early capture ends the free phase and could leave you less developed than your opponent." },
      ],
    },
    outcome: { title: "What happened to it", body: ["Senterej faded during the twentieth century as international rules spread, but it remains part of Africa’s chess story."] },
    sankofa: "Prepare before you strike. The player who is ready when the fighting starts usually wins it.",
    known: ["Senterej is recorded as an Ethiopian chess variant played at court."],
    debated: ["Details of its rules varied by place and period."],
    source: "H. J. R. Murray, A History of Chess (1913); Richard Pankhurst, writings on Ethiopian games.",
  },
  {
    slug: "oware-counting-ahead",
    title: "Oware and the art of counting ahead",
    category: "culture",
    region: "west",
    country: "GH",
    place: "West Africa",
    era: "Living tradition",
    readMinutes: 3,
    symbol: "oware",
    kind: "idea",
    excerpt: "A West African board game that trains the same muscle as chess calculation.",
    sections: [
      {
        title: "The game",
        body: [
          "Oware is a mancala game played across Ghana and West Africa; related games are played across the continent and the Caribbean. Players sow seeds around a board of pits and capture by landing on the right count.",
        ],
      },
      {
        title: "The skill",
        body: ["Strong players count several sowings ahead and set up captures their opponent doesn’t see coming: calculation without pieces."],
      },
    ],
    think: {
      question: "What skill do oware and chess share most?",
      options: [
        { key: "a", text: "Calculating several moves ahead", reflection: "Yes: both reward seeing the consequence before you act." },
        { key: "b", text: "Memorising openings", reflection: "Helpful in chess, but not the core of either game." },
      ],
    },
    outcome: { title: "Why it matters", body: ["Strategic thinking has deep roots across the continent. Chess is one vehicle among many."] },
    sankofa: "Count before you commit. The move you can calculate is the move you can trust.",
    known: ["Oware is a widely played mancala game in West Africa."],
    debated: ["Rules and names vary by region."],
    source: "Alexander J. de Voogt, Mancala Board Games (1997).",
  },
  {
    slug: "africas-chess-pioneers",
    title: "Africa’s chess pioneers",
    category: "chess",
    region: "pan-african",
    country: null,
    place: "Zambia · South Africa · Egypt · Uganda",
    era: "2000s–today",
    readMinutes: 3,
    symbol: "crown",
    kind: "idea",
    excerpt: "The players who put African chess on the world map, and the routes they took.",
    sections: [
      {
        title: "The players",
        body: [
          "Zambia’s Amon Simutowe became the first grandmaster from sub-Saharan Africa. South Africa’s Kenny Solomon became the country’s first grandmaster after winning the African Championship in December 2014.",
          "Egypt’s Bassem Amin has been one of Africa’s strongest players for years. Uganda’s Phiona Mutesi learned in Katwe, Kampala, and represented her country at Chess Olympiads; her story became the 2016 film Queen of Katwe.",
        ],
      },
    ],
    think: {
      question: "What do these very different routes have in common?",
      options: [
        { key: "a", text: "Talent", reflection: "Necessary, but not enough on its own." },
        { key: "b", text: "Someone who opened the door: a coach, a club, a programme", reflection: "In almost every case, a community made the path possible." },
        { key: "c", text: "Years of consistent work", reflection: "Always. Titles are the visible end of a long, quiet process." },
      ],
    },
    outcome: { title: "Next", body: ["Each of them started somewhere ordinary. The next one could be starting today."] },
    sankofa: "Talent needs a door and a habit. Find your club, show up daily, and hold the door for the next player.",
    known: ["Titles and events named here are recorded by FIDE and national federations."],
    debated: ["‘Strongest’ rankings change over time; check current FIDE ratings."],
    source: "FIDE ratings and title records; Tim Crothers, The Queen of Katwe (2012).",
  },
  {
    slug: "the-oldest-trap",
    title: "The oldest trap on the board",
    category: "chess",
    region: "north",
    country: null,
    place: "Shatranj, Arabic world",
    era: "Over a thousand years",
    readMinutes: 3,
    symbol: "arabian",
    kind: "idea",
    excerpt: "A rook and knight pattern that has been winning games for over a thousand years.",
    sections: [
      {
        title: "The pattern",
        body: [
          "The Arabian mate, a rook and knight trapping a king in the corner, is one of the oldest checkmate patterns on record, found in early Arabic writings on shatranj, the ancestor of modern chess.",
          "Chess travelled through the Islamic world and across North Africa into Spain and Europe. The game Europe inherited had already passed through many African and Arab hands.",
        ],
      },
    ],
    think: {
      question: "Why do old patterns still win games today?",
      options: [
        { key: "a", text: "Because the geometry of the board hasn’t changed", reflection: "Exactly: a good pattern is a truth about the board, not a fashion." },
        { key: "b", text: "Because opponents forget them", reflection: "Partly, which is why studying them gives you an edge." },
      ],
    },
    outcome: { title: "Try it", body: ["You can solve this exact pattern in the puzzle set: ‘The oldest trap’."] },
    sankofa: "Old wisdom still wins games. Patterns are knowledge someone else paid for; learn them for free.",
    known: ["The Arabian mate appears in early Arabic shatranj manuscripts."],
    debated: ["Exact dating of the earliest examples is uncertain."],
    source: "H. J. R. Murray, A History of Chess (1913).",
  },
];
