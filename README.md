# 📊 FinDash Pro — La nostra Dashboard Finanziaria

> *In questa repo sgraviamo con le cose di Claude* 🤝

---

## 🤔 Cos'è questo progetto?

**FinDash Pro** è una piccola applicazione web che abbiamo costruito per giocare con i dati finanziari in modo interattivo.
In parole semplici: inserisci i ticker di alcune azioni (tipo `AAPL`, `GOOGL`, `TSLA`…), premi un pulsante e l'app ti mostra **come potrebbe andare il tuo portafoglio** nel tempo, oppure **come distribuire i soldi** tra i vari titoli per massimizzare il rendimento.

Niente schemi complicati, niente abbonamenti — gira tutto in locale sul tuo computer.

---

## ✨ Cosa puoi fare

### 🎲 Simulazione Monte Carlo
Vuoi sapere come potrebbe andare il tuo portafoglio nei prossimi mesi o anni?
Questa sezione lancia migliaia di simulazioni basate sui dati storici delle azioni scelte e ti mostra una serie di scenari possibili: il migliore, il peggiore, e quello più probabile.

Puoi configurare:
- **Quali azioni** inserire nel portafoglio (es. Apple, Google, Tesla…)
- **Quanto investire** in ciascuna (es. 50% Apple, 30% Google, 20% Tesla)
- **Per quanti giorni** vuoi simulare (da 1 giorno a 10 anni)
- **Quante simulazioni** fare (da 1 a 10.000!)

Il risultato è un grafico con tutte le traiettorie possibili e alcune statistiche utili come:
- Rendimento atteso
- Perdita massima probabile (VaR al 95% e 99%)
- Scenario migliore e scenario peggiore

### 📐 Ottimizzazione del Portafoglio
Non sai come distribuire i soldi tra le varie azioni? Questa sezione fa il lavoro sporco per te.

L'app genera migliaia di combinazioni diverse di portafogli e trova quelle che offrono **il miglior rapporto rischio/rendimento** — la cosiddetta *frontiera efficiente*.

Ti vengono mostrati:
- Il portafoglio con il **massimo rendimento aggiustato per il rischio** (massimo Sharpe Ratio)
- Il portafoglio con la **minima volatilità** (cioè il più "tranquillo")
- Un grafico colorato con tutti i portafogli generati

---

## 🚀 Come si avvia

Hai bisogno di avere installati **Python 3.11+** e **Node.js**. Poi basta eseguire:

```bash
bash setup.sh
```

Lo script installa tutto il necessario da solo. Alla fine ti dirà come avviare il backend e il frontend separatamente.

In breve:
- Il **backend** (il cervello) gira sulla porta `8000`
- Il **frontend** (l'interfaccia grafica) gira sulla porta `3001`

Apri il browser su [http://localhost:3001](http://localhost:3001) e sei pronto!

---

## 🛠️ Con cosa è fatto

Senza scendere troppo nei dettagli tecnici:

| Parte | Tecnologia |
|-------|-----------|
| Interfaccia grafica | React (JavaScript) |
| Grafici | Recharts + SVG personalizzato |
| Logica di calcolo | Python (FastAPI) |
| Dati finanziari | Yahoo Finance (gratis!) |
| Simulazioni numeriche | NumPy, SciPy, Pandas |

---

## 📁 Com'è organizzato il progetto

```
Sesso-con-CLAUDE/
├── backend/          ← Il server Python con tutta la matematica
│   ├── main.py
│   └── requirements.txt
├── frontend/         ← L'interfaccia grafica in React
│   └── src/
│       └── components/
│           ├── MonteCarloTool.js      ← Simulazione
│           ├── PortfolioOptimizer.js  ← Ottimizzazione
│           └── ...
└── setup.sh          ← Script per avviare tutto
```

---

## 👥 Chi siamo

Un gruppo di amici che ama sperimentare con l'intelligenza artificiale e la finanza quantitativa — con l'aiuto di Claude 💙

---

*Fatto con ❤️ (e tanto caffè)*
