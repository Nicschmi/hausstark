'use strict';
/* Hausstark – lokales Heimtraining. Alle Daten bleiben in IndexedDB auf diesem Gerät.
   Keine Netzwerkanfragen, keine Drittanbieter. */

// ---------- Helfer ----------
const $ = (s, el = document) => el.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const fmtD = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => parseYmd(s).toLocaleDateString('de-DE', o);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pf = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmt = (v, d = 1) => v == null ? '–' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: d });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => ymd();
const mmss = s => `${Math.floor(s / 60)}:${pad(Math.max(0, Math.floor(s % 60)))}`;
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Übungen ----------
// Posen: n = Nacken/Schulter, h = Hüfte, a/a2 = Arm (Ellbogen x,y, Hand x,y), l/l2 = Bein (Knie x,y, Fuß x,y)
// a/l = vordere Gliedmaßen (dunkel), a2/l2 = hintere (hell). Koordinaten im 200×130-Raster, Boden bei y=120.
const STAND = { n: [100, 34], h: [100, 72], a: [100, 52, 100, 70], l: [100, 96, 100, 120] };
const EX = {
  marsch: { name: 'Marschieren auf der Stelle', cat: 'warm', mus: 'Kreislauf, Hüfte, Koordination',
    s: STAND, e: { n: [100, 34], h: [100, 72], a: [106, 51, 120, 44], a2: [94, 51, 90, 69], l: [122, 76, 120, 100], l2: [100, 96, 100, 120] },
    steps: ['Aufrecht hinstellen, Füße hüftbreit.', 'Abwechselnd die Knie bis etwa Hüfthöhe anheben.', 'Arme gegengleich mitschwingen und gleichmäßig atmen.'],
    err: ['Ins Hohlkreuz fallen: Bauch leicht anspannen.'], easy: 'Knie nur leicht anheben.', hard: 'Zügiger marschieren.', breath: 'Ruhig durch die Nase atmen.' },
  armkreisen: { name: 'Armkreisen', cat: 'warm', mus: 'Schultern, oberer Rücken', front: true,
    s: { n: [100, 34], h: [100, 72], a: [82, 36, 64, 38], a2: [118, 36, 136, 38], l: [96, 96, 94, 120], l2: [104, 96, 106, 120] },
    e: { n: [100, 34], h: [100, 72], a: [86, 21, 74, 9], a2: [114, 21, 126, 9], l: [96, 96, 94, 120], l2: [104, 96, 106, 120] },
    steps: ['Arme seitlich auf Schulterhöhe ausstrecken.', 'Mit kleinen Kreisen beginnen und sie langsam größer werden lassen.', 'Nach der Hälfte der Zeit die Richtung wechseln.'],
    err: ['Schultern zu den Ohren ziehen: Schultern bewusst tief halten.'], easy: 'Kleinere Kreise.', hard: 'Große, langsame Kreise.', breath: 'Locker weiteratmen.' },
  stepjack: { name: 'Step-Jack', cat: 'warm', mus: 'Ganzkörper, Kreislauf', front: true,
    s: { n: [100, 34], h: [100, 72], a: [92, 50, 88, 68], a2: [108, 50, 112, 68], l: [96, 96, 95, 120], l2: [104, 96, 105, 120] },
    e: { n: [100, 34], h: [100, 72], a: [86, 22, 80, 6], a2: [114, 22, 120, 6], l: [96, 96, 95, 120], l2: [112, 95, 122, 119] },
    steps: ['Aufrecht stehen, Arme hängen locker.', 'Ein Bein zur Seite tippen und gleichzeitig die Arme über den Kopf führen.', 'Zurück zur Mitte, dann die andere Seite.'],
    err: ['Zu hektisch werden: Rhythmus vor Tempo.'], easy: 'Arme nur bis Schulterhöhe.', hard: 'Klassischer Hampelmann mit Sprung.', breath: 'Gleichmäßig atmen.', tip: 'Ohne Springen: schont Gelenke und Nachbarn.' },
  hinge: { name: 'Hüftbeuge (Hip Hinge)', cat: 'warm', mus: 'Hintere Oberschenkel, Gesäß, unterer Rücken',
    s: STAND, e: { n: [124, 61], h: [88, 74], a: [124, 79, 124, 97], l: [98, 97, 100, 120] },
    steps: ['Füße hüftbreit, Knie leicht gebeugt.', 'Gesäß nach hinten schieben und den Oberkörper mit geradem Rücken nach vorn neigen.', 'Wenn du eine Dehnung hinten in den Oberschenkeln spürst: Hüfte nach vorn schieben und aufrichten.'],
    err: ['Rundrücken: Stell dir einen Stab entlang der Wirbelsäule vor.', 'Die Bewegung kommt aus der Hüfte, nicht aus dem Rücken.'], easy: 'Weniger weit nach vorn.', hard: 'Auf einem Bein (Standwaage).', breath: 'Beim Vorbeugen einatmen, beim Aufrichten ausatmen.' },
  squat: { name: 'Kniebeuge', cat: 'kraft', mus: 'Oberschenkel, Gesäß, Rumpf',
    s: { n: [100, 34], h: [100, 72], a: [118, 34, 136, 34], l: [100, 96, 100, 120] },
    e: { n: [108, 65], h: [86, 96], a: [126, 65, 144, 65], l: [108, 97, 100, 120] },
    steps: ['Füße etwa schulterbreit, Zehen leicht nach außen.', 'Arme für die Balance nach vorn strecken.', 'Gesäß nach hinten-unten senken, als würdest du dich auf einen Stuhl setzen.', 'So tief gehen, wie es mit geradem Rücken klappt (Ziel: Oberschenkel parallel zum Boden).', 'Über die ganze Fußsohle wieder hochdrücken.'],
    err: ['Knie fallen nach innen: Knie zeigen in Richtung Zehen.', 'Fersen heben ab: Gewicht auf die ganze Fußsohle.', 'Rundrücken: Brust bleibt offen.'], easy: 'Auf einen Stuhl setzen und wieder aufstehen.', hard: '3 Sekunden absenken, unten 2 Sekunden halten.', breath: 'Beim Absenken einatmen, beim Hochdrücken ausatmen.' },
  wallsit: { name: 'Wandsitzen', cat: 'kraft', mus: 'Oberschenkel, Gesäß', still: true, prop: { t: 'wall', x: 60 },
    s: { n: [74, 58], h: [74, 96], a: [84, 74, 96, 84], l: [98, 96, 98, 120] },
    e: { n: [74, 57], h: [74, 96], a: [84, 73, 96, 83], l: [98, 96, 98, 120] },
    steps: ['Rücken flach an eine Wand lehnen.', 'Füße etwa 50 cm vor die Wand stellen, hüftbreit.', 'An der Wand nach unten rutschen, bis die Knie etwa 90° gebeugt sind.', 'Position halten und ruhig weiteratmen.'],
    err: ['Knie weiter vorn als die Fußspitzen: Füße weiter von der Wand weg.', 'Luft anhalten.'], easy: 'Weniger tief (Knie ca. 120°).', hard: 'Tiefer gehen oder eine Ferse leicht anheben.', breath: 'Gleichmäßig atmen, nicht pressen.' },
  lunge: { name: 'Ausfallschritt rückwärts', cat: 'kraft', mus: 'Oberschenkel, Gesäß, Balance', sides: true,
    s: { n: [110, 34], h: [110, 72], a: [118, 50, 112, 68], l: [110, 96, 110, 120] },
    e: { n: [88, 58], h: [88, 96], a: [96, 74, 90, 92], l: [110, 96, 110, 120], l2: [80, 116, 60, 119] },
    steps: ['Aufrecht stehen, Hände an die Hüfte.', 'Mit einem Bein einen großen Schritt nach hinten machen.', 'Hinteres Knie Richtung Boden senken, das vordere Knie bleibt über dem Fußgelenk.', 'Über die vordere Ferse zurück in den Stand drücken. Seiten abwechseln.'],
    err: ['Vorderes Knie knickt nach innen.', 'Oberkörper kippt nach vorn.'], easy: 'Kleinere Schritte, an einer Stuhllehne festhalten.', hard: 'Langsam absenken und unten 1 Sekunde halten.', breath: 'Runter einatmen, hoch ausatmen.' },
  inclinepush: { name: 'Erhöhte Liegestütze', cat: 'kraft', mus: 'Brust, Schultern, Trizeps, Rumpf', prop: { t: 'bench', x: 125, y: 88, w: 46 },
    s: { n: [128, 56], h: [102, 84], a: [131, 72, 135, 88], l: [86, 102, 70, 120] },
    e: { n: [138, 68], h: [108, 91], a: [122, 76, 135, 88], l: [89, 105, 70, 120] },
    steps: ['Hände schulterbreit auf eine stabile Erhöhung legen (Sofalehne, Tisch, Fensterbank).', 'Mit den Füßen zurückgehen, bis der Körper eine gerade Linie von Kopf bis Ferse bildet.', 'Brust kontrolliert zur Kante senken, Ellbogen etwa 45° vom Körper.', 'Kräftig wieder hochdrücken.'],
    err: ['Hüfte hängt durch: Bauch und Gesäß anspannen.', 'Ellbogen weit zur Seite abgespreizt.'], easy: 'Höhere Fläche oder an der Wand.', hard: 'Niedrigere Fläche wählen.', breath: 'Runter einatmen, hoch ausatmen.', tip: 'Die Erhöhung darf nicht wegrutschen.' },
  kneepush: { name: 'Knie-Liegestütze', cat: 'kraft', mus: 'Brust, Schultern, Trizeps, Rumpf',
    s: { n: [126, 84], h: [91, 105], a: [127, 102, 128, 120], l: [70, 118, 52, 104] },
    e: { n: [130, 104], h: [93, 112], a: [113, 110, 128, 120], l: [70, 118, 52, 104] },
    steps: ['Kniestand, Hände etwas breiter als schulterbreit unter den Schultern.', 'Füße anheben, Knie–Hüfte–Kopf bilden eine gerade Linie.', 'Brust kontrolliert Richtung Boden senken.', 'Wieder hochdrücken.'],
    err: ['Gesäß ragt nach oben.', 'Kopf hängt nach unten: Blick leicht vor die Hände.'], easy: 'Erhöhte Liegestütze.', hard: 'Klassische Liegestütze.', breath: 'Runter einatmen, hoch ausatmen.', tip: 'Ein gefaltetes Handtuch unter die Knie legen.' },
  pushup: { name: 'Liegestütze', cat: 'kraft', mus: 'Brust, Schultern, Trizeps, Rumpf',
    s: { n: [128, 84], h: [92, 99], a: [129, 102, 130, 120], l: [70, 109, 48, 118] },
    e: { n: [132, 106], h: [95, 111], a: [115, 111, 130, 120], l: [72, 115, 48, 118] },
    steps: ['Hohe Stützposition: Hände unter den Schultern, Füße hüftbreit.', 'Bauch und Gesäß anspannen, der Körper ist ein Brett.', 'Als Ganzes absenken, bis die Brust knapp über dem Boden ist.', 'Hochdrücken.'],
    err: ['Hüfte hängt durch.', 'Nur den Kopf zum Boden bewegen.'], easy: 'Auf die Knie wechseln, sobald die Form nachlässt.', hard: '3 Sekunden absenken.', breath: 'Runter einatmen, hoch ausatmen.' },
  plank: { name: 'Unterarmstütz (Plank)', cat: 'core', mus: 'Bauch, Rumpf, Schultern', still: true,
    s: { n: [120, 102], h: [87, 109], a: [120, 120, 138, 120], l: [63, 113, 40, 118] },
    e: { n: [120, 101], h: [87, 107.5], a: [120, 120, 138, 120], l: [63, 112.5, 40, 118] },
    steps: ['Unterarme auf den Boden, Ellbogen unter den Schultern.', 'Beine strecken, auf die Zehenspitzen gehen.', 'Der Körper bildet eine gerade Linie: Bauchnabel leicht einziehen, Gesäß anspannen.', 'Halten und ruhig atmen.'],
    err: ['Hüfte zu hoch oder durchhängend.', 'Kopf in den Nacken legen.'], easy: 'Knie am Boden lassen.', hard: 'Länger halten oder Schulter-Taps.', breath: 'Weiteratmen, nicht pressen.' },
  shouldertap: { name: 'Schulter-Taps', cat: 'core', mus: 'Rumpf, Schultern, Stabilität', sides: true,
    s: { n: [128, 84], h: [92, 99], a: [129, 102, 130, 120], l: [70, 109, 48, 118] },
    e: { n: [128, 84], h: [92, 99], a: [138, 96, 126, 86], a2: [129, 102, 130, 120], l: [70, 109, 48, 118] },
    steps: ['Hohe Stützposition, Füße etwas breiter für mehr Stabilität.', 'Eine Hand löst sich und tippt die gegenüberliegende Schulter.', 'Zurückstellen, Seite wechseln.', 'Die Hüfte bleibt möglichst ruhig.'],
    err: ['Hüfte schaukelt hin und her.'], easy: 'Auf den Knien.', hard: 'Füße enger zusammen.', breath: 'Gleichmäßig atmen.' },
  bridge: { name: 'Beckenheben (Glute Bridge)', cat: 'kraft', mus: 'Gesäß, hintere Oberschenkel, unterer Rücken',
    s: { n: [50, 114], h: [88, 116], a: [68, 118, 86, 118], l: [104, 96, 110, 120] },
    e: { n: [50, 114], h: [86, 98], a: [68, 118, 86, 118], l: [108, 96, 110, 120] },
    steps: ['Rückenlage, Knie gebeugt, Füße hüftbreit flach am Boden.', 'Arme liegen neben dem Körper.', 'Gesäß anspannen und das Becken anheben, bis Knie, Hüfte und Schultern eine Linie bilden.', 'Oben 1–2 Sekunden halten, langsam absenken.'],
    err: ['Ins Hohlkreuz drücken: Die Kraft kommt aus dem Gesäß.', 'Füße zu weit weg vom Körper.'], easy: 'Weniger hoch anheben.', hard: 'Einbeinig ausführen.', breath: 'Hoch ausatmen, runter einatmen.' },
  bridge1: { name: 'Einbeiniges Beckenheben', cat: 'kraft', mus: 'Gesäß, hintere Oberschenkel, Rumpf', sides: true,
    s: { n: [50, 114], h: [88, 116], a: [68, 118, 86, 118], l: [110, 108, 132, 100], l2: [104, 96, 110, 120] },
    e: { n: [50, 114], h: [86, 98], a: [68, 118, 86, 118], l: [109, 92, 132, 86], l2: [108, 96, 110, 120] },
    steps: ['Ausgangsposition wie beim Beckenheben.', 'Ein Bein gestreckt anheben, Oberschenkel bleiben parallel.', 'Über die Ferse des Standbeins das Becken anheben.', 'Nach der Hälfte der Zeit die Seite wechseln.'],
    err: ['Becken kippt zur Seite: Hüfte bleibt waagerecht.'], easy: 'Beidbeinig.', hard: 'Oben 3 Sekunden halten.', breath: 'Hoch ausatmen, runter einatmen.' },
  superman: { name: 'Superman', cat: 'kraft', mus: 'Rückenstrecker, Gesäß, Schultern',
    s: { n: [120, 114], h: [82, 116], a: [138, 114, 156, 114], l: [58, 117, 34, 118] },
    e: { n: [119, 108], h: [82, 116], a: [136, 104, 153, 98], l: [59, 113, 36, 108] },
    steps: ['Bauchlage, Arme nach vorn gestreckt, die Stirn zeigt zum Boden.', 'Arme, Brust und Beine gleichzeitig wenige Zentimeter anheben.', '2 Sekunden halten, langsam ablegen.'],
    err: ['Kopf in den Nacken: Blick bleibt zum Boden.', 'Zu hoch reißen: Wenige Zentimeter reichen.'], easy: 'Abwechselnd nur Arme oder nur Beine anheben.', hard: 'Oben 4 Sekunden halten.', breath: 'Beim Anheben ausatmen.' },
  yraise: { name: 'Y-Heben in Bauchlage', cat: 'kraft', mus: 'Oberer Rücken, hintere Schulter, Haltung',
    s: { n: [120, 114], h: [82, 116], a: [136, 117, 153, 118], l: [58, 117, 34, 118] },
    e: { n: [119, 110], h: [82, 116], a: [135, 104, 151, 98], l: [58, 117, 34, 118] },
    steps: ['Bauchlage, Arme in Y-Form schräg nach vorn, Daumen zeigen nach oben.', 'Schulterblätter nach hinten-unten ziehen und die Arme anheben.', 'Kurz halten, langsam ablegen. Die Beine bleiben am Boden.'],
    err: ['Schultern zu den Ohren ziehen.', 'Schwung holen.'], easy: 'Arme in T-Form seitlich anheben.', hard: 'Im Wechsel Y, T und W, jeweils 2 Sekunden halten.', breath: 'Beim Anheben ausatmen.', tip: 'Gut gegen Schreibtisch-Haltung.' },
  birddog: { name: 'Vierfüßlerstand (Bird Dog)', cat: 'core', mus: 'Tiefe Rumpfmuskulatur, Rücken, Gesäß', sides: true,
    s: { n: [124, 84], h: [86, 96], a: [124, 102, 124, 120], l: [86, 120, 62, 120] },
    e: { n: [124, 84], h: [86, 96], a: [124, 102, 124, 120], a2: [141, 80, 159, 77], l: [63, 92, 39, 89], l2: [86, 120, 62, 120] },
    steps: ['Hände unter den Schultern, Knie unter der Hüfte.', 'Rücken gerade, Bauch leicht anspannen.', 'Einen Arm nach vorn und das gegenüberliegende Bein nach hinten strecken.', '2 Sekunden halten, zurück, Seite wechseln.'],
    err: ['Becken kippt zur Seite.', 'Bein höher als die Hüfte: Das führt ins Hohlkreuz.'], easy: 'Nur das Bein oder nur den Arm strecken.', hard: 'Zwischen den Wiederholungen Ellbogen und Knie unter dem Bauch zusammenführen.', breath: 'Beim Strecken ausatmen.' },
  climber: { name: 'Bergsteiger (langsam)', cat: 'core', mus: 'Rumpf, Hüftbeuger, Schultern, Kreislauf', sides: true,
    s: { n: [128, 84], h: [92, 99], a: [129, 102, 130, 120], l: [70, 109, 48, 118] },
    e: { n: [128, 84], h: [94, 97], a: [129, 102, 130, 120], l: [112, 105, 100, 118], l2: [71, 108, 48, 118] },
    steps: ['Hohe Stützposition, Hände unter den Schultern.', 'Ein Knie Richtung Brust ziehen und wieder zurückstellen.', 'Abwechselnd weiter, die Hüfte bleibt tief.', 'Kontrolliertes Tempo, nicht hektisch.'],
    err: ['Gesäß schiebt sich nach oben.'], easy: 'Hände auf eine Erhöhung (Sofa).', hard: 'Tempo erhöhen.', breath: 'Gleichmäßig weiteratmen.' },
  sideplank: { name: 'Seitstütz', cat: 'core', mus: 'Seitliche Bauchmuskeln, Hüfte, Schulter', sides: true, front: true,
    s: { n: [118, 100], h: [82, 116], a: [118, 118, 126, 120], a2: [106, 106, 92, 112], l: [59, 117, 36, 118] },
    e: { n: [118, 100], h: [80, 104], a: [118, 118, 126, 120], a2: [118, 82, 118, 64], l: [58, 111, 36, 118] },
    steps: ['Seitlage, der Ellbogen liegt unter der Schulter.', 'Beine gestreckt übereinander, oder die Knie gebeugt für die leichtere Version.', 'Becken anheben, bis der Körper eine Linie bildet, oberen Arm zur Decke strecken.', 'Halten, nach der Hälfte der Zeit die Seite wechseln.'],
    err: ['Becken sackt ab.', 'Schulter rutscht zum Ohr.'], easy: 'Knie bleiben am Boden.', hard: 'Oberes Bein leicht anheben.', breath: 'Ruhig weiteratmen.' },
  deadbug: { name: 'Dead Bug', cat: 'core', mus: 'Tiefe Bauchmuskulatur, rückenschonend', sides: true,
    s: { n: [60, 114], h: [98, 116], a: [60, 96, 60, 78], l: [98, 92, 120, 92] },
    e: { n: [60, 114], h: [98, 116], a: [60, 96, 60, 78], a2: [44, 108, 27, 104], l: [120, 110, 143, 113], l2: [98, 92, 120, 92] },
    steps: ['Rückenlage, Arme zur Decke, Beine im 90°-Winkel angehoben (Tischposition).', 'Den unteren Rücken sanft in den Boden drücken.', 'Gegengleich einen Arm nach hinten und das andere Bein nach vorn strecken.', 'Zurück zur Mitte, Seite wechseln.'],
    err: ['Rücken hebt vom Boden ab: Die Bewegung kleiner machen.'], easy: 'Nur die Beine bewegen, Ferse zum Boden tippen.', hard: 'Langsamer, Bein näher am Boden.', breath: 'Beim Strecken lang ausatmen.' },
  dips: { name: 'Trizeps-Dips am Stuhl', cat: 'kraft', mus: 'Trizeps, Schultern, Brust', prop: { t: 'bench', x: 56, y: 92, w: 44 },
    s: { n: [97, 56], h: [100, 94], a: [96, 74, 96, 92], l: [124, 96, 126, 120] },
    e: { n: [99, 72], h: [101, 110], a: [83, 80, 96, 92], l: [124, 99, 126, 120] },
    steps: ['Stabilen Stuhl ohne Rollen gegen die Wand stellen, oder die Sofakante nutzen.', 'Hände schulterbreit an die Kante, die Finger zeigen nach vorn.', 'Füße vor dir, Knie gebeugt.', 'Ellbogen nach hinten beugen und den Körper senken, bis die Oberarme etwa parallel zum Boden sind.', 'Wieder hochdrücken.'],
    err: ['Schultern zu den Ohren ziehen.', 'Zu tief gehen: Nur bis etwa 90° im Ellbogen.'], easy: 'Füße näher heran, kleinere Bewegung.', hard: 'Beine strecken.', breath: 'Runter einatmen, hoch ausatmen.', tip: 'Bei Schulterschmerzen: Übung durch eine weitere Runde Liegestütze ersetzen.' },
  calf: { name: 'Wadenheben', cat: 'kraft', mus: 'Waden, Fußgelenke',
    s: { ...STAND, t: [107, 120] }, e: { n: [100, 28], h: [100, 66], a: [100, 46, 100, 64], l: [100, 90, 100, 114], t: [106, 120] },
    steps: ['Aufrecht stehen, Füße hüftbreit, gern mit einer Hand an der Wand.', 'Auf die Zehenspitzen drücken.', 'Oben 1 Sekunde halten, langsam absenken.'],
    err: ['Zu schnell wippen.'], easy: 'Mit beiden Händen an der Wand.', hard: 'Auf einer Treppenstufe oder einbeinig.', breath: 'Gleichmäßig atmen.' },
  quad: { name: 'Oberschenkel-Dehnung', cat: 'dehnen', mus: 'Vordere Oberschenkel', sides: true, still: true,
    s: { n: [100, 34], h: [100, 72], a: [96, 52, 92, 74], a2: [110, 48, 124, 42], l: [100, 96, 92, 74], l2: [100, 96, 100, 120] },
    e: { n: [100, 33.5], h: [100, 72], a: [96, 52, 92, 74], a2: [110, 47, 124, 41], l: [100, 96, 92, 74], l2: [100, 96, 100, 120] },
    steps: ['Aufrecht stehen, mit einer Hand an der Wand festhalten.', 'Ein Fußgelenk greifen und die Ferse Richtung Gesäß ziehen.', 'Knie zeigen nach unten, Becken leicht nach vorn schieben.', 'Nach der Hälfte der Zeit die Seite wechseln.'],
    err: ['Ins Hohlkreuz fallen.'], easy: 'Ein Handtuch um den Fuß legen.', hard: '–', breath: 'Lang ausatmen und loslassen.' },
  hipflexor: { name: 'Hüftbeuger-Dehnung', cat: 'dehnen', mus: 'Hüftbeuger, vordere Hüfte', sides: true, still: true,
    s: { n: [98, 60], h: [98, 98], a: [106, 76, 118, 92], l: [120, 96, 120, 120], l2: [82, 118, 58, 120] },
    e: { n: [102, 59], h: [102, 99], a: [109, 75, 120, 92], l: [120, 96, 120, 120], l2: [84, 118, 58, 120] },
    steps: ['Kniender Ausfallschritt, das hintere Knie auf einer weichen Unterlage.', 'Oberkörper aufrecht, Hände auf dem vorderen Knie.', 'Becken nach vorn schieben, bis du vorne an der Hüfte eine Dehnung spürst.', 'Nach der Hälfte der Zeit die Seite wechseln.'],
    err: ['Vorderes Knie schiebt weit über die Zehen.'], easy: 'Weniger weit nach vorn schieben.', hard: 'Arm auf der Seite des hinteren Beins nach oben strecken.', breath: 'Ruhig und tief atmen.', tip: 'Besonders wichtig, wenn du viel sitzt.' },
  child: { name: 'Kindhaltung', cat: 'dehnen', mus: 'Rücken, Schultern, Hüfte', still: true,
    s: { n: [124, 112], h: [88, 110], a: [142, 116, 160, 119], l: [110, 120, 86, 120] },
    e: { n: [124, 113], h: [87, 111], a: [142, 117, 160, 119], l: [110, 120, 86, 120] },
    steps: ['Kniestand, Gesäß zu den Fersen setzen.', 'Oberkörper nach vorn auf die Oberschenkel legen.', 'Arme lang nach vorn ablegen, Stirn auf den Boden.', 'Tief in den Rücken atmen.'],
    err: ['Schultern hochziehen.'], easy: 'Ein Kissen zwischen Gesäß und Fersen.', hard: '–', breath: 'Langsam: 4 Sekunden ein, 6 Sekunden aus.' },
  breathe: { name: 'Bauchatmung', cat: 'dehnen', mus: 'Entspannung, Zwerchfell', still: true,
    s: { n: [50, 114], h: [88, 116], a: [64, 108, 80, 110], a2: [68, 118, 86, 118], l: [104, 96, 110, 120] },
    e: { n: [50, 114], h: [88, 115], a: [64, 106, 80, 107], a2: [68, 118, 86, 118], l: [104, 96, 110, 120] },
    steps: ['Rückenlage, Knie angewinkelt, eine Hand auf dem Bauch.', '4 Sekunden durch die Nase einatmen, der Bauch hebt sich.', '6 Sekunden ausatmen.', 'Puls und Atmung kommen zur Ruhe.'],
    err: [], easy: '–', hard: '–', breath: '4 Sekunden ein, 6 Sekunden aus.' },
};
const CATS = { warm: 'Aufwärmen', kraft: 'Kraft', core: 'Körpermitte', dehnen: 'Dehnen' };

