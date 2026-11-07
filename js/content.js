/* Bonaccia – testi. Ogni passo: t = testo (letto o mostrato), p = pausa in secondi dopo il testo. */
window.Bonaccia = window.Bonaccia || {};
window.Bonaccia.Content = {

  presets: [
    { id: 'pioggia', group: 'natura', name: 'Pioggia dalla finestra', desc: 'Pioggia sentita da dentro, scura e morbida. Quasi niente acuti.',
      layers: { rain: { on: true, vol: 0.8 } } },
    { id: 'onde', group: 'natura', name: 'Onde lente', desc: 'Il mare calmo che va e viene: il suono cambia piano, senza mai fermarsi.',
      layers: { waves: { on: true, vol: 0.85 } } },
    { id: 'ruscello', group: 'natura', name: 'Ruscello e campanelli', desc: 'Acqua che scorre, con qualche nota rada e morbida.',
      layers: { stream: { on: true, vol: 0.8 }, chimes: { on: true, vol: 0.4, density: 0.35 } } },
    { id: 'bosco', group: 'natura', realOnly: true, name: 'Bosco al mattino', desc: 'Aria, foglie e uccelli lontani.',
      layers: { bosco: { on: true, vol: 0.8 } } },
    { id: 'fontana', group: 'natura', realOnly: true, name: 'Fontana in un cortile', desc: 'Acqua che cade, con l’eco di un cortile. È il suono più chiaro e brillante: se ti fa salire il fruscio, scegline uno più scuro.',
      layers: { fontana: { on: true, vol: 0.8 } } },
    { id: 'drone', group: 'musica', realOnly: true, name: 'Suono lungo', desc: 'Un tappeto grave e continuo, quasi senza variazioni. Provalo a volume molto basso: è un suono con una nota, non un fruscio.',
      layers: { drone: { on: true, vol: 0.8 } } },
    { id: 'vento', group: 'natura', name: 'Vento tra gli alberi', desc: 'Un soffio lento, con un filo di ruscello.',
      layers: { wind: { on: true, vol: 0.8 }, stream: { on: true, vol: 0.18 } } },
    { id: 'notte', group: 'natura', name: 'Notte', desc: 'Mare lento con un soffio di vento. Pensato per addormentarsi.',
      layers: { waves: { on: true, vol: 0.7 }, wind: { on: true, vol: 0.2 } } },
    { id: 'morbido', group: 'rumore', name: 'Fruscio morbido', desc: 'Rumore rosa appena più chiaro. È il più simile a un fruscio, quindi il più facile da far fondere con il tuo.',
      layers: { noise: { on: true, vol: 0.8, color: 'pink', tilt: 0.25 } } },
    { id: 'velato', group: 'rumore', name: 'Fruscio velato', desc: 'Rumore marrone, più caldo e grave: più dolce per l’ascolto lungo.',
      layers: { noise: { on: true, vol: 0.85, color: 'brown', tilt: -0.1, breath: true } } }
  ],

  presetGroups: { natura: 'Natura', musica: 'Suono continuo', rumore: 'Rumori' },

  layerLabels: {
    noise: 'Fruscio', waves: 'Onde', rain: 'Pioggia', stream: 'Ruscello', wind: 'Vento', chimes: 'Campanelli',
    fontana: 'Fontana', bosco: 'Bosco', drone: 'Suono lungo'
  },

  checklist: [
    'Niente caffè, tè o bibite con caffeina nelle ultime 3 o 4 ore',
    'Camera senza TV, computer e cibo; nessun orologio a portata di sguardo',
    'Un gesto che dice al corpo «ora si rallenta»: bagno caldo un’ora e mezza prima, luce bassa, qualcosa di tranquillo',
    'Le preoccupazioni sono già state scritte nel pomeriggio (vedi «Il quarto d’ora delle preoccupazioni»)',
    'Suono di sottofondo pronto, a un livello comodo'
  ],

  /* ---------- sessioni guidate ---------- */
  sessions: [
    {
      id: 'spalle', title: 'Le spalle che scendono', minutes: 4,
      desc: 'Per quando ti accorgi del fruscio proprio perché ti sei rilassata. Lo guardiamo senza inseguirlo.',
      steps: [
        { t: 'Siediti o sdraiati dove stai comoda. Gli occhi possono restare aperti, se ti fa stare meglio.', p: 4 },
        { t: 'Fai tre respiri lenti. Inspira dal naso, e lascia uscire l’aria dalla bocca, piano.', p: 14 },
        { t: 'Porta l’attenzione alle spalle. Sollevale verso le orecchie, senza forzare, e tienile su qualche secondo.', p: 6 },
        { t: 'Adesso lasciale cadere. Senti il loro peso che scende.', p: 10 },
        { t: 'Capita spesso che, quando il corpo si distende, il fruscio si faccia notare. Non è peggiorato: era già lì, e adesso lo noti.', p: 6 },
        { t: 'Non devi farlo smettere e non devi seguirlo. Riconosci che c’è, come un rumore in fondo a una stanza, e torna al respiro.', p: 12 },
        { t: 'Lascia andare la mandibola. I denti si staccano, la lingua si appoggia in basso.', p: 8 },
        { t: 'Lascia andare la fronte e gli occhi. Le sopracciglia si distendono.', p: 8 },
        { t: 'Ancora un respiro lungo. Con l’espiro, le spalle scendono ancora un poco.', p: 12 },
        { t: 'Quando vuoi, apri gli occhi e guardati intorno. Porta con te questa morbidezza.', p: 4 }
      ]
    },
    {
      id: 'scansione', title: 'Scansione del corpo', minutes: 9,
      desc: 'Un giro lento dai piedi alla testa. Ottima prima di dormire.',
      steps: [
        { t: 'Mettiti sdraiata, comoda. Puoi chiudere gli occhi, oppure lasciarli aperti con lo sguardo morbido.', p: 5 },
        { t: 'Fai cinque respiri profondi. Inspira, ed espira lasciando andare. Se vuoi, pensa la parola «rilassa» mentre espiri.', p: 28 },
        { t: 'Nota come sei appoggiata: il peso a destra e a sinistra, i punti dove il corpo tocca il letto. Aggiusta la posizione se serve.', p: 12 },
        { t: 'Se senti dei suoni, compreso il fruscio, riconoscili un momento: ci sono. Poi riporta l’attenzione al respiro.', p: 10 },
        { t: 'Ora fai un giro del corpo, partendo dai piedi. Senti le dita, le piante, le caviglie. Non cambiare niente, osserva soltanto.', p: 18 },
        { t: 'Sali ai polpacci e alle ginocchia. Poi alle cosce. Dove c’è tensione, nota la tensione e vai avanti.', p: 18 },
        { t: 'Il bacino e la parte bassa della schiena. Lascia che il peso si affidi al materasso.', p: 16 },
        { t: 'La pancia che sale e scende con il respiro. Non guidarlo, lascialo fare.', p: 16 },
        { t: 'Il petto e la schiena in alto. Le costole che si allargano e si richiudono.', p: 16 },
        { t: 'Le mani, le braccia, i gomiti. Poi le spalle: lasciale scendere.', p: 18 },
        { t: 'Il collo e la gola. Poi la mandibola, le guance, la bocca.', p: 16 },
        { t: 'Gli occhi, la fronte, la testa. Tutta la testa, fino alla nuca.', p: 16 },
        { t: 'Rifai il giro in fretta, dai piedi alla testa, notando che cosa è cambiato.', p: 28 },
        { t: 'Non c’è bisogno di addormentarsi adesso. Resta ancora un momento con il respiro.', p: 14 },
        { t: 'Quando sei pronta, muovi piano le dita di mani e piedi. Questa pausa è tua.', p: 4 }
      ]
    },
    {
      id: 'muscolare', title: 'Rilassamento muscolare progressivo', minutes: 8,
      desc: 'Cinque gruppi di muscoli: li tendi con dolcezza, poi li lasci. Fa sentire la differenza.',
      steps: [
        { t: 'Mettiti comoda. Fai cinque respiri profondi, pensando «rilassa» mentre espiri.', p: 26 },
        { t: 'Per ogni gruppo di muscoli: tensione leggera, mai dolorosa, per dieci secondi. Se qualcosa fa male, salta quel passo.', p: 5 },
        { t: 'Prima le braccia. Chiudi i pugni e tendi entrambe le braccia. Pensa «tendi».', p: 10 },
        { t: 'Lascia andare, e respira. Pensa «rilassa» e senti le braccia che si fanno pesanti.', p: 16 },
        { t: 'Ora il viso, il collo e la gola. Increspa leggermente il viso, senza stringere troppo. Tieni.', p: 10 },
        { t: 'Lascia andare. Senti la differenza tra prima e dopo.', p: 16 },
        { t: 'Le spalle e il petto. Porta le spalle verso le orecchie e inspira piano. Tieni.', p: 10 },
        { t: 'Lascia andare, ed espira lentamente.', p: 16 },
        { t: 'La schiena e la pancia. Irrigidisci la pancia con delicatezza. Tieni.', p: 10 },
        { t: 'Lascia andare. Il respiro torna da solo.', p: 16 },
        { t: 'Infine le gambe e i piedi. Tendi le cosce e porta le punte dei piedi verso di te. Tieni.', p: 10 },
        { t: 'Lascia andare tutto. Senti il corpo appoggiato, pesante.', p: 20 },
        { t: 'Un ultimo respiro lungo. Rilascia ogni tensione rimasta.', p: 10 }
      ]
    },
    {
      id: 'spiaggia', title: 'Immaginazione: la spiaggia', minutes: 5,
      desc: 'Un luogo da abitare con tutti e cinque i sensi.',
      steps: [
        { t: 'Chiudi gli occhi e mettiti comoda. Pensa a una spiaggia, magari una in cui sei stata davvero.', p: 8 },
        { t: 'Guarda l’acqua azzurra, il cielo, qualche uccello che passa in alto. Sotto di te c’è la sabbia.', p: 14 },
        { t: 'Porta l’attenzione ai piedi. Sono nella sabbia calda: muovili, scavali un poco, senti la sabbia che scivola.', p: 16 },
        { t: 'Ascolta le onde che arrivano e si ritirano. Lontano, il verso degli uccelli.', p: 16 },
        { t: 'Senti l’odore del mare, l’aria salata sulla pelle, il sole tiepido sulle spalle.', p: 16 },
        { t: 'Resta qui. Se i pensieri vanno altrove, riportali con gentilezza alla spiaggia.', p: 24 },
        { t: 'Quando sei pronta, riapri piano gli occhi e guardati intorno. La spiaggia resta con te.', p: 4 }
      ]
    },
    {
      id: 'bosco', title: 'Immaginazione: il bosco', minutes: 5,
      desc: 'Un’alternativa alla spiaggia, più fresca e silenziosa.',
      steps: [
        { t: 'Chiudi gli occhi e mettiti comoda. Immagina l’inizio di un sentiero in un bosco.', p: 8 },
        { t: 'Guarda i tronchi, il muschio, la luce che filtra tra i rami e disegna macchie sul terreno.', p: 14 },
        { t: 'Cammina piano. Senti sotto i piedi la terra morbida e le foglie.', p: 16 },
        { t: 'Ascolta il vento tra gli alberi, un ruscello poco lontano, ogni tanto un uccello.', p: 16 },
        { t: 'Senti l’odore della terra umida e della resina. L’aria è fresca, ti fa bene respirare.', p: 16 },
        { t: 'Trova un posto dove sederti, e restaci. Se i pensieri vanno altrove, riportali al bosco.', p: 24 },
        { t: 'Quando sei pronta, riapri piano gli occhi. Il bosco resta dove l’hai lasciato.', p: 4 }
      ]
    },
    {
      id: 'ascolto', title: 'Ascoltare senza combattere', minutes: 5,
      desc: 'Un esercizio di consapevolezza: notare il fruscio e tutto il resto, senza giudicare. Se ti agita, saltalo.',
      steps: [
        { t: 'Siediti comoda, con gli occhi aperti o chiusi. Fai tre respiri lenti. Questo esercizio non vuole ottenere niente: serve solo a notare.', p: 20 },
        { t: 'Ascolta i suoni intorno a te. Prima i più lontani, poi i più vicini.', p: 20 },
        { t: 'Può darsi che tu senta anche il tuo fruscio. Se c’è, riconoscilo: c’è. Non devi cambiarlo né spiegarlo.', p: 16 },
        { t: 'Se la mente dice «è fastidioso», nota anche questo: è un pensiero. Lascialo passare come una nuvola.', p: 16 },
        { t: 'Torna al respiro. Quando il fruscio ti riporta la sua attenzione, riconoscilo di nuovo, poi respira.', p: 24 },
        { t: 'Allarga l’ascolto a tutta la stanza, come se fosse un’unica musica di cose diverse.', p: 22 },
        { t: 'Se a un certo punto ti agiti, fermati e fai qualcosa di concreto: bevi un po’ d’acqua, guarda fuori, ascolta un suono vero.', p: 10 },
        { t: 'Bene così. Riapri gli occhi quando vuoi.', p: 4 }
      ]
    },
    {
      id: 'mondo', title: 'Ascolto del mondo', minutes: 3,
      desc: 'Per quando il fruscio ha il primo piano: sposti l’ascolto verso fuori.',
      steps: [
        { t: 'Fermati un momento. Non importa dove sei. Fai un respiro lento.', p: 10 },
        { t: 'Cerca tre suoni veri intorno a te. Un motore lontano, una voce, un tintinnio, il vento, un elettrodomestico.', p: 16 },
        { t: 'Scegli il più lontano. Seguilo con l’attenzione, come se lo inseguissi con l’orecchio.', p: 14 },
        { t: 'Ora scegline uno vicino. Com’è fatto? Acuto o grave, continuo o a colpi, morbido o duro?', p: 16 },
        { t: 'Cerca un suono che non avevi notato prima.', p: 16 },
        { t: 'Il fruscio può esserci: è uno dei suoni. Il resto è lì insieme a lui, non al suo posto.', p: 12 },
        { t: 'Un ultimo respiro. Riprendi quello che stavi facendo.', p: 3 }
      ]
    },
    {
      id: 'pausa', title: 'Pausa di un minuto', minutes: 1,
      desc: 'Quando serve solo un attimo.',
      steps: [
        { t: 'Appoggia i piedi a terra. Senti il peso del corpo.', p: 6 },
        { t: 'Un respiro lento dal naso. Espira più a lungo di quanto hai inspirato.', p: 10 },
        { t: 'Lascia cadere le spalle. Distendi la mandibola.', p: 8 },
        { t: 'Ancora un respiro lungo. Il fruscio può restare: tu torni qui.', p: 10 }
      ]
    }
  ],

  breathing: [
    { id: 'dolce', name: 'Dolce 4 e 6', in: 4, hold: 0, out: 6, desc: 'Espiro più lungo dell’inspiro: calma il corpo.' },
    { id: 'lenta', name: 'Lenta 5 e 5', in: 5, hold: 0, out: 5, desc: 'Sei respiri al minuto, regolari.' },
    { id: 'lunga', name: 'Lunga 4 e 8', in: 4, hold: 0, out: 8, desc: 'Per quando sei molto tesa o prima di dormire.' }
  ],

  /* ---------- schede «Capire» ---------- */
  capire: [
    {
      id: 'rilassi', title: 'Perché lo senti quando ti rilassi',
      html: '<p>Il cervello tende a mettere da parte i suoni che non cambiano mai. Quando sei in tensione o presa da qualcosa, l’attenzione è altrove e il fruscio resta sullo sfondo. Appena ti rilassi, o appena fa silenzio, l’attenzione si libera e lo trova. Per questo hai la sensazione che compaia o che salga.</p><p>È la stessa cosa delle spalle che ti accorgi di aver tenuto contratte solo quando le lasci andare: il fruscio c’era già prima, e la sensazione di “più alto” è il contrasto. È una spiegazione molto comune, anche se non puoi verificarla da sola dall’interno: se dopo una serata calma ti sembra aumentato per giorni, annotalo nel diario e parlane con chi ti segue.</p><p>I testi clinici lo descrivono così: l’acufene dà più fastidio nel silenzio e meno quando c’è un altro suono.</p>'
    },
    {
      id: 'silenzio', title: 'Perché il silenzio pesa',
      html: '<p>In silenzio il fruscio resta l’unica cosa da ascoltare, e l’orecchio lo mette in primo piano. I libri di riferimento (Tyler, Baguley, Møller) consigliano di <strong>evitare il silenzio</strong> e di tenere un suono di sottofondo, basso, anche di notte.</p><p>Il suono non deve coprire tutto. Il livello suggerito è quello in cui i due suoni si fondono: senti ancora il tuo fruscio, ma non è più solo. È il «punto d’incontro» che trovi nella scheda <em>Suoni</em>.</p><p><strong>Se un suono uniforme ti fa salire il fruscio</strong> (a qualcuno succede con il rumore bianco o con i fruscii costanti), non insistere: un suono che somiglia al tuo può “rinforzarlo”. Passa a suoni che cambiano, come pioggia, onde, ruscello o fontana, a volume molto basso, e segna nel diario come va. Gli studi dicono che non esiste un suono migliore per tutti: conta quello che funziona per te.</p>'
    },
    {
      id: 'rumore', title: 'Perché i posti rumorosi lo fanno salire',
      html: '<p>Sono due cose diverse.</p><p><strong>Il rumore forte</strong> può far salire l’acufene per un po’, perché affatica l’orecchio. Nei posti davvero forti (concerti, locali, cantieri, moto) usa una protezione. Meglio filtri “per musicisti” che abbassano senza chiudere, così continui a sentire le voci.</p><p><strong>Il caos</strong> (voci sovrapposte, luci, fretta) mette il corpo in allerta, e quando l’allerta sale il fruscio pesa di più. Qui non conta tanto il volume quanto la tensione.</p><p>Un avvertimento dei testi: <strong>non portare tappi tutto il giorno</strong>. Possono far sembrare l’acufene più forte mentre li hai e abituare l’orecchio a sentire meno, il che peggiora la tolleranza ai suoni. Vanno bene per i momenti davvero forti, e basta.</p>'
    },
    {
      id: 'mezzo', title: 'La via di mezzo',
      html: '<p>Tu oscilli tra due estremi senza trovare pace: il silenzio, dove il fruscio emerge, e gli ambienti rumorosi, dove sale. La via di mezzo è un livello intermedio e costante.</p><ul><li><strong>A casa:</strong> tieni un suono basso quasi sempre, nel tuo punto d’incontro. Non spegnerlo per “vedere come va”.</li><li><strong>Fuori, in mezzo al rumore:</strong> non alzare il suono per coprire. Fai pause brevi in un posto più calmo con un suono morbido, poi riparti.</li><li><strong>Quando ti rilassi:</strong> abbina il rilassamento a un suono morbido. Se il fruscio si fa notare, ricordati che è il contrasto, non un peggioramento.</li><li><strong>Allenare la tolleranza:</strong> col tempo il cervello impara a dare meno peso al fruscio. Non è questione di giorni, ma di settimane di piccole abitudini.</li></ul>'
    },
    {
      id: 'evidenze', title: 'Cosa aiuta davvero (e cosa no)',
      html: '<p><strong>Non esiste una cura</strong> che faccia sparire l’acufene. Gli interventi servono a ridurre il disagio e l’impatto sulla vita.</p><ul><li><strong>Terapia cognitivo-comportamentale (CBT):</strong> è l’intervento con le prove più solide, raccomandato dalla linea guida europea 2019, da NICE e dall’AAO-HNS. Se il fastidio è alto, è la strada da chiedere a uno psicologo o a un servizio di audiologia.</li><li><strong>Terapia sonora:</strong> è un’opzione. Una revisione Cochrane del 2018 non ha trovato un suono superiore agli altri, né prove che superi la sola informazione. Funziona meglio dentro un percorso, non da sola. Per questo Bonaccia ti fa provare più suoni e annotare l’effetto.</li><li><strong>Apparecchi acustici:</strong> servono quando c’è un calo dell’udito. Non è il tuo caso, ma vale una visita audiologica di controllo se non l’hai fatta.</li><li><strong>Da non usare:</strong> farmaci o integratori “per l’acufene” (ginkgo, melatonina e simili) non hanno prove; la stimolazione magnetica (rTMS) è sconsigliata.</li><li><strong>Musica “con il buco” (notched):</strong> non ha mostrato vantaggi sul disagio in diverse meta-analisi, quindi non l’ho inclusa.</li></ul>'
    },
    {
      id: 'sonno', title: 'Il sonno e l’acufene',
      html: '<p>Solo circa la metà di chi frequenta una clinica per l’acufene ha problemi di sonno, e secondo gli autori di uno dei testi l’acufene da solo non sveglia: ci si sveglia agli orari tipici dei cicli del sonno, e una volta svegli il fruscio è la prima cosa che si nota. Poi arrivano la preoccupazione e il circolo vizioso: <em>“non mi riaddormento, domani sarà un disastro”</em>.</p><p>Quello che aiuta, secondo i testi: un suono basso e non stimolante (niente TV, né radio con notiziari), niente orologio visibile, andare a letto quando si ha sonno, alzarsi alla stessa ora, e se dopo 15 o 20 minuti non si dorme, alzarsi e fare qualcosa di tranquillo a luce bassa. Servono almeno tre settimane perché le nuove abitudini si fissino.</p>'
    },
    {
      id: 'medico', title: 'Quando parlarne con un medico',
      html: '<p>Bonaccia non è un dispositivo medico e non sostituisce una visita. Chiama il medico o l’ORL se:</p><ul><li>il suono <strong>pulsa</strong> a tempo con il battito;</li><li>lo senti <strong>da un solo lato</strong>, o è comparso all’improvviso;</li><li>l’udito <strong>cala di colpo</strong>, o hai un orecchio “ovattato” che non passa;</li><li>hai <strong>vertigini</strong>, dolore all’orecchio o secrezioni;</li><li>il fruscio ti toglie il sonno o la serenità per settimane, oppure ti fa venire pensieri di farti del male. In questo caso non aspettare: parlane subito con un medico o con una persona di fiducia.</li></ul>'
    },
    {
      id: 'iphone', title: 'Usare Bonaccia sull’iPhone',
      html: '<ul><li><strong>Installala:</strong> in Safari tocca Condividi, poi «Aggiungi a Home». Si apre a tutto schermo e funziona anche senza rete, tranne le recitazioni: arrivano da Internet, a meno che tu abbia salvato quella Sura sul telefono.</li><li><strong>Blocco schermo:</strong> il suono dovrebbe continuare. Se si ferma, tieni lo schermo acceso con la modalità «Buonanotte» (schermo nero) nella scheda <em>Sonno</em>.</li><li><strong>Interruttore laterale:</strong> in silenzioso il suono dovrebbe comunque uscire. Se non esce, alza il volume con i tasti.</li><li><strong>Volume del telefono:</strong> regolalo una volta a metà e poi usa la barra di Bonaccia. Se lo cambi, rifai la taratura.</li><li><strong>Anche Apple ha i suoi suoni:</strong> in Impostazioni, Accessibilità, cerca «Suoni di sottofondo» (rumore bianco, pioggia, oceano).</li><li><strong>Auricolari:</strong> meglio quelli aperti o con la modalità «Ambiente» che lascia entrare i suoni intorno, così non ti isoli.</li></ul>'
    },
    {
      id: 'suoni', title: 'Da dove vengono i suoni e la voce',
      html: '<ul><li><strong>Pioggia, mare, fiume, fontana, bosco, suono lungo:</strong> sono registrazioni vere, con licenza libera (CC0), prese da Freesound.org e preparate per questo uso: un minuto di registrazione (il suono lungo è tutto il brano, 80 secondi), livello uniforme, picchi limitati. Gli autori si trovano su Freesound con questi numeri: 392304 (pioggia), 578524 (mare), 730149 (fiume), 460559 (fontana), 844605 (bosco), 636566 (suono lungo).</li><li><strong>Rumori, vento e campanelli:</strong> li genera il telefono sul momento, quindi non pesano e funzionano senza rete. Se vuoi, puoi scegliere «Sintetici» per usare solo quelli.</li><li><strong>Recitazioni coraniche:</strong> sono registrazioni di recitatori veri, in streaming da MP3Quran (mp3quran.net), un servizio pubblico gratuito. Per ascoltarle serve la rete, salvo le Sure che salvi sul telefono. I livelli sono pareggiati da Bonaccia.</li><li><strong>Voce guida:</strong> è una voce di sintesi vocale (Gemini), rallentata e addolcita, che legge i testi degli esercizi. Non è la registrazione di una persona.</li></ul>'
    },
    {
      id: 'fonti', title: 'Fonti',
      html: '<p>Le indicazioni vengono dai tre testi di riferimento sull’acufene e dalle linee guida:</p><ul><li>Schlee W. et al. (a cura di), <em>Textbook of Tinnitus</em>, 2ª ed., Springer 2024.</li><li>Baguley D., Andersson G., McFerran D., McKenna L., <em>Tinnitus: A Multidisciplinary Approach</em>, 2ª ed., Wiley-Blackwell 2013.</li><li>Tyler R.S., Perreau A. (a cura di), <em>Tinnitus Treatment: Clinical Protocols</em>, 2ª ed., Thieme 2022 (cap. 6, 8, 10 e appendici 4.5 e 6.1).</li><li>Cima R. et al., linea guida europea multidisciplinare, <em>HNO</em> 2019.</li><li>NICE NG155 (2020), AAO-HNS (2014 e aggiornamento 2026).</li><li>Sereda M. et al., revisione Cochrane sulla terapia sonora, 2018.</li></ul><p>Gli esercizi guidati sono scritti con parole nostre, ispirandosi ai protocolli di rilassamento, immaginazione e consapevolezza descritti da Tyler e Perreau (cap. 10) e da Henry e Wilson.</p>'
    }
  ],

  /* consigli «Sono in mezzo al rumore» */
  fuori: [
    'Non alzare il suono per competere con il rumore: si somma al caos e stanca. Meglio abbassare e fare una pausa.',
    'Se usi gli auricolari, scegli la modalità «Ambiente» (o aperti), così senti anche il mondo intorno.',
    'Nei posti davvero forti, usa tappi per musicisti. Tienili solo per quei momenti, non tutto il giorno.',
    'Cerca una pausa breve in un posto più calmo (un corridoio, un cortile): non il silenzio assoluto, ma un suono morbido.',
    'Se senti il fruscio salire, ricordati che in mezzo al caos conta la tensione: lascia cadere le spalle e allunga l’espiro.'
  ]
};
