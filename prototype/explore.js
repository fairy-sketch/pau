"use strict";
/* PATH clickable demo: Explore. Open sessions from other clubs, like the school sports list: look around, put your name down, try it.
   Everything here is made up: the clubs, the sessions, the prices and the map. */

/* x and y place a club on the sketch map (0 to 100). `day` counts from the day the demo was started. */
const OFFERS = [
  { id: "mobility", club: "Mobility Lab", title: "Mobility for runners", sport: "Mobility", group: "Mind and body", img: ["people-stretch-class", "50% 50%"], day: 2, time: [19, 0], dur: 50, price: 0, trial: true, beginners: true, intensity: "low", cap: 14, taken: 9, x: 39, y: 47, place: "Kreis 4" },
  { id: "boulder", club: "Block 9 Boulder", title: "First climb, shoes included", sport: "Climbing", group: "Strength", img: ["class-climber-indoor", "80% 45%"], day: 3, time: [18, 30], dur: 90, price: 0, trial: true, beginners: true, intensity: "medium", cap: 12, taken: 7, x: 22, y: 33, place: "Altstetten" },
  { id: "swim", club: "Seebad Schwimmclub", title: "Front crawl for adults", sport: "Swimming", group: "Water", img: ["class-swimmer-underwater", "75% 65%"], day: 1, time: [7, 0], dur: 45, price: 0, trial: true, beginners: true, intensity: "low", cap: 10, taken: 6, x: 60, y: 74, place: "Seefeld" },
  { id: "row", club: "Ruderclub Limmat", title: "Learn to row", sport: "Rowing", group: "Water", img: ["class-rowing-aerial", "50% 50%"], day: 5, time: [9, 0], dur: 120, price: 20, beginners: true, intensity: "medium", cap: 8, taken: 5, x: 71, y: 90, place: "Zürichhorn" },
  { id: "padel", club: "Padel Werk", title: "Open doubles, come alone", sport: "Padel", group: "Ball games", img: ["class-padel-court", "50% 60%"], day: 2, time: [20, 0], dur: 60, price: 15, beginners: true, intensity: "medium", cap: 8, taken: 5, x: 10, y: 46, place: "Schlieren" },
  { id: "boxing", club: "Boxkeller 8004", title: "Boxing fitness for beginners", sport: "Boxing", group: "Combat", img: ["class-boxing-ring", "50% 45%"], day: 4, time: [19, 30], dur: 60, price: 0, trial: true, beginners: true, intensity: "high", cap: 16, taken: 11, x: 31, y: 58, place: "Kreis 4" },
  { id: "dance", club: "Tanzraum West", title: "Contemporary, open class", sport: "Dance", group: "Dance", img: ["class-dance-studio", "50% 40%"], day: 3, time: [19, 0], dur: 75, price: 18, beginners: false, intensity: "medium", cap: 18, taken: 10, x: 30, y: 20, place: "Kreis 5" },
  { id: "yoga", club: "Yoga am Fenster", title: "Slow flow at sunrise", sport: "Yoga", group: "Mind and body", img: ["class-yoga-window", "60% 50%"], day: 1, time: [6, 45], dur: 60, price: 0, trial: true, beginners: true, intensity: "low", cap: 12, taken: 8, x: 64, y: 50, place: "Hottingen" },
  { id: "streetball", club: "Streetball Josefwiese", title: "Pick-up game, all levels", sport: "Basketball", group: "Ball games", img: ["class-basketball-sunset", "50% 55%"], day: 6, time: [17, 0], dur: 90, price: 0, beginners: true, intensity: "high", cap: 20, taken: 12, x: 42, y: 30, place: "Kreis 5" },
  { id: "volley", club: "Beach Volley Mythenquai", title: "Winter hall beach volleyball", sport: "Volleyball", group: "Ball games", img: ["people-volleyball-beach", "50% 50%"], day: 8, time: [18, 0], dur: 90, price: 10, beginners: true, intensity: "medium", cap: 16, taken: 9, x: 44, y: 82, place: "Wollishofen" },
  { id: "xc", club: "Loipe Club Albis", title: "Dryland ski training", sport: "Cross-country skiing", group: "Outdoor", img: ["class-skiing-xc", "50% 50%"], day: 7, time: [18, 30], dur: 75, price: 12, beginners: false, intensity: "high", cap: 15, taken: 6, x: 26, y: 96, place: "Adliswil" },
  { id: "trail", club: "Trail Crew Uetliberg", title: "Easy forest loop, 7 km", sport: "Trail running", group: "Outdoor", img: ["class-trail-forest", "50% 50%"], day: 5, time: [8, 30], dur: 60, price: 0, beginners: true, intensity: "medium", cap: 25, taken: 14, x: 16, y: 72, place: "Uetliberg" },
  { id: "bars", club: "Bars and Rings Letten", title: "Calisthenics basics outdoors", sport: "Calisthenics", group: "Strength", img: ["class-calisthenics-sunset", "50% 50%"], day: 4, time: [12, 15], dur: 45, price: 0, beginners: true, intensity: "medium", cap: 12, taken: 4, x: 54, y: 22, place: "Letten" },
  { id: "dojo", club: "Dojo Kreis 5", title: "Kickboxing pad work, intro", sport: "Martial arts", group: "Combat", img: ["class-martial-arts-pad", "50% 40%"], day: 9, time: [19, 0], dur: 60, price: 0, trial: true, beginners: true, intensity: "high", cap: 14, taken: 14, x: 12, y: 16, place: "Kreis 5" },
  { id: "hockey", club: "Eishalle Nord Hockey", title: "Skate and stick basics", sport: "Ice hockey", group: "Ball games", img: ["class-hockey-rink", "50% 50%"], day: 10, time: [20, 15], dur: 60, price: 25, beginners: true, intensity: "high", cap: 20, taken: 13, x: 70, y: 8, place: "Oerlikon" },
  { id: "football", club: "FC Hardhof Feierabend", title: "After-work 7-a-side", sport: "Football", group: "Ball games", img: ["class-football-pitch-aerial", "50% 50%"], day: 2, time: [18, 15], dur: 75, price: 0, beginners: true, intensity: "high", cap: 14, taken: 10, x: 6, y: 30, place: "Hardhof" },
  { id: "pilates", club: "Pilates Atelier Seefeld", title: "Reformer taster", sport: "Pilates", group: "Mind and body", img: ["hero-pilates-studio", "50% 70%"], day: 6, time: [10, 0], dur: 50, price: 20, beginners: true, intensity: "low", cap: 6, taken: 4, x: 76, y: 66, place: "Seefeld" },
  { id: "tennis", club: "Tennis Club Allmend", title: "Rusty racket evening", sport: "Tennis", group: "Ball games", img: ["class-tennis-courts-empty", "45% 60%"], day: 11, time: [19, 0], dur: 90, price: 15, beginners: true, intensity: "medium", cap: 12, taken: 5, x: 34, y: 76, place: "Allmend" },
  { id: "velo", club: "Velo Kollektiv", title: "Sunday no-drop ride, 40 km", sport: "Cycling", group: "Outdoor", img: ["hero-cyclist-mountain-path", "50% 60%"], day: 6, time: [9, 30], dur: 150, price: 0, beginners: false, intensity: "medium", cap: 20, taken: 11, x: 86, y: 36, place: "Zürichberg" },
  { id: "ropes", club: "Kraftwerk Box", title: "Conditioning class, first one free", sport: "Functional training", group: "Strength", img: ["class-crossfit-ropes", "50% 60%"], day: 3, time: [6, 30], dur: 45, price: 0, trial: true, beginners: false, intensity: "high", cap: 14, taken: 8, x: 84, y: 54, place: "Hirslanden" },
  { id: "openfloor", club: "Open Floor Collective", title: "Move together, no steps to learn", sport: "Dance", group: "Dance", img: ["people-dance-ensemble", "50% 45%"], day: 12, time: [19, 30], dur: 90, price: 12, beginners: true, intensity: "low", cap: 30, taken: 12, x: 56, y: 38, place: "Kreis 1" },
  // Personal coaches and professional athletes (all invented). `who` says which; clubs need no mark.
  { id: "nico", who: "pro", club: "Nico Baumann", title: "Small-group session with Nico", sport: "Football", group: "Ball games", img: ["class-football-pitch-aerial", "50% 50%"], day: 7, time: [18, 0], dur: 75, price: 45, beginners: false, intensity: "high", cap: 10, taken: 6, x: 20, y: 54, place: "Hardturm" },
  { id: "mara", who: "coach", club: "Mara Keel", title: "Running form check, one to one", sport: "Running", group: "Outdoor", img: ["texture-starting-blocks", "50% 50%"], day: 3, time: [12, 0], dur: 45, price: 60, beginners: true, intensity: "low", cap: 3, taken: 2, x: 57, y: 60, place: "Sihlhölzli" },
  { id: "jonasw", who: "coach", club: "Jonas Wyss", title: "Strength for runners, intro", sport: "Strength", group: "Strength", img: ["texture-kettlebells", "50% 50%"], day: 4, time: [7, 0], dur: 45, price: 0, trial: true, beginners: true, intensity: "medium", cap: 6, taken: 3, x: 47, y: 44, place: "Kreis 5" },
  { id: "aline", who: "pro", club: "Aline Roth", title: "Dryland session with Aline", sport: "Alpine skiing", group: "Outdoor", img: ["class-skiing-alpine", "50% 50%"], day: 9, time: [18, 30], dur: 60, price: 35, beginners: true, intensity: "medium", cap: 12, taken: 7, x: 90, y: 82, place: "Zollikon" },
  { id: "dario", who: "pro", club: "Dario Koç", title: "Pad rounds with Dario", sport: "Boxing", group: "Combat", img: ["class-boxing-silhouette", "35% 45%"], day: 5, time: [19, 0], dur: 60, price: 30, beginners: false, intensity: "high", cap: 8, taken: 5, x: 24, y: 44, place: "Kreis 4" },
  // Health and recovery: everything around training that also moves a Path forward (all invented).
  { id: "physio", who: "care", club: "Physio am Fluss", title: "Runner's check, 30 min", sport: "Physiotherapy", group: "Care", img: ["people-coach-stretch", "50% 45%"], day: 2, time: [12, 30], dur: 30, price: 80, beginners: true, intensity: "low", cap: 3, taken: 1, x: 37, y: 66, place: "Wiedikon" },
  { id: "massage", who: "care", club: "Lockerraum Sportmassage", title: "Sports massage, 45 min", sport: "Massage", group: "Care", img: ["texture-foam-roller", "45% 55%"], day: 4, time: [17, 0], dur: 45, price: 70, beginners: true, intensity: "low", cap: 4, taken: 2, x: 66, y: 28, place: "Unterstrass" },
  { id: "food", who: "care", club: "Lena Frey", title: "Fuel check for runners", sport: "Sports nutrition", group: "Care", img: ["texture-water-bottle", "50% 50%"], day: 5, time: [12, 15], dur: 40, price: 60, beginners: true, intensity: "low", cap: 4, taken: 2, x: 75, y: 44, place: "Fluntern" },
  { id: "mind", who: "care", club: "Kopfsache", title: "Race nerves, first conversation", sport: "Mental coaching", group: "Care", img: ["moment-alpine-ridge", "50% 50%"], day: 6, time: [18, 0], dur: 30, price: 0, trial: true, beginners: true, intensity: "low", cap: 5, taken: 2, x: 8, y: 62, place: "Online" },
  { id: "cold", who: "care", club: "Kaltbad Club", title: "Sauna and cold plunge evening", sport: "Recovery", group: "Care", img: ["texture-pool-lane", "50% 50%"], day: 3, time: [20, 0], dur: 90, price: 22, beginners: true, intensity: "low", cap: 16, taken: 9, x: 53, y: 98, place: "Wollishofen" },
  // Events: races, tournaments, open days and talks (all invented). `club` is the organiser.
  { id: "nightrun", who: "event", club: "Stadtlauf Verein", title: "Limmat Night Run, 10K", sport: "10K night run", group: "Outdoor", img: ["hero-track-runner-silhouette", "30% 40%"], day: 26, time: [19, 30], dur: 90, price: 38, beginners: true, intensity: "high", cap: 800, taken: 612, x: 66, y: 38, place: "Start at the Limmatquai" },
  { id: "street3", who: "event", club: "Streetball Josefwiese", title: "3 × 3 winter tournament", sport: "3 × 3 tournament", group: "Ball games", img: ["class-basketball-aerial", "50% 50%"], day: 19, time: [10, 0], dur: 360, price: 20, beginners: true, intensity: "high", cap: 64, taken: 41, x: 38, y: 12, place: "Kreis 5" },
  { id: "snowday", who: "event", club: "Loipe Club Albis", title: "Winter sports open day", sport: "Open day", group: "Outdoor", img: ["class-skiing-valley", "50% 50%"], day: 13, time: [9, 0], dur: 420, price: 0, beginners: true, intensity: "medium", cap: 150, taken: 64, x: 14, y: 88, place: "Albis" },
  { id: "plank", who: "event", club: "Kraftwerk Box", title: "Plank-off and community breakfast", sport: "Community morning", group: "Strength", img: ["people-highfive-plank", "50% 50%"], day: 5, time: [9, 0], dur: 120, price: 0, beginners: true, intensity: "medium", cap: 40, taken: 22, x: 92, y: 62, place: "Hirslanden" },
  { id: "talk", who: "event", club: "Lockerraum Sportmassage", title: "Talk: how pros recover", sport: "Talk and questions", group: "Mind and body", img: ["moment-locker-room", "50% 50%"], day: 8, time: [19, 0], dur: 75, price: 10, beginners: true, intensity: "low", cap: 60, taken: 33, x: 62, y: 16, place: "Unterstrass" },
  { id: "openstage", who: "event", club: "Tanzraum West", title: "Open stage: an evening of dance", sport: "Open stage", group: "Dance", img: ["class-dance-window", "50% 45%"], day: 14, time: [20, 0], dur: 120, price: 0, beginners: true, intensity: "low", cap: 90, taken: 48, x: 30, y: 8, place: "Kreis 5" },
  { id: "volleycup", who: "event", club: "Beach Volley Mythenquai", title: "Winter cup, mixed teams", sport: "Winter cup", group: "Ball games", img: ["class-volleyball-sunset", "50% 50%"], day: 20, time: [9, 30], dur: 420, price: 15, beginners: false, intensity: "high", cap: 48, taken: 30, x: 44, y: 104, place: "Wollishofen" },
];
/* What each of them shows before you book: who they are, one thing they want you to know, and a taster plan you can put on your Path. */
const PEOPLE = {
  nico: { role: "Pro footballer, central midfield", insight: ["What a match week really looks like", "People think we run all day. Two days are hard, the rest is easy touches, sleep and food. The trick is to make the hard days short and honest."], plan: { title: "Train like a midfielder", days: [["Ball mastery, 20 min, easy", "low"], ["Repeat sprints, 8 × 30 m", "high"], ["Rest and a walk", "low"], ["Small-sided game or 4 × 4 min", "high"], ["Mobility, 15 min", "low"]] } },
  mara: { role: "Running coach, 10K to marathon", insight: ["Slow down to get faster", "Most runners I meet do their easy runs too fast and their hard runs too slow. Fix the easy ones first."], plan: { title: "Smoother stride in a week", days: [["Easy run 30 min, count your steps for one minute", "low"], ["6 × 20 s strides on grass", "medium"], ["Rest", "low"], ["Easy run 35 min, relaxed shoulders", "low"]] } },
  jonasw: { role: "Strength coach for endurance athletes", insight: ["Twenty minutes, twice a week", "Runners don't need a gym life. Two short sessions with heavy-ish legs and a strong trunk change how the last kilometres feel."], plan: { title: "Strength for runners, starter week", days: [["Split squats and calf raises, 20 min", "medium"], ["Rest", "low"], ["Hinge and plank circuit, 20 min", "medium"], ["Easy mobility, 10 min", "low"]] } },
  aline: { role: "Former World Cup alpine skier", insight: ["Ski legs are built in November", "Balance first, strength second, speed last. If you can stand on one leg with your eyes closed, the first day on snow is a different day."], plan: { title: "Ski legs before the season", days: [["Single-leg balance, 3 × 45 s each", "low"], ["Wall sits and lateral hops", "medium"], ["Rest", "low"], ["Tempo squats, 4 × 8", "medium"]] } },
  physio: { role: "Sports physiotherapy for runners", insight: ["Come before it hurts twice", "Most of what we see started as a small thing that was run through. Half an hour of looking at how you move saves weeks later. We assess and advise; we don't diagnose in an app."], plan: { title: "Five minutes for ankles and hips", days: [["Calf raises and ankle circles, 5 min", "low"], ["Hip openers, 5 min", "low"], ["Single-leg balance, 2 × 45 s each", "low"]] } },
  massage: { role: "Sports massage and soft-tissue work", insight: ["Recovery is training too", "A massage does not fix a plan that is too hard. It helps you notice what is tight before it becomes a problem."], plan: { title: "Roll and reset", days: [["Foam roll calves and quads, 6 min", "low"], ["Rest", "low"], ["Foam roll glutes and back, 6 min", "low"]] } },
  food: { role: "Lena Frey, sports dietitian", insight: ["Eat for the session you are about to do", "Most runners under-eat before hard days and over-think everything else. Start with what you eat two hours before track."], plan: { title: "Fuel around training, three days", days: [["Carbs two hours before your session", "low"], ["Drink to thirst, add a snack within an hour after", "low"], ["Write down what you ate before your best session", "low"]] } },
  mind: { role: "Mental coaching for sport", insight: ["Nerves mean you care", "You don't have to get rid of nerves. You need one thing to do when they come. We practise that thing."], plan: { title: "Two minutes before every session", days: [["Four slow breaths, then name one thing you will focus on", "low"], ["Same again, and write one line afterwards", "low"], ["Same again before your hardest session", "low"]] } },
  cold: { role: "Sauna, cold water and a quiet room", insight: ["Hot, cold, nothing", "Three rounds of sauna and cold water, then twenty minutes of doing nothing. The nothing is the part people skip."], plan: { title: "An easy evening routine", days: [["Legs up the wall, 5 min", "low"], ["Warm shower, 30 s cold to finish", "low"], ["Phone away an hour before bed", "low"]] } },
  nightrun: { role: "A 10K through the old town, after dark", insight: ["Flat, fast and lit by lanterns", "Two laps along the river, pacers for 40, 45, 50 and 60 minutes, and soup at the finish. If you are chasing a time, start behind your pacer, not in front."], plan: { title: "Two weeks to race day", days: [["Easy run 40 min", "low"], ["3 × 2 km at race pace", "high"], ["Rest", "low"], ["Easy run 30 min with 4 strides", "medium"], ["Rest, lay out your kit", "low"]] } },
  street3: { role: "3 × 3, groups in the morning, finals after lunch", insight: ["Come as a team or come alone", "We put single players into teams at nine. Every team plays at least four games."], plan: { title: "Game legs in a week", days: [["Shooting, 20 min", "low"], ["Defensive slides, 6 × 30 s", "medium"], ["Rest", "low"]] } },
  snowday: { role: "Try cross-country, biathlon and ski touring in one day", insight: ["Bring warm clothes, we bring the rest", "Skis, boots and poles are there in every size. Pick three taster sessions on the day."], plan: { title: "Ready for snow", days: [["Single-leg balance, 3 × 45 s each", "low"], ["Brisk walk with poles, 30 min", "low"], ["Rest", "low"]] } },
  plank: { role: "A friendly contest, then coffee", insight: ["Nobody holds it as long as they think", "Three rounds, your best time counts. Then breakfast for everyone who came, however long they held."], plan: { title: "Three days to a longer plank", days: [["Plank, 3 × 30 s", "medium"], ["Side plank, 3 × 20 s each", "medium"], ["Rest", "low"]] } },
  talk: { role: "An evening with two physios and a pro cyclist", insight: ["What actually helps, and what is just expensive", "Sleep, food and easy days first. We go through the rest honestly, and you can ask anything."], plan: { title: "Before the talk", days: [["Write down how you recover now", "low"], ["Note your sleep for two nights", "low"], ["Bring one question", "low"]] } },
  openstage: { role: "Short pieces from the studio's classes, and an open floor after", insight: ["Watch first, dance later", "Forty minutes of pieces from beginners to the company class. Afterwards the floor is open to everyone."], plan: { title: "Loosen up for the open floor", days: [["Put on one song and move", "low"], ["Hips and ankles, 10 min", "low"], ["Rest", "low"]] } },
  volleycup: { role: "Mixed teams of four, indoor sand", insight: ["A long day in warm sand", "Six teams per group, then knockout. Sign up as a team or get placed in one."], plan: { title: "Sand legs", days: [["Jump and land softly, 3 × 8", "medium"], ["Shoulder mobility, 10 min", "low"], ["Rest", "low"]] } },
  dario: { role: "Professional boxer, welterweight", insight: ["Footwork before fists", "Everybody wants to hit. Learn to move your feet for a week and you will hit better without trying."], plan: { title: "Footwork basics", days: [["Skipping, 6 × 1 min, easy", "low"], ["Shadow rounds, 6 × 2 min", "high"], ["Rest", "low"], ["Step and pivot drill, 15 min", "medium"]] } },
};
const CLUB_PLAN = {
  "Ball games": [["Ball and wall, 15 min of touches", "low"], ["Rest", "low"], ["Short shuttles, 6 × 20 m", "medium"]],
  Water: [["Shoulder mobility, 10 min", "low"], ["Rest", "low"], ["Breathing drill on land, 5 min", "low"]],
  "Mind and body": [["Ten minutes of slow stretching", "low"], ["Rest", "low"], ["Balance and breathing, 10 min", "low"]],
  Strength: [["Hangs and push-ups, 3 easy sets", "medium"], ["Rest", "low"], ["Core circuit, 10 min", "medium"]],
  Combat: [["Skipping, 5 × 1 min", "medium"], ["Rest", "low"], ["Shadow work, 3 × 2 min", "medium"]],
  Dance: [["Put on one song and move", "low"], ["Rest", "low"], ["Hips and ankles, 10 min", "low"]],
  Outdoor: [["Easy 30 min outside", "low"], ["Rest", "low"], ["Hill strides, 5 × 20 s", "medium"]],
};
const KIND = { club: "Club", coach: "Personal coach", pro: "Pro athlete", care: "Health and recovery", event: "Event" };
/* On the map each kind has its own dot colour, explained in the legend. The colour is never the only cue: the label says the kind too. */
const KIND_COLOR = { club: "#1C1916", coach: "#5F6E52", pro: "#9C4F36", care: "#4A6274", event: "#8A6A12" };
const KIND_PLURAL = { club: "Clubs", coach: "Coaches", pro: "Pros", care: "Care", event: "Events" };
const KIND_TAG = { coach: "Coach", pro: "Pro", care: "Care", event: "Event" };
const kindOf = (o) => o.who || "club";
/* Everything a provider shows on their page. Clubs get a short welcome and a three-day warm-up for their sport. */
function providerOf(o) {
  const p = PEOPLE[o.id];
  if (p) return { role: p.role, insight: p.insight, plan: p.plan };
  return { role: `${o.sport} in ${o.place}`, insight: ["Why come by", `${o.beginners ? "You don't need to know anything or bring anything special." : "Some experience helps, but nobody checks."} Come ${o.price ? "once" : "for free"}, meet the group, and decide afterwards.`], plan: { title: `Get ready for ${o.sport.toLowerCase()}`, days: CLUB_PLAN[o.group] } };
}
const trying = (id) => S.tryPlans.find((x) => x.id === id);
/* A taster plan sits next to the coach-approved plan; it never changes it. */
function tryPlan(id, key) {
  if (key && S.idem[key]) return S.idem[key];
  const o = offerById(id); if (!o) return remember(key, err("NOT_FOUND", "That plan is no longer listed."));
  if (trying(id)) return remember(key, err("ALREADY_BOOKED", "That plan is already on your Path."));
  S.tryPlans.push({ id, at: now() });
  return remember(key, { ok: true, msg: `"${providerOf(o).plan.title}" by ${o.club} is on your Path. Your own plan stays as it is.` });
}
function dropPlan(id) { S.tryPlans = S.tryPlans.filter((x) => x.id !== id); return { ok: true, msg: "Removed from your Path." }; }
/* Today's item of a taster plan. The guardrail holds here too: with a pain flag or load above the limit, a hard day is held back. */
function tryToday(t) {
  const o = offerById(t.id), days = providerOf(o).plan.days, n = Math.floor((today() - sod(t.at)) / 864e5), day = days[n % days.length], held = guard().active && day[1] === "high";
  return { o, n: (n % days.length) + 1, of: days.length, text: held ? "Easy day. The hard session waits until your load is back in range." : day[0], held };
}
const ME_AT = { x: 48, y: 54 };
const offerById = (id) => OFFERS.find((o) => o.id === id);
const offerStart = (o) => { const b = new Date(S.exploreBase + "T12:00"); return new Date(b.getFullYear(), b.getMonth(), b.getDate() + o.day, o.time[0], o.time[1]); };
const offerKm = (o) => Math.round(Math.hypot(o.x - ME_AT.x, (o.y - ME_AT.y) * 1.15) * 1.1) / 10; // the sketch map is about 9 km across
const signedUp = (id) => S.signups.some((x) => x.id === id);
const onWait = (id) => S.signups.some((x) => x.id === id && x.wait);
const offerSpots = (o) => Math.max(0, o.cap - o.taken - (signedUp(o.id) && !onWait(o.id) ? 1 : 0));
const offerPrice = (o) => (o.price ? chf(o.price) : o.trial ? "Free trial" : "Free");
const openOffers = () => OFFERS.filter((o) => offerStart(o) > now()).sort((a, b) => offerStart(a) - offerStart(b));
const offerLine = (o) => `${o.title}, ${o.club}: ${fDay(offerStart(o))} ${fTime(offerStart(o))}, ${offerKm(o)} km away, ${offerPrice(o).toLowerCase()}`;