function normPose(p) {
  const a = p.a, a2 = p.a2 || p.a, l = p.l, l2 = p.l2 || p.l;
  const t = p.t || [l[2], l[3]], t2 = p.t2 || p.t || [l2[2], l2[3]];
  return [...p.n, ...p.h, ...a, ...a2, ...l, ...l2, ...t, ...t2];
}
for (const id in EX) { EX[id].id = id; EX[id].P0 = normPose(EX[id].s); EX[id].P1 = normPose(EX[id].e || EX[id].s); }

// ---------- Trainingsplan ----------
const PHASES = [
  { name: 'Fundament', wk: 'Einheit 1–14', work: 30, rest: 30, text: 'Technik lernen, Gelenke und Sehnen an die Belastung gewöhnen. Lieber sauber als viel.' },
  { name: 'Aufbau', wk: 'Einheit 15–28', work: 40, rest: 20, text: 'Längere Arbeitsphasen, kürzere Pausen. Die Liegestütze gehen auf den Boden.' },
  { name: 'Kraft', wk: 'ab Einheit 29', work: 45, rest: 15, text: 'Schwerere Varianten und langsameres Tempo. Hier wird es sichtbar.' },
];
const WORKOUTS = {
  A: { name: 'Ganzkörper', slots: [
    { ex: 'squat', note: ['Kontrolliert, ca. 10–12 Wdh.', '3 Sekunden absenken', 'Unten 2 Sekunden halten'] },
    { ex: ['inclinepush', 'kneepush', 'pushup'], note: ['Hände auf Sofa oder Tisch', '', 'Wenn die Form nachlässt: auf die Knie'] },
    { ex: 'bridge', note: ['Oben kurz halten', 'Oben 2 Sekunden halten', 'Oben 3 Sekunden halten'] },
    { ex: 'superman', note: ['', '', ''] },
    { ex: ['plank', 'plank', 'shouldertap'], note: ['Gern auf den Knien', 'Auf den Zehen', ''] },
    { ex: 'climber', note: ['Langsam', 'Zügig, aber sauber', 'Zügig, aber sauber'] },
  ] },
  B: { name: 'Beine & Körpermitte', slots: [
    { ex: 'lunge', note: ['Seiten abwechseln, gern festhalten', 'Seiten abwechseln', 'Unten 1 Sekunde Pause'] },
    { ex: 'wallsit', note: ['Knie ca. 120°', 'Knie ca. 90°', 'Knie 90°, ganz ruhig'] },
    { ex: ['bridge', 'bridge1', 'bridge1'], note: ['', 'Halbe Zeit je Seite', 'Halbe Zeit je Seite'] },
    { ex: 'deadbug', note: ['Rücken bleibt am Boden', '', 'Sehr langsam'] },
    { ex: 'sideplank', note: ['Knie am Boden, halbe Zeit je Seite', 'Halbe Zeit je Seite', 'Beine gestreckt, halbe Zeit je Seite'] },
    { ex: 'calf', note: ['', 'Oben 1 Sekunde halten', 'Auf einer Stufe'] },
  ] },
  C: { name: 'Oberkörper & Rücken', slots: [
    { ex: ['inclinepush', 'kneepush', 'pushup'], note: ['', '', '3 Sekunden absenken'] },
    { ex: 'dips', note: ['Kleine Bewegung, Knie gebeugt', '', 'Beine gestreckter'] },
    { ex: 'yraise', note: ['', 'Oben 2 Sekunden halten', 'Wechsel Y, T, W'] },
    { ex: 'birddog', note: ['Seiten abwechseln', 'Je 2 Sekunden halten', 'Je 3 Sekunden halten'] },
    { ex: 'squat', note: ['', '3 Sekunden absenken', 'Unten 2 Sekunden halten'] },
    { ex: 'plank', note: ['Gern auf den Knien', '', 'So ruhig wie möglich'] },
  ] },
};
const ROT = ['A', 'B', 'C'];
const WARM = [['marsch', 60], ['armkreisen', 40], ['stepjack', 45], ['hinge', 40], ['squat', 40], ['birddog', 40]];
const COOL = [['quad', 60], ['hipflexor', 60], ['child', 60], ['breathe', 60]];
const slotEx = (sl, ph) => Array.isArray(sl.ex) ? sl.ex[ph] : sl.ex;
const slotNote = (sl, ph) => sl.note ? sl.note[ph] : '';

