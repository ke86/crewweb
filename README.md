# VR CrewWeb Schema Tool

Ett bokmärkesverktyg för att visa schema och kompsaldo från CrewWeb.

## Skapa bokmärket

Skapa ett nytt bokmärke i din webbläsare med följande kod som URL:

```javascript
javascript:(function(){var H='vrHeader',S='vrScript';if(document.getElementById(H)){['vrHeader','vrView','vrLoader','vrDetail'].forEach(function(x){var e=document.getElementById(x);if(e)e.remove()});document.body.style.paddingTop='';return}var s=document.createElement('script');s.id=S;s.src='https://ke86.github.io/crewweb/vr-loader.js?'+Date.now();document.body.appendChild(s)})();
```

## Användning

1. Gå till CrewWeb i din webbläsare och logga in.
2. Klicka på bokmärket

## Funktioner

- 📅 **Schema**: Visa månadsschema med navigering
- ⏰ **Komp**: Visa aktuellt kompsaldo och historik
- 🌙 **OB**: Visa OB-tillägg med månadssammanfattning
- 🏠 **Frånvaro**: Visa VAB och föräldraledighet
- 🏖️ **FP/FPV**: Visa fridagar och FPV
- 👤 **Anställddata**: Visa kvalifikationer och giltighetstider
- 📤 **Kalenderexport**: Exportera schema till .ics-fil
- 🎯 **Dagdetaljer**: Klicka på en dag för detaljerad vy
- 📱 **Responsiv**: Fungerar på både dator och mobil

## Filer

| Fil | Beskrivning |
|-----|-------------|
| `vr-loader.js` | Huvudladdare som laddar alla moduler |
| `vr-core.js` | Hjälpfunktioner och konstanter |
| `vr-ui.js` | UI-komponenter (header, meny, loader) |
| `vr-schema.js` | Schema-funktionalitet |
| `vr-komp.js` | Kompsaldo-funktionalitet |
| `vr-lone.js` | Delade funktioner för löneredovisningar |
| `vr-ob.js` | OB-tillägg |
| `vr-franvaro.js` | Frånvaro (VAB, Föräldraledig) |
| `vr-fpfpv.js` | FP/FPV (Fridagar) |
| `vr-anstalld.js` | Anställddata och kvalifikationer |
| `vr-daydetail.js` | Dagdetaljer och kalenderexport |

## Licens

MIT