const offerClash = (o) => clashAt(offerStart(o), new Date(offerStart(o).getTime() + o.dur * 60000), o.id);
/* Putting your name down. The club learns your name and nothing else; your pass and your log stay where they are. */
function signUp(id, key, opts = {}) {
  if (key && S.idem[key]) return S.idem[key];
  const o = offerById(id); if (!o) return remember(key, err("NOT_FOUND", "That session is no longer listed."));
  if (offerStart(o) <= now()) return remember(key, err("WINDOW_CLOSED", "That session has already started."));
  if (signedUp(id)) return remember(key, err("ALREADY_BOOKED", "Your name is already down for this."));
  if (offerSpots(o) <= 0) {
    if (!opts.wait) return remember(key, err("SESSION_FULL", "This one is full. You can join its waitlist."));
    S.signups.push({ id, at: now(), wait: true });
    return remember(key, { ok: true, msg: `You are on the waitlist for ${o.title} at ${o.club}. Nothing is charged; you are told when a spot opens.` });
  }
  const clash = offerClash(o);
  S.signups.push({ id, at: now() });
  return remember(key, { ok: true, msg: `You're in: ${o.title} at ${o.club}, ${fDay(offerStart(o))} ${fTime(offerStart(o))}. ${o.club} sees your name, nothing else.${clash ? ` Heads up: it overlaps with ${clash}.` : ""}` });
}
function dropSignup(id) { const o = offerById(id); S.signups = S.signups.filter((x) => x.id !== id); return { ok: true, msg: `Your name is off the list for ${o ? o.title : "that session"}.` }; }