function buildSteps(w, phase, rounds) {
  const W = WORKOUTS[w], P = PHASES[phase], steps = [];
  steps.push({ k: 'prep', ex: WARM[0][0], dur: 8, label: 'Gleich geht’s los' });
  WARM.forEach(([id, d]) => steps.push({ k: 'warm', ex: id, dur: d, label: 'Aufwärmen' }));
  for (let r = 1; r <= rounds; r++) {
    W.slots.forEach((sl, i) => {
      steps.push({ k: 'work', ex: slotEx(sl, phase), dur: P.work, label: `Runde ${r} von ${rounds}`, note: slotNote(sl, phase) });
      if (i < W.slots.length - 1) steps.push({ k: 'rest', ex: slotEx(W.slots[i + 1], phase), dur: P.rest, label: 'Pause' });
      else if (r < rounds) steps.push({ k: 'rest', ex: slotEx(W.slots[0], phase), dur: 60, label: 'Rundenpause: kurz trinken' });
    });
  }
  COOL.forEach(([id, d]) => steps.push({ k: 'cool', ex: id, dur: d, label: 'Abkühlen & Dehnen' }));
  return steps;
}
const stepsMin = st => Math.round(st.reduce((s, x) => s + x.dur, 0) / 60);

// ---------- Lebensmittel (Richtwerte pro Portion) ----------
const FOODS = [
  ['Haferflocken 50 g', 185, 7], ['Magerquark 250 g', 170, 30], ['Skyr 150 g', 95, 16], ['Ei (M)', 80, 7],
  ['Vollkornbrot 1 Scheibe', 110, 4], ['Banane', 105, 1], ['Apfel', 75, 0], ['Beeren 125 g', 50, 1],
  ['Hähnchenbrust 150 g', 165, 35], ['Lachs 125 g', 255, 25], ['Tofu 150 g', 180, 20], ['Linsen gekocht 200 g', 230, 18],
  ['Reis gekocht 150 g', 195, 4], ['Kartoffeln 250 g', 180, 5], ['Vollkornnudeln gekocht 200 g', 300, 11], ['Gemüse 200 g', 60, 3],
  ['Salat mit Dressing', 120, 2], ['Nüsse 30 g', 185, 6], ['Olivenöl 1 EL', 90, 0], ['Milch 1,5 % 250 ml', 120, 8],
  ['Käse 30 g', 110, 8], ['Hüttenkäse 200 g', 190, 25], ['Proteinshake (30 g, Wasser)', 115, 24], ['Kaffee mit Milch', 35, 2],
];
const MEALS = ['Frühstück', 'Mittag', 'Abend', 'Snacks'];
const MEASURES = [['chest', 'Brust'], ['waist', 'Taille'], ['hips', 'Hüfte'], ['arm', 'Oberarm'], ['thigh', 'Oberschenkel']];
const POSES = [['vorne', 'Vorne'], ['seite', 'Seite'], ['hinten', 'Hinten']];

// ---------- Speicher (IndexedDB, nur lokal) ----------
const DEF = { profile: {}, workouts: { list: [] }, weights: { list: [] }, measures: { list: [] }, foods: { list: [] } };
const KEY_RE = /^(profile|workouts|weights|measures|foods|food-\d{4}-\d{2}-\d{2})$/;
let idb = null;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('hausstark', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function reqP(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }
function txDone(t) { return new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); }
const Store = {
  cache: {}, ok: false,
  async init() {
    try {
      idb = await openDB();
      const t = idb.transaction('kv', 'readonly'), s = t.objectStore('kv');
      const [keys, vals] = await Promise.all([reqP(s.getAllKeys()), reqP(s.getAll())]);
      keys.forEach((k, i) => { this.cache[k] = vals[i]; });
      this.ok = true;
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
    } catch (e) {
      this.ok = false;
      toast('Speicher nicht verfügbar. Einträge gehen beim Schließen verloren.');
    }
  },
  get(k, def) { if (!(k in this.cache)) this.cache[k] = JSON.parse(JSON.stringify(def)); return this.cache[k]; },
  save(k) {
    if (!this.ok) return;
    const t = idb.transaction('kv', 'readwrite');
    t.objectStore('kv').put(this.cache[k], k);
    txDone(t).catch(() => toast('Speichern hat nicht geklappt.'));
  },
  async clearAll() {
    this.cache = {};
    if (!this.ok) return;
    const t = idb.transaction(['kv', 'photos'], 'readwrite');
    t.objectStore('kv').clear(); t.objectStore('photos').clear();
    await txDone(t);
  },
};
const S = k => Store.get(k, DEF[k] || { entries: [], water: 0 });
const foodDay = d => Store.get('food-' + d, { entries: [], water: 0 });

const Photos = {
  list: [], urls: new Map(),
  async load() {
    if (!Store.ok) return;
    const t = idb.transaction('photos', 'readonly');
    this.list = (await reqP(t.objectStore('photos').getAll())).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  },
  url(p) { if (!this.urls.has(p.id)) this.urls.set(p.id, URL.createObjectURL(p.blob)); return this.urls.get(p.id); },
  async add(p) {
    const t = idb.transaction('photos', 'readwrite'); t.objectStore('photos').put(p); await txDone(t);
    this.list.push(p); this.list.sort((a, b) => a.date < b.date ? -1 : 1);
  },
  async remove(id) {
    const t = idb.transaction('photos', 'readwrite'); t.objectStore('photos').delete(id); await txDone(t);
    this.list = this.list.filter(p => p.id !== id);
    if (this.urls.has(id)) { URL.revokeObjectURL(this.urls.get(id)); this.urls.delete(id); }
  },
  reset() { this.urls.forEach(u => URL.revokeObjectURL(u)); this.urls.clear(); this.list = []; },
};

