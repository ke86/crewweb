# VR CrewWeb Schema Tool

Ett bokmärkesverktyg för att visa schema och kompsaldo från CrewWeb.

## Installation

### 1. Ladda upp filerna till GitHub Pages

Ladda upp alla `.js`-filer till ditt repository `ke86.github.io/crewweb/`:

- `vr-loader.js`
- `vr-core.js`
- `vr-ui.js`
- `vr-schema.js`
- `vr-komp.js`
- `vr-daydetail.js`

### 2. Skapa bokmärket

Skapa ett nytt bokmärke i din webbläsare med följande kod som URL:

```javascript
javascript:(function(){var H='vrHeader',S='vrScript';if(document.getElementById(H)){['vrHeader','vrView','vrLoader','vrDetail'].forEach(function(x){var e=document.getElementById(x);if(e)e.remove()});document.body.style.paddingTop='';return}var s=document.createElement('script');s.id=S;s.src='https://ke86.github.io/crewweb/vr-loader.js?'+Date.now();document.body.appendChild(s)})();
```

### 3. Användning

1. Gå till CrewWeb i din webbläsare
2. Klicka på bokmärket
3. Använd knapparna för att visa Schema eller Kompsaldo
4. Klicka på bokmärket igen för att stänga verktyget

## Filer

| Fil | Storlek | Beskrivning |
|-----|---------|-------------|
| `vr-loader.js` | ~1 KB | Huvudladdare som laddar alla moduler |
| `vr-core.js` | ~5 KB | Hjälpfunktioner och konstanter |
| `vr-ui.js` | ~8 KB | UI-komponenter (header, loader, views) |
| `vr-schema.js` | ~6 KB | Schema-funktionalitet |
| `vr-komp.js` | ~5 KB | Kompsaldo-funktionalitet |
| `vr-daydetail.js` | ~8 KB | Dagdetaljer och kalenderexport |

## Funktioner

- 📅 **Schema**: Visa månadsschema med navigering
- ⏰ **Kompsaldo**: Visa aktuellt kompsaldo och historik
- 📱 **Responsiv**: Fungerar på både dator och mobil
- 📤 **Kalenderexport**: Exportera schema till .ics-fil
- 🎯 **Dagdetaljer**: Klicka på en dag för detaljerad vy

## Licens

MIT