/* ---------- filters ---------- */
/* Explore has two questions, in this order (X-15): who offers it (club, coach, pro, care, event), then which discipline.
   The disciplines on offer depend on the "who": under Care they are physiotherapy, massage and so on; everywhere else the sport family. */
const discOf = (o, kind = S.explore.kind) => (kind === "care" ? o.sport : o.group);
const disciplines = (kind = S.explore.kind) => {
  const pool = openOffers().filter((o) => (kind === "all" ? kindOf(o) !== "care" : kindOf(o) === kind));
  const have = [...new Set(pool.map((o) => discOf(o, kind)))];
  return [...GROUPS.filter((g) => have.includes(g)), ...have.filter((g) => !GROUPS.includes(g)).sort()];
};
const exploreMatch = (o) => { const f = S.explore; return (f.kind === "all" || kindOf(o) === f.kind) && (f.group === "all" || discOf(o) === f.group) && (!f.free || !o.price) && (!f.beginners || o.beginners); };
const exploreList = () => openOffers().filter(exploreMatch);

/* ---------- the coach can look here too ---------- */
const SPORT_WORDS = { nightrun: /night run|10k race|\brace\b/, street3: /3 ?[x×] ?3|tournament/, snowday: /open day|snow day/, plank: /plank/, talk: /\btalk\b/, openstage: /open stage/, volleycup: /winter cup|volleyball cup/, physio: /physio/, massage: /massage/, food: /nutrition|dietit|fuel|what to eat/, mind: /mental|nerves|mindset/, cold: /sauna|cold plunge|ice bath/, nico: /nico|footballer|soccer player|midfield/, mara: /mara|form check|running coach/, jonasw: /jonas wyss|strength coach|strength for runners/, aline: /aline|skier/, dario: /dario|pro boxer/, swim: /swim|crawl|pool/, boulder: /climb|boulder/, row: /\brow/, padel: /padel/, boxing: /box/, dance: /contemporary/, openfloor: /dance|dancing/, yoga: /yoga/, streetball: /basket|streetball/, volley: /volley/, xc: /ski/, trail: /trail/, bars: /calisthenic|pull.?up|bars/, dojo: /kickbox|martial|dojo/, hockey: /hockey|skat/, football: /football|soccer/, pilates: /pilates|reformer/, tennis: /tennis/, velo: /cycl|bike|ride|velo/, ropes: /crossfit|conditioning|functional/, mobility: /mobility|stretch/ };
const namedOffer = (text) => { const t = text.toLowerCase(); const hit = Object.entries(SPORT_WORDS).find(([id, re]) => re.test(t) && offerStart(offerById(id)) > now()); return hit ? offerById(hit[0]) : OFFERS.find((o) => t.includes(o.club.toLowerCase())) || null; };
function replyExplore(text) {
  const t = text.toLowerCase(), named = namedOffer(text), wantsIn = /sign me up|put me down|put my name|book|join|i'?m in|count me in/.test(t);
  if (named && /\bplan\b|train like|follow/.test(t)) {
    const o = named, pl = providerOf(o).plan;
    if (trying(o.id)) return say(`"${pl.title}" by ${o.club} is already on your Path.`);
    return propose(`${o.club} shares a taster plan. It sits next to your own plan and does not change it.`, { intent: `tryplan:${o.id}`, title: "Add this plan to your Path?", lines: [`${pl.title}, by ${o.club}`, `${pl.days.length} days, free: ${pl.days.map((d) => d[0]).slice(0, 2).join("; ")}…`, guard().active ? "Your load is up, so its hard days are held back until you are back in range." : "You can remove it any time."], acts: [{ t: "tryplan", id: o.id }] });
  }
  if (named && wantsIn) {
    const o = named;
    if (signedUp(o.id)) return say(`Your name is already down for ${o.title} at ${o.club}, ${fDay(offerStart(o))} ${fTime(offerStart(o))}.`);
    if (offerSpots(o) <= 0) return say(`${o.title} at ${o.club} is full. Want me to look for something similar? Ask me to suggest something new.`);
    if (o.price) { S.chat.push({ who: "coach", text: `${o.title} at ${o.club} costs ${chf(o.price)}. I never pay for you: open it and pay there, and your name goes on the list.`, picks: [o.id] }); return null; }
    return propose("Found it in Explore.", { intent: `signup:${o.id}`, title: "Put your name down?", lines: [`${o.title}, ${o.club}`, `${fDay(offerStart(o))} ${fTime(offerStart(o))}, ${o.place}, ${offerKm(o)} km away`, `${offerPrice(o)}. ${offerSpots(o)} of ${o.cap} spots left.`, `${o.club} sees your name, nothing else.`], acts: [{ t: "signup", id: o.id }] });
  }
  if (named) { S.chat.push({ who: "coach", text: `In Explore: ${offerLine(named)}. ${offerSpots(named)} spots left${named.beginners ? ", beginners welcome" : ""}.`, picks: [named.id] }); return null; }
  // A suggestion. Deterministic, and it follows the same guardrail as plans: with a pain flag or load above the limit, only easy sessions.
  const g = guard(), pool = openOffers().filter((o) => !signedUp(o.id) && offerSpots(o) > 0 && (!/free/.test(t) || !o.price) && (!/near|close/.test(t) || offerKm(o) <= 3));
  const fit = (o) => (o.intensity === "low" ? 3 : o.intensity === "medium" ? 1 : 0) + (["Mind and body", "Water", "Strength"].includes(o.group) ? 2 : 0) + (o.beginners ? 1 : 0) + (o.price ? 0 : 1) - offerKm(o) / 4;
  if (/\bevents?\b|\braces?\b|tournament|competition|open day/.test(t)) {
    const ev = pool.filter((o) => kindOf(o) === "event").sort((a, b) => offerStart(a) - offerStart(b)), run = ev.find((o) => o.id === "nightrun"), list = (run ? [run, ...ev.filter((o) => o !== run)] : ev).slice(0, 3);
    if (list.length) { S.chat.push({ who: "coach", text: `Coming up:\n${list.map((o, i) => `${i + 1}. ${offerLine(o)}`).join("\n")}` + (run ? `\nThe night run is a 10K, which fits your goal (${S.goal.title}). Its page has a two-week plan to get ready.` : "") + `\nOpen one to read more. If you like it, I can put your name down.`, picks: list.map((o) => o.id) }); return null; }
  }
  if (/recover|care|physio|massage|health/.test(t)) { const care = pool.filter((o) => kindOf(o) === "care").slice(0, 3); if (care.length) { S.chat.push({ who: "coach", text: `Around training, these have something open:\n${care.map((o, i) => `${i + 1}. ${offerLine(o)}`).join("\n")}\nI can't tell you which one you need. Open one to see what they do.`, picks: care.map((o) => o.id) }); return null; } }
  let picks = pool.filter((o) => !g.active || o.intensity === "low").sort((a, b) => fit(b) - fit(a)).slice(0, 3);
  // With an open pain flag the first suggestion is someone who can look at it. The flag itself is never shared with them.
  const physio = stats().pain && pool.find((o) => o.id === "physio");
  if (physio) picks = [physio, ...picks.filter((o) => o.id !== "physio")].slice(0, 3);
  if (!picks.length) return say("Nothing in Explore fits right now. New sessions are listed as clubs open them.");
  if (/coach|pro\b|athlete|player/.test(t)) { const ppl = pool.filter((o) => kindOf(o) !== "club").sort((a, b) => fit(b) - fit(a)).slice(0, 3); if (ppl.length) { S.chat.push({ who: "coach", text: `Coaches and pros who have something open:\n${ppl.map((o, i) => `${i + 1}. ${o.club}, ${providerOf(o).role.toLowerCase()}: ${offerLine(o)}`).join("\n")}\nEach has a short plan you can try first. Ask me to add one, for example "add Nico's plan".`, picks: ppl.map((o) => o.id) }); return null; } }
  const why = g.active ? `Your load is up${stats().pain ? " and you flagged pain" : ""}, so I only looked at easy sessions.${physio ? " A physio is first on the list; I can't judge the pain, they can look at it. They only learn about it if you tell them." : ""}` : `You run a lot, so I looked for things that balance it: mobility, water, strength.`;
  S.chat.push({ who: "coach", text: `${why} Three from other clubs you could try:\n${picks.map((o, i) => `${i + 1}. ${offerLine(o)}`).join("\n")}\nOpen one to read more. If you like it, I can put your name down.`, picks: picks.map((o) => o.id) });
  return null;
}
const pickBtns = (ids) => { const live = ids.map(offerById).filter((o) => o && offerStart(o) > now()); return live.length ? `<div class="opts" data-picks>${live.map((o) => `<button class="btn full" data-a="prov-open" data-v="${o.id}">${signedUp(o.id) ? "You're in: " : "View: "}${esc(kindOf(o) === "club" || kindOf(o) === "event" ? o.title : o.club)}</button>`).join("")}</div>` : ""; };