// ---------- Berechnungen ----------
function weightsSorted() { return [...S('weights').list].sort((a, b) => a.date < b.date ? -1 : 1); }
function currentWeight() { const w = weightsSorted(); return w.length ? w[w.length - 1].v : pf(S('profile').weight); }
function profileComplete() { const p = S('profile'); return !!(p.sex && pf(p.age) && pf(p.height) && currentWeight()); }
function targets() {
  const p = S('profile'); const w = currentWeight(), h = pf(p.height), a = pf(p.age);
  if (!p.sex || !w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'm' ? 5 : -161);
  const act = pf(p.activity) || 1.4;
  const tdee = bmr * act;
  const goal = pf(p.goalWeight);
  const lose = goal != null && goal < w - 0.5;
  let kcal = lose ? tdee - 350 : tdee;
  kcal = Math.max(kcal, p.sex === 'm' ? 1600 : 1300, bmr * 1.05);
  kcal = Math.round(kcal / 10) * 10;
  const bmi = w / ((h / 100) ** 2);
  const base = bmi > 30 && goal ? Math.max(goal, w * 0.85) : w;
  const protein = Math.round(base * 1.8);
  const fat = Math.round(kcal * 0.28 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee / 10) * 10, kcal, protein, fat, carbs, lose, bmi, water: Math.round(w * 0.035 * 4) / 4 };
}
function program() {
  const list = [...S('workouts').list].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const n = list.length, phase = n < 14 ? 0 : n < 28 ? 1 : 2;
  const last = list[n - 1];
  const next = last && ROT.includes(last.w) ? ROT[(ROT.indexOf(last.w) + 1) % 3] : 'A';
  const rounds = phase === 0 && n < 6 ? 2 : 3;
  const td = today();
  let status = 'train', nextDate = td;
  if (last) {
    const d = dayDiff(last.date, td);
    if (d <= 0) { status = 'done'; nextDate = addDays(last.date, 2); }
    else if (d === 1) { status = 'rest'; nextDate = addDays(td, 1); }
  }
  return { list, n, phase, last, next, rounds, status, nextDate };
}

// ---------- Strichfiguren ----------
function shapes(P) {
  const r = v => Math.round(v * 10) / 10;
  const pt = (x, y) => `${r(x)},${r(y)}`;
  const dx = P[0] - P[2], dy = P[1] - P[3], L = Math.hypot(dx, dy) || 1;
  return {
    armB: `${pt(P[0], P[1])} ${pt(P[8], P[9])} ${pt(P[10], P[11])}`,
    legB: `${pt(P[2], P[3])} ${pt(P[16], P[17])} ${pt(P[18], P[19])} ${pt(P[22], P[23])}`,
    torso: `${pt(P[0], P[1])} ${pt(P[2], P[3])}`,
    legF: `${pt(P[2], P[3])} ${pt(P[12], P[13])} ${pt(P[14], P[15])} ${pt(P[20], P[21])}`,
    armF: `${pt(P[0], P[1])} ${pt(P[4], P[5])} ${pt(P[6], P[7])}`,
    hx: r(P[0] + dx / L * 12), hy: r(P[1] + dy / L * 12),
  };
}
function propSVG(p) {
  if (!p) return '';
  if (p.t === 'wall') return `<rect class="prop" x="${p.x}" y="8" width="6" height="115"/>`;
  if (p.t === 'bench') return `<rect class="prop" x="${p.x}" y="${p.y}" width="${p.w}" height="${123 - p.y}" rx="3"/>`;
  return '';
}
function figSVG(id, mode = 'anim') {
  const ex = EX[id]; if (!ex) return '';
  const s = shapes(mode === 'end' ? ex.P1 : ex.P0);
  const bc = ex.front ? 'f' : 'b';
  return `<svg class="fig" viewBox="0 0 200 130" ${mode === 'anim' ? `data-anim="${id}"` : ''} role="img" aria-label="${esc(ex.name)}">${propSVG(ex.prop)}<line class="g" x1="6" y1="123.5" x2="194" y2="123.5"/><polyline class="${bc}" data-k="armB" points="${s.armB}"/><polyline class="${bc}" data-k="legB" points="${s.legB}"/><polyline class="f" data-k="torso" points="${s.torso}"/><polyline class="f" data-k="legF" points="${s.legF}"/><polyline class="f" data-k="armF" points="${s.armF}"/><circle class="hd" data-k="head" cx="${s.hx}" cy="${s.hy}" r="8.5"/></svg>`;
}
let figs = [];
function collectFigs() {
  figs = [...document.querySelectorAll('svg[data-anim]')].map(svg => {
    const els = {}; svg.querySelectorAll('[data-k]').forEach(e => { els[e.dataset.k] = e; });
    return { svg, ex: EX[svg.dataset.anim], els, off: Math.random() * 1000 };
  });
}
let lastFrame = 0;
function animate(ts) {
  if (ts - lastFrame > 33) {
    lastFrame = ts;
    for (const f of figs) {
      if (!f.svg.isConnected || !f.ex) continue;
      const per = f.ex.still ? 4200 : 2600;
      const p = ((ts + f.off) % per) / per;
      const tri = p < 0.5 ? p * 2 : 2 - p * 2;
      let t = clamp((tri - 0.12) / 0.76, 0, 1); t = t * t * (3 - 2 * t);
      const P = f.ex.P0.map((v, i) => v + (f.ex.P1[i] - v) * t);
      const s = shapes(P);
      f.els.armB.setAttribute('points', s.armB); f.els.legB.setAttribute('points', s.legB);
      f.els.torso.setAttribute('points', s.torso); f.els.legF.setAttribute('points', s.legF);
      f.els.armF.setAttribute('points', s.armF);
      f.els.head.setAttribute('cx', s.hx); f.els.head.setAttribute('cy', s.hy);
    }
  }
  requestAnimationFrame(animate);
}

// ---------- UI-Zustand ----------
const ui = { view: 'heute', planPhase: null, exFilter: 'alle', foodDate: today(), meal: 'Frühstück', nutriTab: 'tagebuch', pose: 'vorne', feel: null };
const VIEWS = ['heute', 'plan', 'uebungen', 'essen', 'fortschritt', 'profil'];

function bar(pct, cls = '') { return `<div class="bar ${cls}"><i data-w="${clamp(pct, 0, 100).toFixed(1)}"></i></div>`; }
function applyWidths(root) { root.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; }); }

// ---------- Ansicht: Heute ----------
function vHeute() {
  const p = S('profile'), pr = program(), t = targets(), td = today();
  const fd = foodDay(td); const kcal = fd.entries.reduce((s, e) => s + (e.kcal || 0), 0); const prot = fd.entries.reduce((s, e) => s + (e.p || 0), 0);
  const W = WORKOUTS[pr.next]; const steps = buildSteps(pr.next, pr.phase, pr.rounds);
  const hr = new Date().getHours(); const greet = hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend';
  const feelHint = (() => {
    const f = pr.list.slice(-2).map(x => x.feel);
    if (f.length === 2 && f.every(x => x === 'leicht')) return 'Die letzten Einheiten waren leicht. Nimm bei 1–2 Übungen die schwerere Variante aus der Beschreibung.';
    if (f.length === 2 && f.every(x => x === 'schwer')) return 'Die letzten Einheiten waren schwer. Nimm die leichteren Varianten. Pausen sind Teil des Plans.';
    return '';
  })();
  let card;
  const exChips = W.slots.map(sl => `<span class="pill">${esc(EX[slotEx(sl, pr.phase)].name)}</span>`).join(' ');
  if (pr.status === 'train') {
    card = `<section class="card feature">
      <p class="eyebrow">Heute ist Trainingstag · Einheit ${pr.n + 1}</p>
      <h2>Training ${pr.next}: ${esc(W.name)}</h2>
      <p class="muted">ca. ${stepsMin(steps)} Minuten · ${pr.rounds} Runden · ${PHASES[pr.phase].work} s Übung / ${PHASES[pr.phase].rest} s Pause</p>
      <div class="row">${exChips}</div>
      <div class="row"><button class="btn light" data-act="start">Training starten</button><button class="btn ghost" data-act="log">Ohne Timer eintragen</button></div>
    </section>`;
  } else if (pr.status === 'rest') {
    card = `<section class="card rest">
      <p class="eyebrow">Ruhetag</p>
      <h2>Heute erholen sich deine Muskeln</h2>
      <p>Die Muskeln wachsen in der Pause. Ideal: 20–30 Minuten spazieren gehen und genug schlafen. Morgen ist Training ${pr.next} (${esc(W.name)}) dran.</p>
      <div class="row"><button class="btn soft" data-act="start">Trotzdem trainieren</button></div>
    </section>`;
  } else {
    card = `<section class="card">
      <p class="eyebrow">Erledigt</p>
      <h2>Stark, heute ist geschafft.</h2>
      <p class="muted">Nächstes Training: ${fmtD(pr.nextDate, { weekday: 'long', day: 'numeric', month: 'long' })} · Training ${pr.next}</p>
    </section>`;
  }
  const done = new Set(pr.list.map(x => x.date));
  let strip = '';
  for (let i = -10; i <= 3; i++) {
    const d = addDays(td, i); const dt = parseYmd(d);
    const cls = [done.has(d) ? 'done' : '', i === 0 ? 'today' : '', !done.has(d) && i >= 0 && d === pr.nextDate ? 'plan' : ''].join(' ');
    strip += `<div class="${cls}" title="${fmtD(d)}"><b></b>${'SMDMDFS'[dt.getDay()]}</div>`;
  }
  const total = 42, pct = Math.min(100, pr.n / total * 100);
  const ws = weightsSorted(); const cw = currentWeight(); const first = ws[0];
  return `
  <section class="hero"><p class="eyebrow">${fmtD(td, { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${greet}${p.name ? ', ' + esc(p.name) : ''}</h1></section>
  ${!profileComplete() ? `<div class="banner"><span>Trag deine Daten ins Profil ein. Dann berechnet die App deinen Kalorien- und Eiweißbedarf.</span><a class="btn sm" href="#profil">Profil ausfüllen</a></div>` : ''}
  ${card}
  ${feelHint ? `<p class="note">${feelHint}</p>` : ''}
  <div class="grid2">
    <section class="card">
      <div class="row between"><h3>Rhythmus: jeden zweiten Tag</h3><span class="pill acc">${PHASES[pr.phase].name}</span></div>
      <div class="strip" aria-label="Trainingstage der letzten 10 Tage">${strip}</div>
      <p class="small muted">Gefüllt = trainiert · gestrichelt = nächstes Training</p>
      <div class="stack"><div class="row between small"><span>12-Wochen-Programm</span><span class="num">${Math.min(pr.n, total)} / ${total} Einheiten</span></div>${bar(pct)}</div>
    </section>
    <section class="card">
      <div class="row between"><h3>Ernährung heute</h3><a href="#essen" class="small">Tagebuch</a></div>
      ${t ? `<div class="kv"><div><b>${fmt(kcal, 0)}</b><span>von ${fmt(t.kcal, 0)} kcal</span></div><div><b>${fmt(prot, 0)} g</b><span>von ${t.protein} g Eiweiß</span></div><div><b>${fmt(fd.water * 0.25, 2)} l</b><span>von ${fmt(t.water, 2)} l Wasser</span></div></div>
        ${bar(kcal / t.kcal * 100, kcal > t.kcal ? 'over' : '')}` : `<p class="muted">Nach dem Ausfüllen des Profils siehst du hier dein Tagesziel.</p>`}
    </section>
    <section class="card">
      <h3>Gewicht</h3>
      <div class="kv"><div><b>${cw ? fmt(cw) + ' kg' : '–'}</b><span>aktuell</span></div><div><b>${first && cw ? (cw - first.v > 0 ? '+' : '') + fmt(cw - first.v) + ' kg' : '–'}</b><span>seit Start</span></div>${pf(p.goalWeight) ? `<div><b>${fmt(pf(p.goalWeight))} kg</b><span>Ziel</span></div>` : ''}</div>
      <form class="row" data-form="weight-quick"><input id="qw" name="v" inputmode="decimal" placeholder="Gewicht heute (kg)" aria-label="Gewicht heute in kg" required><button class="btn sm">Eintragen</button></form>
      <p class="small muted">Tipp: einmal pro Woche, morgens nach dem Aufstehen wiegen.</p>
    </section>
  </div>`;
}

// ---------- Ansicht: Plan ----------
function vPlan() {
  const pr = program(); const ph = ui.planPhase ?? pr.phase;
  const phases = PHASES.map((P, i) => `<button class="phase ${i === ph ? 'on' : ''}" data-act="phase" data-i="${i}">
    <span class="row between"><span class="eyebrow">Phase ${i + 1}</span>${i === pr.phase ? '<span class="pill acc">aktuell</span>' : ''}</span>
    <span class="wk">${P.name}</span><span class="small muted">${P.wk} · ${P.work} s / ${P.rest} s</span><span class="small">${P.text}</span></button>`).join('');
  const wcards = ROT.map(w => {
    const W = WORKOUTS[w]; const st = buildSteps(w, ph, 3);
    return `<section class="card"><div class="row between"><h2>Training ${w}</h2><span class="pill">${stepsMin(st)} Min.</span></div><p class="muted">${esc(W.name)}</p>
    <div class="exlist">${W.slots.map(sl => { const id = slotEx(sl, ph); const n = slotNote(sl, ph); return `<button class="exrow" data-act="ex" data-id="${id}">${figSVG(id)}<span><strong>${esc(EX[id].name)}</strong><span class="small muted">${esc(n || EX[id].mus)}</span></span><span class="chev">›</span></button>`; }).join('')}</div></section>`;
  }).join('');
  return `
  <section class="hero"><p class="eyebrow">Dein Programm</p><h1>Jeden zweiten Tag, 30 Minuten, ohne Geräte</h1>
  <p class="muted">Die Trainings A, B und C wechseln sich ab. Jede Einheit: 4–5 Min. Aufwärmen, 3 Runden Zirkel, 4 Min. Dehnen. Die Phase steigt automatisch mit jeder erledigten Einheit, nicht nach Kalender. Verpasst du einen Tag, machst du einfach am nächsten weiter.</p></section>
  <div class="phases">${phases}</div>
  <section class="card"><h3>So läuft jede Einheit ab</h3>
    <ol class="steps"><li><b>Aufwärmen (ca. 4,5 Min.):</b> ${WARM.map(([id]) => esc(EX[id].name)).join(', ')}.</li>
    <li><b>Zirkel:</b> 6 Übungen, je ${PHASES[ph].work} s Arbeit und ${PHASES[ph].rest} s Pause, 3 Runden (in den ersten 6 Einheiten 2), 60 s Pause zwischen den Runden.</li>
    <li><b>Abkühlen (4 Min.):</b> ${COOL.map(([id]) => esc(EX[id].name)).join(', ')}.</li></ol>
    <p class="small muted">In der Arbeitszeit machst du so viele <b>saubere</b> Wiederholungen wie möglich, im eigenen Tempo. Die letzten 2–3 Wiederholungen sollen anstrengend sein, aber nie unsauber.</p>
  </section>
  <div class="grid2">${wcards}</div>
  <section class="card"><h3>Damit es nachhaltig wirkt</h3><ul class="plain">
    <li><b>Dranbleiben schlägt Perfektion.</b> Eine kurze Einheit ist besser als keine. 80 % der Termine reichen für sichtbare Ergebnisse.</li>
    <li><b>Langsam steigern.</b> Wenn sich eine Einheit zweimal hintereinander leicht anfühlt: die schwerere Variante nehmen.</li>
    <li><b>Technik vor Tempo.</b> Kontrollierte Bewegungen bauen mehr Kraft auf und schützen die Gelenke.</li>
    <li><b>Schmerz ist ein Stoppsignal.</b> Muskelbrennen ist okay, stechende Schmerzen in Gelenken nicht. Dann die leichtere Variante nehmen oder die Übung auslassen.</li>
    <li><b>Schlaf und Eiweiß</b> entscheiden mit, wie schnell du kräftiger wirst: 7–9 Stunden und Eiweiß zu jeder Mahlzeit.</li>
    <li><b>Ruhetage aktiv nutzen:</b> spazieren gehen, Rad fahren, Treppe statt Aufzug. Das hilft beim Abnehmen und bei der Erholung.</li>
  </ul></section>
  <p class="small muted">Hinweis: Diese App ersetzt keine ärztliche Beratung. Bei Vorerkrankungen, Schmerzen oder Unsicherheit vor dem Start ärztlich abklären lassen.</p>`;
}