/* ---------- screens ---------- */
const GROUPS = ["Ball games", "Water", "Mind and body", "Strength", "Combat", "Dance", "Outdoor"];
/* A provider's page walks from "who are they" to "try their plan" to "book". */
function vProvider(o) {
  const p = providerOf(o), at = offerStart(o), inList = signedUp(o.id), t = trying(o.id), left = offerSpots(o), g = guard().active;
  return `<section class="pad stack-l" id="provider" data-id="${o.id}"><div><button class="btn sm ghost" style="padding-left:0" data-a="prov-open" data-v="" aria-label="Back to Explore">${I(P.back, 16)}Explore</button></div>
    <div class="offerpic" style="height:190px">${photo(o.img)}</div>
    <div><div class="eyebrow">${KIND[kindOf(o)]} · ${offerKm(o)} km away</div><h1 class="h1">${esc(kindOf(o) === "event" ? o.title : o.club)}</h1><p class="sub" style="margin-top:4px">${kindOf(o) === "event" ? esc(o.club) + " · " : ""}${esc(p.role)}</p></div>
    <div class="stack" style="gap:8px"><div class="eyebrow">1 · From ${kindOf(o) === "club" ? "the club" : kindOf(o) === "care" ? "them" : kindOf(o) === "event" ? "the organisers" : esc(o.club.split(" ")[0])}</div><div class="card stack" style="gap:8px"><p class="h2">${esc(p.insight[0])}</p><p class="sub">${esc(p.insight[1])}</p></div></div>
    <div class="stack" style="gap:8px" id="tryplan"><div class="eyebrow">2 · ${kindOf(o) === "event" ? "Get ready for it" : "Try their plan"}</div><div class="card stack"><div><p class="h2">${esc(p.plan.title)}</p><p class="sub">${p.plan.days.length} days · free taster · sits next to your own plan</p></div>
      <ol class="sub stack" style="gap:4px;padding-left:20px">${p.plan.days.map((d) => `<li>${esc(d[0])}</li>`).join("")}</ol>
      ${g && p.plan.days.some((d) => d[1] === "high") ? `<p class="note">Your load is up right now, so the hard days are held back until you are back in range.</p>` : ""}
      ${t ? `<p class="sub" id="onpath">On your Path since ${fDay(t.at)}.</p><button class="btn full" data-a="plan-drop" data-v="${o.id}">Remove from my Path</button>` : `<button class="btn ${inList ? "" : "acc"} full" data-a="plan-try" data-v="${o.id}">Add to my Path</button>`}</div></div>
    <div class="stack" style="gap:8px" id="booknow"><div class="eyebrow">3 · ${kindOf(o) === "event" ? "Sign up" : "Book a session"}</div><div class="card stack"><div><p class="h2">${esc(o.title)}</p><p class="sub">${fDay(at)} · ${fTime(at)} · ${o.dur} min · ${esc(o.place)} · ${offerPrice(o)} · ${left} of ${o.cap} spots left</p></div>
      ${inList ? `<p class="sub">${onWait(o.id) ? "You are on the waitlist." : "Your name is down."} ${esc(o.club)} sees your name, nothing else.</p><button class="btn full" data-a="offer-drop" data-v="${o.id}">${onWait(o.id) ? "Leave the waitlist" : "Take my name off"}</button>` : left <= 0 ? `<p class="note">This one is full.</p><button class="btn full" data-a="offer-open" data-v="${o.id}">Join waitlist</button>` : `<button class="btn ${t ? "acc" : ""} full" data-a="offer-open" data-v="${o.id}">${o.price ? `Book · ${chf(o.price)}` : "Book, free"}</button>`}</div></div></section>`;
}
function vExplore() {
  const openP = S.explore.open && offerById(S.explore.open); if (openP) return vProvider(openP);
  const f = S.explore, list = exploreList(), mine = S.signups.map((x) => offerById(x.id)).filter((o) => o && offerStart(o) > now()).sort((a, b) => offerStart(a) - offerStart(b));
  const chip = (a, v, label, on) => `<button class="chip" data-a="${a}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  const tile = (o) => `<button class="tile" data-a="prov-open" data-v="${o.id}" data-kind="${kindOf(o)}"><span class="pic">${photo(o.img)}${signedUp(o.id) ? `<span class="in">${I(P.tick, 14)}</span>` : ""}</span><span class="cap"><span class="strong">${esc(kindOf(o) === "club" || kindOf(o) === "event" ? o.sport : o.club)}</span><span class="sub">${kindOf(o) === "club" ? "" : `<span class="who">${KIND_TAG[kindOf(o)]}</span> · `}${WD[offerStart(o).getDay()]} ${offerStart(o).getDate()} · ${o.price ? chf(o.price).replace(".00", "") : "Free"}</span></span><span class="sr">${esc(o.title)}, ${esc(o.club)}${signedUp(o.id) ? ", your name is down" : ""}</span></button>`;
  return `<section class="pad stack-l" id="explore"><div><div class="eyebrow">Explore</div><h1 class="h1">Try something new</h1><p class="sub" style="margin-top:4px">Clubs, coaches, pros, physios and events around you. Look, try their plan, put your name down, like on the school sports list.</p></div>
    ${mine.length ? `<div class="stack" id="mylist" style="gap:8px"><div class="eyebrow">Your list · ${mine.length}</div><div class="card rows">${mine.map((o) => `<div class="row"><span class="lead time">${WD[offerStart(o).getDay()]} ${offerStart(o).getDate()}</span><button class="mid" style="text-align:left;min-height:44px" data-a="prov-open" data-v="${o.id}"><span class="strong" style="display:block">${esc(o.title)}</span><span class="sub">${fTime(offerStart(o))} · ${esc(o.club)}</span></button>${xBtn("offer-drop", "Take my name off: " + o.title, o.id)}</div>`).join("")}</div></div>` : ""}
    <div class="stack"><div class="seg full" id="xkinds" role="group" aria-label="Who offers it">${[["all", "All"], ...Object.entries(KIND_PLURAL)].map(([k, l]) => `<button data-a="xkind" data-v="${k}" aria-pressed="${f.kind === k}">${l}</button>`).join("")}</div>
      <div class="filters" id="xdisc" role="group" aria-label="Discipline">${chip("xgroup", "all", "All", f.group === "all")}${disciplines().map((g) => chip("xgroup", g, g, f.group === g)).join("")}</div>
      <div class="between" style="align-items:center"><span class="sub" id="xcount">${list.length} of ${openOffers().length}</span><span class="only" role="group" aria-label="Only show">${[["free", "Free"], ["beginners", "Beginners welcome"]].map(([k, l]) => `<button class="btn sm ${f[k] ? "" : "ghost"}" data-a="xflag" data-v="${k}" aria-pressed="${!!f[k]}">${f[k] ? I(P.tick, 14) : ""}${l}</button>`).join("")}</span></div>
      ${list.length ? "" : `<p class="sub" id="xnone">Nothing here yet. Try another discipline, or turn off "Free" and "Beginners welcome".</p>`}</div>
    <div class="tiles3" id="xgrid">${list.map(tile).join("")}</div>
    <p class="note">Stuck for ideas? Ask your coach: "Suggest something new for me".</p></section>`;
}
function vOfferSheet() {
  const o = offerById(UI.sheet.id), at = offerStart(o), inList = signedUp(o.id), left = offerSpots(o);
  const full = left <= 0 && !inList;
  /* What happens if you book: spots, what it costs, what it does to your passes, and the waitlist if it is full. */
  const then = inList ? [onWait(o.id) ? "You are on the waitlist. You are told when a spot opens." : "Your name is down. It is in your Week and your coach knows about it.", "You can take your name off at any time."]
    : [!full && offerClash(o) ? `It overlaps with ${esc(offerClash(o))}.` : "", full ? "It is full. You can join the waitlist: you are told when a spot opens, and nothing is charged until then." : `You take 1 of the ${left} spots left; ${left - 1} remain.`, "It uses none of your passes or credits.", full ? "" : o.price ? `You pay ${chf(o.price)} once, in the test checkout. No real money moves.` : "Nothing is charged.", "It shows up in your Week, and your coach can see and cancel it for you."].filter(Boolean);
  const action = inList ? `<button class="btn full" data-a="offer-drop" data-v="${o.id}">${onWait(o.id) ? "Leave the waitlist" : "Take my name off"}</button>`
    : full ? `<button class="btn acc full" data-a="offer-wait" data-v="${o.id}">Join waitlist</button>`
    : `<button class="btn acc full" data-a="offer-signup" data-v="${o.id}">${o.price ? `Put my name down · ${chf(o.price)}` : "Put my name down"}</button>`;
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="offerpic">${photo(o.img)}</div>
    <div><div class="eyebrow">${esc(o.sport)} · ${esc(o.club)}</div><h2 class="h1">${esc(o.title)}</h2><p class="sub" style="margin-top:4px">${fDay(at)} · ${fTime(at)} · ${o.dur} min · ${esc(o.place)}, ${offerKm(o)} km away</p></div>
    <div class="card rows"><div class="row"><span class="mid sub">Price</span><span class="strong">${offerPrice(o)}</span></div><div class="row"><span class="mid sub">Level</span><span class="strong" style="text-align:right">${o.beginners ? "Beginners welcome" : "Some experience helps"}<br>${o.intensity} intensity</span></div><div class="row"><span class="mid sub">Spots</span><span class="strong mono">${left} / ${o.cap} left</span></div></div>
    <div class="stack" id="consequence" style="gap:6px"><div class="eyebrow">If you ${inList ? "stay" : full ? "join the waitlist" : "book"}</div><ul class="sub stack" style="gap:4px;padding-left:18px;list-style:disc">${then.map((x) => `<li>${x}</li>`).join("")}</ul><p class="sub">${esc(o.club)} sees your name, nothing else.</p></div>
    ${action}<button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
}