// ---------- Ansicht: Übungen ----------
function vUebungen() {
  const f = ui.exFilter;
  const chips = [['alle', 'Alle'], ...Object.entries(CATS)].map(([k, v]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="exfilter" data-f="${k}">${v}</button>`).join('');
  const items = Object.values(EX).filter(e => f === 'alle' || e.cat === f);
  return `<section class="hero"><p class="eyebrow">${items.length} Übungen</p><h1>Übungen</h1><p class="muted">Tippe eine Übung an: Ablauf, häufige Fehler, leichtere und schwerere Varianten.</p></section>
  <div class="row">${chips}</div>
  <div class="exgrid">${items.map(e => `<button class="excard" data-act="ex" data-id="${e.id}">${figSVG(e.id)}<strong>${esc(e.name)}</strong><span class="small muted">${esc(e.mus)}</span><span><span class="pill">${CATS[e.cat]}</span></span></button>`).join('')}</div>`;
}
function exDetail(id) {
  const e = EX[id];
  return `<div class="row between"><span class="pill">${CATS[e.cat]}</span><button class="iconbtn" data-act="close" aria-label="Schließen">✕</button></div>
  <h2>${esc(e.name)}</h2><p class="muted">${esc(e.mus)}</p>
  <div class="big">${figSVG(id)}</div>
  <div class="frames"><figure>${figSVG(id, 'start')}<figcaption>Start</figcaption></figure><figure>${figSVG(id, 'end')}<figcaption>${e.still ? 'Halten' : 'Endposition'}</figcaption></figure></div>
  <div class="stack"><h3>So geht’s</h3><ol class="steps">${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
  ${e.err && e.err.length ? `<div class="stack"><h3>Darauf achten</h3><ul class="plain">${e.err.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
  <div class="kv"><div><span>Leichter</span><p>${esc(e.easy)}</p></div><div><span>Schwerer</span><p>${esc(e.hard)}</p></div><div><span>Atmung</span><p>${esc(e.breath)}</p></div></div>
  ${e.tip ? `<p class="note">${esc(e.tip)}</p>` : ''}`;
}

// ---------- Ansicht: Essen ----------
function ring(val, max, label, sub) {
  const r = 50, c = 2 * Math.PI * r, pct = max ? clamp(val / max, 0, 1) : 0;
  return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${esc(label)} ${esc(sub)}"><circle class="bg" cx="60" cy="60" r="${r}" fill="none" stroke-width="12"/><circle class="fg ${max && val > max ? 'over' : ''}" cx="60" cy="60" r="${r}" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="60" text-anchor="middle" font-size="24">${esc(label)}</text><text class="sub" x="60" y="80" text-anchor="middle" font-size="11">${esc(sub)}</text></svg>`;
}
function vEssen() {
  const seg = `<div class="seg"><button class="${ui.nutriTab === 'tagebuch' ? 'on' : ''}" data-act="ntab" data-t="tagebuch">Kalorien-Tagebuch</button><button class="${ui.nutriTab === 'wissen' ? 'on' : ''}" data-act="ntab" data-t="wissen">Gesund essen</button></div>`;
  return `<section class="hero"><p class="eyebrow">Ernährung</p><h1>${ui.nutriTab === 'tagebuch' ? 'Kalorien & Eiweiß' : 'Gesund essen, ohne Verzicht-Frust'}</h1></section>${seg}${ui.nutriTab === 'tagebuch' ? vTagebuch() : vWissen()}`;
}
function vTagebuch() {
  const d = ui.foodDate, fd = foodDay(d), t = targets();
  const kcal = fd.entries.reduce((s, e) => s + (e.kcal || 0), 0), prot = fd.entries.reduce((s, e) => s + (e.p || 0), 0);
  const glasses = t ? Math.max(6, Math.ceil(t.water / 0.25)) : 8;
  const my = S('foods').list;
  const meals = MEALS.map(m => {
    const es = fd.entries.filter(e => e.meal === m); const sum = es.reduce((s, e) => s + (e.kcal || 0), 0);
    return `<div class="meal"><h3><span>${m}</span><span class="small muted num">${fmt(sum, 0)} kcal</span></h3>
    ${es.length ? es.map(e => `<div class="entry"><span>${esc(e.name)}</span><span class="small muted num">${fmt(e.kcal, 0)} kcal · ${fmt(e.p, 0)} g</span><button class="iconbtn" data-act="fdel" data-id="${esc(e.id)}" aria-label="${esc(e.name)} löschen">✕</button></div>`).join('') : `<p class="small muted">Noch nichts eingetragen.</p>`}</div>`;
  }).join('');
  return `
  <section class="card">
    <div class="row between"><button class="iconbtn" data-act="fday" data-n="-1" aria-label="Vorheriger Tag">‹</button><strong>${d === today() ? 'Heute' : fmtD(d, { weekday: 'long', day: 'numeric', month: 'long' })}</strong><button class="iconbtn" data-act="fday" data-n="1" aria-label="Nächster Tag" ${d >= today() ? 'disabled' : ''}>›</button></div>
    <div class="row">${ring(kcal, t ? t.kcal : 0, fmt(kcal, 0), t ? `von ${fmt(t.kcal, 0)} kcal` : 'kcal')}
      <div class="stack grow">
        <div class="row between small"><span>Eiweiß</span><span class="num">${fmt(prot, 0)} / ${t ? t.protein : '–'} g</span></div>${bar(t ? prot / t.protein * 100 : 0)}
        <p class="small muted">${t ? (kcal <= t.kcal ? `Noch ${fmt(t.kcal - kcal, 0)} kcal übrig.` : `${fmt(kcal - t.kcal, 0)} kcal über dem Ziel. Kein Problem, morgen geht’s normal weiter.`) : 'Profil ausfüllen, um ein Ziel zu sehen.'}</p>
      </div></div>
    <div class="stack"><span class="small muted">Wasser: tippe ein Glas (0,25 l) an</span><div class="water">${Array.from({ length: glasses }, (_, i) => `<button data-act="water" data-n="${i + 1}" class="${i < fd.water ? 'on' : ''}" aria-label="${i + 1} Gläser"></button>`).join('')}</div></div>
  </section>
  <section class="card">
    <h3>Eintragen</h3>
    <form class="form" data-form="food">
      <div class="fgrid">
        <label>Mahlzeit<select id="fmeal" name="meal">${MEALS.map(m => `<option ${m === ui.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label>Lebensmittel<input id="fname" name="name" maxlength="60" required placeholder="z. B. Omelett"></label>
        <label>kcal<input id="fkcal" name="kcal" inputmode="decimal" required></label>
        <label>Eiweiß (g)<input id="fp" name="p" inputmode="decimal" placeholder="0"></label>
      </div>
      <div class="row between"><label class="check small"><input type="checkbox" id="fsave" name="save"> In „Meine Lebensmittel“ merken</label><button class="btn">Hinzufügen</button></div>
    </form>
    <div class="stack"><span class="small muted">Schnell hinzufügen zu <b>${esc(ui.meal)}</b> (Richtwerte):</span>
      <div class="quick">${my.map((f, i) => `<button class="chip" data-act="fquick" data-src="my" data-i="${i}">★ ${esc(f.name)}</button>`).join('')}${FOODS.map((f, i) => `<button class="chip" data-act="fquick" data-src="std" data-i="${i}">${esc(f[0])}</button>`).join('')}</div>
      ${my.length ? `<details><summary class="small">Meine Lebensmittel bearbeiten</summary><div class="stack">${my.map((f, i) => `<div class="entry"><span>${esc(f.name)}</span><span class="small muted">${fmt(f.kcal, 0)} kcal · ${fmt(f.p, 0)} g</span><button class="iconbtn" data-act="mydel" data-i="${i}" aria-label="${esc(f.name)} entfernen">✕</button></div>`).join('')}</div></details>` : ''}
    </div>
  </section>
  <section class="card">${meals}</section>`;
}
function vWissen() {
  const t = targets();
  return `
  ${t ? `<section class="card feature"><p class="eyebrow">Deine Richtwerte pro Tag</p>
    <div class="kv"><div><b>${fmt(t.kcal, 0)}</b><span>kcal ${t.lose ? '(sanftes Defizit)' : '(Erhaltung)'}</span></div><div><b>${t.protein} g</b><span>Eiweiß</span></div><div><b>${t.carbs} g</b><span>Kohlenhydrate</span></div><div><b>${t.fat} g</b><span>Fett</span></div><div><b>${fmt(t.water, 2)} l</b><span>Wasser</span></div></div>
    <p class="small muted">Grundumsatz ca. ${fmt(t.bmr, 0)} kcal, Gesamtbedarf ca. ${fmt(t.tdee, 0)} kcal. ${t.lose ? 'Mit etwa 350 kcal unter dem Bedarf verlierst du ca. 0,25–0,5 kg pro Woche, ohne Muskeln einzubüßen.' : 'Du isst auf Erhaltung: Fett geht langsam zurück, Muskeln kommen dazu.'}</p></section>`
    : `<div class="banner"><span>Mit deinem Profil berechnet die App deine persönlichen Richtwerte.</span><a class="btn sm" href="#profil">Profil ausfüllen</a></div>`}
  <div class="grid2">
    <section class="card"><h3>Das Teller-Prinzip</h3>
      <svg viewBox="0 0 200 200" class="chart" role="img" aria-label="Teller: halb Gemüse, ein Viertel Eiweiß, ein Viertel Vollkorn">
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="6"/>
        <path d="M100 100 L100 12 A88 88 0 0 0 100 188 Z" class="ar"/><path d="M100 100 L100 12 A88 88 0 0 1 188 100 Z" class="plate-a"/><path d="M100 100 L188 100 A88 88 0 0 1 100 188 Z" class="plate-b"/>
        <text x="55" y="104" text-anchor="middle" class="lbl">Gemüse</text><text x="55" y="120" text-anchor="middle" class="ax">½ Teller</text>
        <text x="140" y="68" text-anchor="middle" class="lbl">Eiweiß</text><text x="140" y="84" text-anchor="middle" class="ax">¼ Teller</text>
        <text x="140" y="134" text-anchor="middle" class="lbl">Vollkorn</text><text x="140" y="150" text-anchor="middle" class="ax">¼ Teller</text>
      </svg>
      <p class="small">Dazu ein Daumen gesundes Fett (Olivenöl, Nüsse, Avocado). So wirst du satt und musst nicht ständig zählen.</p></section>
    <section class="card"><h3>Die 6 wichtigsten Regeln</h3><ol class="steps">
      <li><b>Eiweiß zu jeder Mahlzeit</b> (25–40 g). Das hält satt und baut Muskeln auf.</li>
      <li><b>Gemüse und Obst:</b> 3 Hände Gemüse, 2 Hände Obst pro Tag, wegen der Ballaststoffe.</li>
      <li><b>Kalorien trinken vermeiden:</b> Wasser, Tee und schwarzer Kaffee statt Saft, Softdrinks und Alkohol.</li>
      <li><b>Möglichst unverarbeitet:</b> Was deine Oma als Essen erkennen würde, ist meist eine gute Wahl.</li>
      <li><b>80/20-Regel:</b> 80 % nährstoffreich, 20 % Genuss. Nachhaltig heißt ohne Verbote.</li>
      <li><b>Schlafen:</b> Wenig Schlaf steigert Heißhunger nachweislich.</li></ol></section>
    <section class="card"><h3>Gute Eiweißquellen</h3><ul class="plain">
      <li>Magerquark, Skyr, Hüttenkäse, griechischer Joghurt</li><li>Eier, Hähnchen, Pute, Fisch (Lachs, Thunfisch, Seelachs)</li>
      <li>Linsen, Kichererbsen, Bohnen, Tofu, Tempeh, Edamame</li><li>Haferflocken, Vollkornbrot und Nüsse als Ergänzung</li></ul></section>
    <section class="card"><h3>Beispieltag (ca. 1.900 kcal, 140 g Eiweiß)</h3><ul class="plain">
      <li><b>Frühstück:</b> Skyr mit Haferflocken, Beeren und ein paar Nüssen</li><li><b>Mittag:</b> Vollkornnudeln mit Linsen-Bolognese und Salat</li>
      <li><b>Snack:</b> Apfel und Hüttenkäse oder ein Proteinshake nach dem Training</li><li><b>Abend:</b> Lachs oder Tofu mit Ofengemüse und Kartoffeln</li></ul>
      <p class="small muted">Portionen an deine Richtwerte oben anpassen.</p></section>
    <section class="card"><h3>Portionen mit der Hand</h3><ul class="plain">
      <li><b>Handfläche</b> = 1 Portion Eiweiß</li><li><b>Faust</b> = 1 Portion Gemüse</li><li><b>Hohle Hand</b> = 1 Portion Kohlenhydrate</li><li><b>Daumen</b> = 1 Portion Fett</li></ul>
      <p class="small muted">Praktisch, wenn du mal nicht tracken möchtest.</p></section>
    <section class="card"><h3>Rund ums Training</h3><ul class="plain">
      <li>1–2 Stunden vorher eine leichte Mahlzeit oder Banane, wenn du hungrig bist</li><li>Danach eiweißreich essen, z. B. Quark, Eier oder ein Shake</li><li>Vor dem Training ein Glas Wasser trinken</li></ul></section>
  </div>
  <p class="small muted">Die Werte sind Schätzungen (Mifflin-St-Jeor-Formel) und keine medizinische Ernährungsberatung.</p>`;
}

// ---------- Ansicht: Fortschritt ----------
function lineChart(pts, goal) {
  if (pts.length < 2) return `<p class="empty">Ab zwei Einträgen siehst du hier deinen Verlauf.</p>`;
  const W = 640, H = 230, L = 44, R = 18, T = 18, B = 30;
  const xs = pts.map(p => parseYmd(p.date).getTime()); const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let vs = pts.map(p => p.v); if (goal) vs = vs.concat(goal);
  const y0 = Math.floor(Math.min(...vs) - 1), y1 = Math.ceil(Math.max(...vs) + 1);
  const X = t => L + (x1 === x0 ? 0.5 : (t - x0) / (x1 - x0)) * (W - L - R);
  const Y = v => T + (y1 - v) / (y1 - y0) * (H - T - B);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4; g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="ax" x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v, 1)}</text>`; }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(xs[xs.length - 1]).toFixed(1)} ${H - B} L${X(xs[0]).toFixed(1)} ${H - B} Z`;
  const last = pts[pts.length - 1], lx = X(xs[xs.length - 1]), ly = Y(last.v);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">${g}
    ${goal ? `<line class="goal" x1="${L}" x2="${W - R}" y1="${Y(goal).toFixed(1)}" y2="${Y(goal).toFixed(1)}"/><text class="gl" x="${W - R}" y="${(Y(goal) - 6).toFixed(1)}" text-anchor="end">Ziel ${fmt(goal)} kg</text>` : ''}
    <path class="ar" d="${area}"/><path class="ln" d="${line}"/>
    ${pts.map((p, i) => `<circle class="dt" cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5"/>`).join('')}
    <circle class="end" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="6"/><text class="lbl" x="${Math.min(lx, W - R - 4).toFixed(1)}" y="${(ly - 12).toFixed(1)}" text-anchor="end">${fmt(last.v)} kg</text>
    <text class="ax" x="${L}" y="${H - 8}">${fmtD(pts[0].date, { day: 'numeric', month: 'short' })}</text><text class="ax" x="${W - R}" y="${H - 8}" text-anchor="end">${fmtD(last.date, { day: 'numeric', month: 'short' })}</text></svg>`;
}
function vFortschritt() {
  const pr = program(), ws = weightsSorted(), p = S('profile'), td = today();
  const ms = [...S('measures').list].sort((a, b) => a.date < b.date ? 1 : -1);
  const firstM = ms[ms.length - 1], lastM = ms[0];
  const last28 = pr.list.filter(x => dayDiff(x.date, td) < 28 && dayDiff(x.date, td) >= 0).length;
  const mins = pr.list.reduce((s, x) => s + (x.min || 0), 0);
  // Kalender: 12 Wochen, Spalten = Wochen (Mo–So)
  const done = new Set(pr.list.map(x => x.date));
  const now = parseYmd(td); const mondayOffset = (now.getDay() + 6) % 7;
  const start = addDays(td, -mondayOffset - 7 * 11);
  let cal = '';
  for (let i = 0; i < 84; i++) { const d = addDays(start, i); const cls = d > td ? 'x' : done.has(d) ? 'd' : ''; cal += `<i class="${cls} ${d === td ? 't' : ''}" title="${fmtD(d)}"></i>`; }
  const deltas = firstM && lastM && firstM !== lastM ? MEASURES.map(([k, n]) => { const a = pf(firstM[k]), b = pf(lastM[k]); if (a == null || b == null) return ''; const d = b - a; return `<div><b class="delta ${d < 0 ? 'down' : d > 0 ? 'up' : ''}">${d > 0 ? '+' : ''}${fmt(d)} cm</b><span>${n}</span></div>`; }).join('') : '';
  const posePhotos = Photos.list.filter(x => x.pose === ui.pose);
  const firstP = posePhotos[0], lastP = posePhotos[posePhotos.length - 1];
  return `
  <section class="hero"><p class="eyebrow">Fortschritt</p><h1>Dein Weg in Zahlen</h1></section>
  <section class="card"><div class="kv">
    <div><b>${pr.n}</b><span>Einheiten gesamt</span></div><div><b>${last28} / 14</b><span>letzte 4 Wochen</span></div>
    <div><b>${fmt(mins / 60, 1)} h</b><span>Trainingszeit</span></div><div><b>${PHASES[pr.phase].name}</b><span>Phase ${pr.phase + 1}</span></div></div>
    <div class="stack"><span class="small muted">Trainingstage der letzten 12 Wochen (Spalte = Woche, Mo–So)</span><div class="cal">${cal}</div></div>
    ${pr.list.length ? `<details><summary class="small">Alle Einheiten</summary><div class="tablewrap"><table><thead><tr><th>Datum</th><th>Training</th><th>Gefühl</th><th>Min.</th><th></th></tr></thead><tbody>${[...pr.list].reverse().map(x => `<tr><td>${fmtD(x.date)}</td><td>${esc(x.w)}</td><td>${esc(x.feel || '–')}</td><td>${fmt(x.min || 0, 0)}</td><td><button class="iconbtn" data-act="wdel" data-id="${esc(x.id)}" aria-label="Einheit löschen">✕</button></td></tr>`).join('')}</tbody></table></div></details>` : ''}
  </section>
  <section class="card"><h3>Gewicht</h3>${lineChart(ws, pf(p.goalWeight))}
    <form class="row" data-form="weight"><input type="date" id="wdate" name="date" value="${td}" max="${td}" aria-label="Datum" class="auto"><input id="wv" name="v" inputmode="decimal" placeholder="kg" required aria-label="Gewicht in kg" class="w110"><button class="btn sm">Eintragen</button></form>
    ${ws.length ? `<details><summary class="small">Alle Einträge</summary><div class="stack">${[...ws].reverse().map(x => `<div class="entry"><span>${fmtD(x.date)}</span><span class="num">${fmt(x.v)} kg</span><button class="iconbtn" data-act="wtdel" data-d="${esc(x.date)}" aria-label="Eintrag löschen">✕</button></div>`).join('')}</div></details>` : ''}
  </section>
  <section class="card"><h3>Körpermaße (cm)</h3>
    <p class="small muted">Alle 2–4 Wochen morgens messen, Maßband waagerecht. Taille auf Höhe des Bauchnabels. Maße zeigen Fortschritt oft früher als die Waage.</p>
    ${deltas ? `<div class="kv">${deltas}</div>` : ''}
    <form class="form" data-form="measure"><div class="fgrid"><label>Datum<input type="date" id="mdate" name="date" value="${td}" max="${td}"></label>${MEASURES.map(([k, n]) => `<label>${n}<input id="m-${k}" name="${k}" inputmode="decimal"></label>`).join('')}</div><button class="btn">Maße speichern</button></form>
    ${ms.length ? `<div class="tablewrap"><table><thead><tr><th>Datum</th>${MEASURES.map(([, n]) => `<th>${n}</th>`).join('')}<th></th></tr></thead><tbody>${ms.map(m => `<tr><td>${fmtD(m.date)}</td>${MEASURES.map(([k]) => `<td>${m[k] != null ? fmt(m[k]) : '–'}</td>`).join('')}<td><button class="iconbtn" data-act="mdel" data-d="${esc(m.date)}" aria-label="Messung löschen">✕</button></td></tr>`).join('')}</tbody></table></div>` : ''}
  </section>
  <section class="card"><h3>Fortschrittsfotos</h3>
    <p class="small muted">Die Fotos bleiben nur auf diesem Gerät. Beim Speichern werden sie verkleinert und Standort- und Kameradaten (EXIF) entfernt. Tipp: gleiches Licht, gleiche Stelle, alle 4 Wochen.</p>
    <div class="row"><div class="seg">${POSES.map(([k, n]) => `<button class="${ui.pose === k ? 'on' : ''}" data-act="pose" data-p="${k}">${n}</button>`).join('')}</div>
      <label class="btn filebtn">Foto hinzufügen<input type="file" id="photoIn" accept="image/*" data-act="photo"></label></div>
    ${firstP && lastP && firstP !== lastP ? `<div class="compare"><figure><img src="${Photos.url(firstP)}" alt="Erstes Foto"><figcaption>${fmtD(firstP.date, { day: 'numeric', month: 'short', year: 'numeric' })}</figcaption></figure><figure><img src="${Photos.url(lastP)}" alt="Neuestes Foto"><figcaption>${fmtD(lastP.date, { day: 'numeric', month: 'short', year: 'numeric' })}</figcaption></figure></div>` : ''}
    ${posePhotos.length ? `<div class="photos">${[...posePhotos].reverse().map(x => `<figure class="photo"><img src="${Photos.url(x)}" alt="Foto vom ${fmtD(x.date)}"><figcaption>${fmtD(x.date, { day: 'numeric', month: 'short', year: 'numeric' })}</figcaption><button class="iconbtn" data-act="phdel" data-id="${esc(x.id)}" aria-label="Foto löschen">✕</button></figure>`).join('')}</div>` : `<p class="empty">Noch keine Fotos in dieser Ansicht.</p>`}
  </section>`;
}

// ---------- Ansicht: Profil & Daten ----------
function vProfil() {
  const p = S('profile'); const t = targets();
  const v = k => esc(p[k] ?? '');
  return `<section class="hero"><p class="eyebrow">Profil</p><h1>Deine Daten</h1><p class="muted">Daraus berechnet die App Kalorien, Eiweiß und Wasser. Nichts davon verlässt dieses Gerät.</p></section>
  <section class="card"><form class="form" data-form="profile">
    <div class="fgrid">
      <label>Vorname (optional)<input id="pname" name="name" maxlength="30" value="${v('name')}"></label>
      <label>Geschlecht<select id="psex" name="sex"><option value="">bitte wählen</option><option value="m" ${p.sex === 'm' ? 'selected' : ''}>männlich</option><option value="w" ${p.sex === 'w' ? 'selected' : ''}>weiblich</option></select></label>
      <label>Alter<input id="page" name="age" inputmode="numeric" value="${v('age')}"></label>
      <label>Größe (cm)<input id="pheight" name="height" inputmode="decimal" value="${v('height')}"></label>
      <label>Startgewicht (kg)<input id="pweight" name="weight" inputmode="decimal" value="${v('weight')}"></label>
      <label>Zielgewicht (kg)<input id="pgoal" name="goalWeight" inputmode="decimal" value="${v('goalWeight')}"></label>
      <label>Alltag<select id="pact" name="activity">
        ${[['1.3', 'überwiegend sitzend'], ['1.45', 'leicht aktiv (viel zu Fuß)'], ['1.6', 'körperlich aktiv / Stehberuf']].map(([k, n]) => `<option value="${k}" ${String(p.activity || '1.45') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Programmstart<input type="date" id="pstart" name="start" value="${v('start') || today()}"></label>
    </div>
    <button class="btn">Profil speichern</button>
  </form>
  ${t ? `<p class="small muted">BMI ${fmt(t.bmi)} · Tagesziel ${fmt(t.kcal, 0)} kcal · ${t.protein} g Eiweiß</p>` : ''}</section>
  <section class="card"><h3>Datenschutz & Sicherheit</h3><ul class="plain">
    <li>Alle Einträge und Fotos liegen <b>nur in diesem Browser auf diesem Gerät</b> (IndexedDB). Es gibt kein Konto, keinen Server, keine Cloud.</li>
    <li>Die App lädt nichts von fremden Servern: keine Schriftarten, kein Tracking, keine Werbung. Eine Sicherheitsrichtlinie (CSP) blockiert Verbindungen nach außen.</li>
    <li>Fotos werden beim Speichern neu gerechnet. Dabei gehen Standort und Kameradaten verloren.</li>
    <li>Schütze dein Handy mit PIN oder Fingerabdruck. Wer dein entsperrtes Handy hat, kann die App öffnen.</li>
    <li>Wenn du die Browserdaten der Seite löschst oder die App deinstallierst, sind die Daten weg. Mach deshalb ab und zu ein Backup.</li></ul>
    <p class="small muted">Speicher: ${Store.ok ? 'aktiv' : 'nicht verfügbar'} · ${Photos.list.length} Fotos</p></section>
  <section class="card"><h3>Backup</h3>
    <p class="small muted">Das Backup ist eine Datei mit allen Einträgen und Fotos. Bewahre sie privat auf, zum Beispiel nicht in geteilten Ordnern.</p>
    <div class="row"><button class="btn" data-act="export">Backup speichern</button><label class="btn soft filebtn">Backup laden<input type="file" id="importIn" accept="application/json,.json" data-act="import"></label></div>
    <button class="btn danger sm" data-act="wipe">Alle Daten löschen</button></section>`;
}

// ---------- Rendern & Navigation ----------
function render() {
  const v = ui.view;
  const html = v === 'plan' ? vPlan() : v === 'uebungen' ? vUebungen() : v === 'essen' ? vEssen() : v === 'fortschritt' ? vFortschritt() : v === 'profil' ? vProfil() : vHeute();
  const main = $('#view'); main.innerHTML = html; applyWidths(main);
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === v));
  collectFigs();
}
function route() {
  const h = location.hash.replace('#', '');
  const nv = VIEWS.includes(h) ? h : 'heute';
  const changed = nv !== ui.view; ui.view = nv; render();
  if (changed) window.scrollTo(0, 0);
}
function openModal(html) { $('#modalBody').innerHTML = html; applyWidths($('#modalBody')); $('#modal').hidden = false; collectFigs(); }
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; collectFigs(); }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }

// ---------- Training-Player ----------
const PL = { steps: [], i: 0, remain: 0, endAt: 0, running: false, w: 'A', phase: 0, rounds: 3, startedAt: 0, lastSec: -1, half: false, timer: null, ac: null, wake: null, sound: true, confirm: false };
function beep(f = 880, d = 0.12) {
  if (!PL.sound || !PL.ac) return;
  try { const o = PL.ac.createOscillator(), g = PL.ac.createGain(); o.frequency.value = f; o.connect(g); g.connect(PL.ac.destination); g.gain.setValueAtTime(0.18, PL.ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, PL.ac.currentTime + d); o.start(); o.stop(PL.ac.currentTime + d); } catch (e) { /* ohne Ton */ }
}
async function wakeOn() { try { if ('wakeLock' in navigator) PL.wake = await navigator.wakeLock.request('screen'); } catch (e) { PL.wake = null; } }
function wakeOff() { try { if (PL.wake) PL.wake.release(); } catch (e) { /* egal */ } PL.wake = null; }
function startWorkout() {
  const pr = program();
  PL.w = pr.next; PL.phase = pr.phase; PL.rounds = pr.rounds;
  PL.steps = buildSteps(PL.w, PL.phase, PL.rounds); PL.i = 0; PL.startedAt = Date.now(); PL.confirm = false;
  try { PL.ac = PL.ac || new (window.AudioContext || window.webkitAudioContext)(); if (PL.ac.state === 'suspended') PL.ac.resume(); } catch (e) { PL.ac = null; }
  closeModal(); $('#player').hidden = false; document.body.style.overflow = 'hidden';
  wakeOn(); goStep(0, true);
  clearInterval(PL.timer); PL.timer = setInterval(tick, 200);
}
function goStep(i, run = true) {
  if (i >= PL.steps.length) { finishWorkout(true); return; }
  PL.i = clamp(i, 0, PL.steps.length - 1);
  const st = PL.steps[PL.i];
  PL.remain = st.dur * 1000; PL.running = run; PL.endAt = Date.now() + PL.remain; PL.lastSec = -1; PL.half = false;
  renderPlayer();
  if (st.k === 'work' || st.k === 'warm' || st.k === 'cool') beep(660, 0.25);
}
function tick() {
  if (!PL.running) return;
  PL.remain = PL.endAt - Date.now();
  const sec = Math.ceil(PL.remain / 1000);
  const st = PL.steps[PL.i];
  if (sec !== PL.lastSec) {
    PL.lastSec = sec;
    const tEl = $('#plTime'); if (tEl) tEl.textContent = mmss(Math.max(0, sec));
    if (sec <= 3 && sec >= 1) beep(880, 0.08);
    const elapsed = PL.steps.slice(0, PL.i).reduce((s, x) => s + x.dur, 0) + (st.dur - Math.max(0, PL.remain / 1000));
    const total = PL.steps.reduce((s, x) => s + x.dur, 0);
    const b = $('#plBar'); if (b) b.style.width = (elapsed / total * 100).toFixed(1) + '%';
  }
  const ex = EX[st.ex];
  if (!PL.half && ex && ex.sides && (st.k === 'work' || st.k === 'cool') && PL.remain <= st.dur * 500 && (ex.still || ex.id === 'sideplank' || ex.id === 'bridge1')) {
    PL.half = true; const s = $('#plSide'); if (s) s.hidden = false; beep(520, 0.3);
  }
  if (PL.remain <= 0) goStep(PL.i + 1);
}
function renderPlayer() {
  const st = PL.steps[PL.i], ex = EX[st.ex];
  const isRest = st.k === 'rest' || st.k === 'prep';
  const nxt = PL.steps.slice(PL.i + 1).find(x => x.k !== 'rest');
  const sideNote = ex.sides ? (ex.still || ex.id === 'sideplank' || ex.id === 'bridge1' ? 'Halbe Zeit je Seite' : 'Seiten abwechseln') : '';
  $('#player').innerHTML = `<div class="pl ${isRest ? 'rest' : ''}">
    <div class="pl-top"><button class="btn soft sm" data-act="plstop">Beenden</button><div class="pl-seg">${esc(st.label)}</div><button class="btn soft sm" data-act="plsound" aria-pressed="${PL.sound}">${PL.sound ? 'Ton an' : 'Ton aus'}</button></div>
    <div class="bar"><i id="plBar"></i></div>
    ${PL.confirm ? `<div class="pl-confirm"><strong>Training beenden?</strong><p class="small muted">Du kannst die Einheit trotzdem eintragen. Auch ein Teil zählt.</p><div class="row"><button class="btn" data-act="plsave">Eintragen</button><button class="btn soft" data-act="plquit">Verwerfen</button><button class="btn ghost" data-act="plresume">Weitermachen</button></div></div>` : ''}
    <div class="pl-fig">${figSVG(st.ex)}</div>
    <div class="pl-name">${isRest ? 'Als Nächstes: ' : ''}${esc(ex.name)}</div>
    <div class="pl-note">${esc([st.note, sideNote].filter(Boolean).join(' · ') || ex.mus)}</div>
    <div class="pl-time num" id="plTime">${mmss(Math.ceil(PL.remain / 1000))}</div>
    <div class="pl-side" id="plSide" hidden>Seite wechseln</div>
    <div class="pl-ctrl"><button class="btn soft" data-act="plprev" aria-label="Zurück">‹</button><button class="btn" data-act="pltoggle">${PL.running ? 'Pause' : 'Weiter'}</button><button class="btn soft" data-act="plnext" aria-label="Überspringen">›</button></div>
    <div class="pl-next">${nxt && !isRest ? 'Danach: ' + esc(EX[nxt.ex].name) : ''}</div>
    <details class="card"><summary>So geht’s</summary><ol class="steps">${ex.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
  </div>`;
  collectFigs();
  const total = PL.steps.reduce((s, x) => s + x.dur, 0); const elapsed = PL.steps.slice(0, PL.i).reduce((s, x) => s + x.dur, 0);
  $('#plBar').style.width = (elapsed / total * 100).toFixed(1) + '%';
}
function closePlayer() {
  clearInterval(PL.timer); PL.running = false; wakeOff();
  $('#player').hidden = true; $('#player').innerHTML = ''; document.body.style.overflow = ''; collectFigs();
}
function finishWorkout(complete) {
  const min = Math.max(1, Math.round((Date.now() - PL.startedAt) / 60000));
  closePlayer(); if (complete) beep(990, 0.4);
  logModal({ w: PL.w, phase: PL.phase, rounds: PL.rounds, min, complete });
}
function logModal(d) {
  const pr = program(); const w = d && d.w ? d.w : pr.next;
  ui.feel = null; ui.pendingLog = { w, phase: d ? d.phase : pr.phase, rounds: d ? d.rounds : pr.rounds, min: d ? d.min : stepsMin(buildSteps(w, pr.phase, pr.rounds)) };
  openModal(`<div class="row between"><h2>${d && d.complete ? 'Geschafft!' : 'Einheit eintragen'}</h2><button class="iconbtn" data-act="close" aria-label="Schließen">✕</button></div>
  <p>Training ${w} · ${esc(WORKOUTS[w].name)} · ca. ${ui.pendingLog.min} Min.</p>
  <form class="form" data-form="log">
    <div class="stack"><span class="small muted">Wie hat es sich angefühlt?</span><div class="feel">${[['leicht', 'Leicht'], ['passend', 'Genau richtig'], ['schwer', 'Schwer']].map(([k, n]) => `<button type="button" data-act="feel" data-f="${k}">${n}</button>`).join('')}</div></div>
    <label>Datum<input type="date" id="ldate" name="date" value="${today()}" max="${today()}"></label>
    <label>Notiz (optional)<textarea id="lnote" name="note" maxlength="300" placeholder="z. B. Knie-Liegestütze fast komplett geschafft"></textarea></label>
    <button class="btn block">Speichern</button></form>`);
}

// ---------- Bild verkleinern (entfernt EXIF) ----------
async function shrinkImage(file) {
  const max = 1280;
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) {
    src = await new Promise((res, rej) => { const img = new Image(); const u = URL.createObjectURL(file); img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Bild')); }; img.src = u; });
  }
  const w0 = src.width, h0 = src.height, sc = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * sc); c.height = Math.round(h0 * sc);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Bild')), 'image/jpeg', 0.84));
}

// ---------- Backup ----------
function blobToDataURL(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); }); }
function dataURLToBlob(s) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s); if (!m) return null;
  const bin = atob(m[2]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: m[1] });
}
async function exportBackup() {
  const kv = {}; for (const k in Store.cache) if (KEY_RE.test(k)) kv[k] = Store.cache[k];
  const photos = []; for (const p of Photos.list) photos.push({ id: p.id, date: p.date, pose: p.pose, data: await blobToDataURL(p.blob) });
  const blob = new Blob([JSON.stringify({ app: 'hausstark', version: 1, exported: new Date().toISOString(), kv, photos })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hausstark-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup erstellt.');
}
function sanitizeImport(obj) {
  if (!obj || obj.app !== 'hausstark' || typeof obj.kv !== 'object' || obj.kv === null) throw new Error('Keine Hausstark-Backupdatei.');
  const kv = {};
  for (const [k, v] of Object.entries(obj.kv)) {
    if (!KEY_RE.test(k) || typeof v !== 'object' || v === null) continue;
    kv[k] = JSON.parse(JSON.stringify(v));
  }
  const photos = [];
  for (const p of Array.isArray(obj.photos) ? obj.photos.slice(0, 500) : []) {
    if (!p || typeof p.data !== 'string' || !isDate(p.date)) continue;
    const blob = dataURLToBlob(p.data); if (!blob) continue;
    photos.push({ id: String(p.id || uid()).replace(/[^a-z0-9]/gi, '').slice(0, 40) || uid(), date: p.date, pose: POSES.some(([k]) => k === p.pose) ? p.pose : 'vorne', blob });
  }
  return { kv, photos };
}
async function applyImport(data) {
  await Store.clearAll(); Photos.reset();
  Object.assign(Store.cache, data.kv);
  for (const k of Object.keys(data.kv)) Store.save(k);
  for (const p of data.photos) await Photos.add(p);
  closeModal(); render(); toast('Backup geladen.');
}

// ---------- Ereignisse ----------
function upsertByDate(list, entry) { const i = list.findIndex(x => x.date === entry.date); if (i >= 0) list[i] = entry; else list.push(entry); }
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (el.tagName === 'INPUT') return; // Datei-Inputs reagieren auf change
  switch (act) {
    case 'start': startWorkout(); break;
    case 'log': logModal(null); break;
    case 'ex': openModal(exDetail(el.dataset.id)); break;
    case 'close': closeModal(); break;
    case 'phase': ui.planPhase = Number(el.dataset.i); render(); break;
    case 'exfilter': ui.exFilter = el.dataset.f; render(); break;
    case 'ntab': ui.nutriTab = el.dataset.t; render(); break;
    case 'pose': ui.pose = el.dataset.p; render(); break;
    case 'fday': ui.foodDate = addDays(ui.foodDate, Number(el.dataset.n)); if (ui.foodDate > today()) ui.foodDate = today(); render(); break;
    case 'water': { const fd = foodDay(ui.foodDate); const n = Number(el.dataset.n); fd.water = fd.water === n ? n - 1 : n; Store.save('food-' + ui.foodDate); render(); break; }
    case 'fdel': { const fd = foodDay(ui.foodDate); fd.entries = fd.entries.filter(x => x.id !== el.dataset.id); Store.save('food-' + ui.foodDate); render(); break; }
    case 'fquick': {
      const meal = ($('#fmeal') && $('#fmeal').value) || ui.meal; ui.meal = meal;
      const f = el.dataset.src === 'my' ? S('foods').list[Number(el.dataset.i)] : (() => { const x = FOODS[Number(el.dataset.i)]; return { name: x[0], kcal: x[1], p: x[2] }; })();
      if (!f) break;
      foodDay(ui.foodDate).entries.push({ id: uid(), meal, name: f.name, kcal: f.kcal, p: f.p }); Store.save('food-' + ui.foodDate);
      render(); toast(`${f.name} zu ${meal} hinzugefügt.`); break;
    }
    case 'mydel': { const L = S('foods').list; L.splice(Number(el.dataset.i), 1); Store.save('foods'); render(); break; }
    case 'feel': ui.feel = el.dataset.f; el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); break;
    case 'wdel': confirmModal('Diese Einheit löschen?', () => { const W = S('workouts'); W.list = W.list.filter(x => x.id !== el.dataset.id); Store.save('workouts'); }); break;
    case 'wtdel': confirmModal('Diesen Gewichtseintrag löschen?', () => { const W = S('weights'); W.list = W.list.filter(x => x.date !== el.dataset.d); Store.save('weights'); }); break;
    case 'mdel': confirmModal('Diese Messung löschen?', () => { const M = S('measures'); M.list = M.list.filter(x => x.date !== el.dataset.d); Store.save('measures'); }); break;
    case 'phdel': confirmModal('Dieses Foto endgültig löschen?', async () => { await Photos.remove(el.dataset.id); }); break;
    case 'export': try { await exportBackup(); } catch (err) { toast('Backup fehlgeschlagen.'); } break;
    case 'wipe': confirmModal('Wirklich alle Daten und Fotos löschen? Das kann nicht rückgängig gemacht werden.', async () => { await Store.clearAll(); Photos.reset(); }, 'Alles löschen'); break;
    case 'confirm-yes': { const fn = ui.confirmFn; ui.confirmFn = null; closeModal(); if (fn) { try { await fn(); } catch (err) { toast('Das hat nicht geklappt.'); } } render(); break; }
    case 'import-yes': { const d = ui.importData; ui.importData = null; if (d) { try { await applyImport(d); } catch (err) { toast('Import fehlgeschlagen.'); } } break; }
    // Player
    case 'pltoggle': if (PL.running) { PL.running = false; PL.remain = PL.endAt - Date.now(); } else { PL.running = true; PL.endAt = Date.now() + PL.remain; } renderPlayer(); break;
    case 'plnext': goStep(PL.i + 1, PL.running || true); break;
    case 'plprev': goStep(Math.max(0, PL.i - 1), true); break;
    case 'plsound': PL.sound = !PL.sound; renderPlayer(); break;
    case 'plstop': PL.running = false; PL.remain = PL.endAt - Date.now(); PL.confirm = true; renderPlayer(); break;
    case 'plresume': PL.confirm = false; PL.running = true; PL.endAt = Date.now() + PL.remain; renderPlayer(); break;
    case 'plsave': finishWorkout(false); break;
    case 'plquit': closePlayer(); render(); break;
  }
});
function confirmModal(text, fn, yes = 'Löschen') {
  ui.confirmFn = fn;
  openModal(`<h2>${esc(text)}</h2><div class="row"><button class="btn danger" data-act="confirm-yes">${esc(yes)}</button><button class="btn soft" data-act="close">Abbrechen</button></div>`);
}
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.id === 'fmeal') { ui.meal = el.value; render(); return; }
  if (el.id === 'photoIn' && el.files && el.files[0]) {
    const file = el.files[0]; el.value = '';
    if (!/^image\//.test(file.type)) { toast('Bitte eine Bilddatei wählen.'); return; }
    if (file.size > 40 * 1024 * 1024) { toast('Das Bild ist zu groß.'); return; }
    try { toast('Foto wird gespeichert …'); const blob = await shrinkImage(file); await Photos.add({ id: uid(), date: today(), pose: ui.pose, blob }); render(); toast('Foto gespeichert.'); }
    catch (err) { toast('Das Foto konnte nicht gespeichert werden.'); }
    return;
  }
  if (el.id === 'importIn' && el.files && el.files[0]) {
    const file = el.files[0]; el.value = '';
    if (file.size > 200 * 1024 * 1024) { toast('Die Datei ist zu groß.'); return; }
    try {
      const data = sanitizeImport(JSON.parse(await file.text()));
      ui.importData = data;
      openModal(`<h2>Backup laden?</h2><p>Das Backup enthält ${Object.keys(data.kv).length} Datenbereiche und ${data.photos.length} Fotos. <b>Alle aktuellen Daten auf diesem Gerät werden ersetzt.</b></p><div class="row"><button class="btn" data-act="import-yes">Ersetzen und laden</button><button class="btn soft" data-act="close">Abbrechen</button></div>`);
    } catch (err) { toast(err && err.message === 'Keine Hausstark-Backupdatei.' ? err.message : 'Die Datei konnte nicht gelesen werden.'); }
  }
});
document.addEventListener('submit', e => {
  const f = e.target; const kind = f.dataset.form; if (!kind) return;
  e.preventDefault();
  const fd = new FormData(f); const g = k => fd.get(k);
  if (kind === 'weight-quick' || kind === 'weight') {
    const v = pf(g('v')); const date = kind === 'weight' && isDate(g('date')) ? g('date') : today();
    if (v == null || v < 30 || v > 300) { toast('Bitte ein Gewicht zwischen 30 und 300 kg eingeben.'); return; }
    upsertByDate(S('weights').list, { date, v: Math.round(v * 10) / 10 }); Store.save('weights'); render(); toast('Gewicht gespeichert.');
  } else if (kind === 'measure') {
    const date = isDate(g('date')) ? g('date') : today(); const m = { date }; let any = false;
    MEASURES.forEach(([k]) => { const v = pf(g(k)); if (v != null && v > 5 && v < 300) { m[k] = Math.round(v * 10) / 10; any = true; } });
    if (!any) { toast('Bitte mindestens ein Maß eingeben.'); return; }
    upsertByDate(S('measures').list, m); Store.save('measures'); render(); toast('Maße gespeichert.');
  } else if (kind === 'food') {
    const name = String(g('name') || '').trim().slice(0, 60); const kcal = pf(g('kcal')); const p = pf(g('p')) || 0; const meal = MEALS.includes(g('meal')) ? g('meal') : 'Snacks';
    if (!name || kcal == null || kcal < 0 || kcal > 5000) { toast('Bitte Name und kcal (0–5000) eingeben.'); return; }
    ui.meal = meal;
    foodDay(ui.foodDate).entries.push({ id: uid(), meal, name, kcal: Math.round(kcal), p: Math.round(clamp(p, 0, 300)) }); Store.save('food-' + ui.foodDate);
    if (g('save')) { const L = S('foods').list; if (!L.some(x => x.name === name)) { L.push({ name, kcal: Math.round(kcal), p: Math.round(clamp(p, 0, 300)) }); Store.save('foods'); } }
    render(); toast(`${name} hinzugefügt.`);
  } else if (kind === 'profile') {
    const p = S('profile');
    p.name = String(g('name') || '').trim().slice(0, 30);
    p.sex = ['m', 'w'].includes(g('sex')) ? g('sex') : '';
    const num = (k, lo, hi) => { const v = pf(g(k)); return v != null && v >= lo && v <= hi ? v : null; };
    p.age = num('age', 14, 100); p.height = num('height', 120, 230); p.weight = num('weight', 30, 300); p.goalWeight = num('goalWeight', 30, 300);
    p.activity = ['1.3', '1.45', '1.6'].includes(g('activity')) ? g('activity') : '1.45';
    p.start = isDate(g('start')) ? g('start') : today();
    Store.save('profile');
    if (p.weight && !S('weights').list.length) { S('weights').list.push({ date: p.start <= today() ? p.start : today(), v: p.weight }); Store.save('weights'); }
    render(); toast('Profil gespeichert.');
  } else if (kind === 'log') {
    const L = ui.pendingLog; if (!L) return;
    const date = isDate(g('date')) && g('date') <= today() ? g('date') : today();
    S('workouts').list.push({ id: uid(), date, w: L.w, phase: L.phase, rounds: L.rounds, min: L.min, feel: ui.feel || '', note: String(g('note') || '').slice(0, 300) });
    Store.save('workouts'); ui.pendingLog = null; closeModal(); render(); toast('Einheit gespeichert. Stark!');
  }
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !$('#player').hidden) wakeOn(); });
window.addEventListener('hashchange', route);

// ---------- Start ----------
(async function init() {
  await Store.init();
  try { await Photos.load(); } catch (e) { /* ohne Fotos weiter */ }
  route();
  if (!reduced) requestAnimationFrame(animate);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline-Modus nicht verfügbar */ });
  }
})();
