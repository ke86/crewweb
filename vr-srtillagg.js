// VR CrewWeb - SR-Tillägg (Danmark-tillägg)
(function() {
    'use strict';

    var VR = window.VR;

    // Storage for SR data (unique per date)
    VR.srData = {};

    // Detected rate from first Danmark tour (persists across loads)
    VR.detectedSRRate = null;

    // ===== MAIN SR-TILLÄGG FUNCTION =====
    VR.doSRTillagg = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar SR-Tillägg');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on workdays page
        var tbl = document.querySelector('#workdays table');
        if (tbl) {
            VR.updateLoader(40, 'Sidan redan laddad...');
            VR.showSRView();
            return;
        }

        // Navigate to Arbetsdag
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Arbetsdag...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Arbetsdag');
                if (el) {
                    VR.stopTimer();
                    VR.updateLoader(20, 'Klickar på Arbetsdag...');
                    el.click();
                    VR.waitForSRPage();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR PAGE =====
    VR.waitForSRPage = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var tbl = document.querySelector('#workdays table');
            if (tbl) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(VR.showSRView, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== GET SR DATA AS ARRAY =====
    VR.getSRDataArray = function() {
        var arr = [];
        for (var key in VR.srData) {
            if (VR.srData.hasOwnProperty(key)) {
                arr.push(VR.srData[key]);
            }
        }
        return arr;
    };

    // ===== SHOW SR VIEW =====
    VR.showSRView = function() {
        VR.hideLoader();

        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        var monthNames = VR.MONTHS;
        var rate = VR.detectedSRRate || 0;

        // Get stored data for display
        var allData = VR.getSRDataArray();
        var prevMonthData = allData.filter(function(d) {
            return d.month === prevMonth && d.year === prevYear;
        });
        var currentMonthData = allData.filter(function(d) {
            return d.month === currentMonth && d.year === currentYear;
        });

        var prevTotal = prevMonthData.length * rate;
        var currentTotal = currentMonthData.length * rate;

        var html = '';

        // Summary boxes (like OB)
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';

        html += '<div style="background:#fff;border-radius:16px;padding:14px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;margin-bottom:4px">🇩🇰</div>';
        html += '<div style="font-size:12px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' + monthNames[prevMonth] + '</div>';
        html += '<div style="font-size:14px;color:#666;margin-bottom:2px">' + prevMonthData.length + ' dagar</div>';
        html += '<div style="font-size:24px;font-weight:700;color:#333">' + prevTotal + ' kr</div>';
        html += '</div>';

        html += '<div style="background:#fff;border-radius:16px;padding:14px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;margin-bottom:4px">🇩🇰</div>';
        html += '<div style="font-size:12px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' + monthNames[currentMonth] + '</div>';
        html += '<div style="font-size:14px;color:#666;margin-bottom:2px">' + currentMonthData.length + ' dagar</div>';
        html += '<div style="font-size:24px;font-weight:700;color:#C41E3A">' + currentTotal + ' kr</div>';
        html += '</div>';

        html += '</div>';

        // Load buttons
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';

        html += '<button id="vrLoadSRPrev" style="padding:16px 20px;border-radius:16px;border:none;background:linear-gradient(135deg,#666,#888);color:#fff;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2)">';
        html += '<span>🔄</span> Ladda ' + monthNames[prevMonth];
        html += '</button>';

        html += '<button id="vrLoadSRCurrent" style="padding:16px 20px;border-radius:16px;border:none;background:linear-gradient(135deg,#C41E3A,#DC143C);color:#fff;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(196,30,58,0.3)">';
        html += '<span>🔄</span> Ladda ' + monthNames[currentMonth];
        html += '</button>';

        html += '</div>';

        // Data table
        if (allData.length > 0) {
            html += VR.buildSRTable();
        } else {
            html += '<div style="background:#fff;border-radius:20px;padding:40px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
            html += '<div style="font-size:48px;margin-bottom:16px">🇩🇰</div>';
            html += '<div style="font-size:18px;color:#666">Klicka på knapparna ovan för att ladda SR-Tillägg</div>';
            if (VR.detectedSRRate) {
                html += '<div style="font-size:14px;color:#999;margin-top:8px">' + VR.detectedSRRate + ' kr per dag (' + (VR.userRole || 'Okänd roll') + ')</div>';
            } else {
                html += '<div style="font-size:14px;color:#999;margin-top:8px">Rate detekteras automatiskt från turnummer</div>';
            }
            html += '</div>';
        }

        VR.showView('', '', html);

        // Attach button listeners
        var now2 = new Date();
        var loadPrevBtn = document.getElementById('vrLoadSRPrev');
        var loadCurrentBtn = document.getElementById('vrLoadSRCurrent');

        if (loadPrevBtn) {
            loadPrevBtn.onclick = function() {
                var pm = now2.getMonth() === 0 ? 11 : now2.getMonth() - 1;
                var py = now2.getMonth() === 0 ? now2.getFullYear() - 1 : now2.getFullYear();
                VR.loadSRMonth(py, pm);
            };
        }
        if (loadCurrentBtn) {
            loadCurrentBtn.onclick = function() {
                VR.loadSRMonth(now2.getFullYear(), now2.getMonth());
            };
        }
    };

    // ===== BUILD SR TABLE =====
    VR.buildSRTable = function() {
        var rate = VR.detectedSRRate || 0;
        var allData = VR.getSRDataArray();

        var html = '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Header
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Tur</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        // Sort by date descending
        var sorted = allData.slice().sort(function(a, b) {
            return new Date(b.year, b.month, b.day) - new Date(a.year, a.month, a.day);
        });

        for (var i = 0; i < sorted.length; i++) {
            var row = sorted[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';
            var sourceIcon = row.source === 'tour' ? ' 🇩🇰' : (row.source === 'expanded' ? ' 📍' : '');

            html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.dateStr + '</div>';
            html += '<div style="font-size:15px;color:#333">' + row.tur + sourceIcon + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#C41E3A;text-align:right">' + rate + ' kr</div>';
            html += '</div>';
        }

        // Total row
        var total = allData.length * rate;
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:16px 20px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:16px;font-weight:700;color:#333">Totalt</div>';
        html += '<div style="font-size:16px;color:#666">' + allData.length + ' dagar</div>';
        html += '<div style="font-size:16px;font-weight:700;color:#C41E3A;text-align:right">' + total + ' kr</div>';
        html += '</div>';

        html += '</div>';
        return html;
    };

    // ===== LOAD SR MONTH =====
    VR.loadSRMonth = function(year, month) {
        VR.showLoader('Laddar SR-Tillägg');
        VR.updateLoader(5, 'Förbereder ' + VR.MONTHS[month] + '...');

        var d1 = '01-' + ('0' + (month + 1)).slice(-2) + '-' + year;
        var lastDay = new Date(year, month + 1, 0).getDate();
        var d2 = lastDay + '-' + ('0' + (month + 1)).slice(-2) + '-' + year;

        VR.setDates(d1, d2);
        VR.updateLoader(10, 'Sätter datum...');
        VR.clickFetch();

        // Store which month we're loading
        VR.srLoadingYear = year;
        VR.srLoadingMonth = month;

        // Poll for data like Schema does
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(15 + n * 2, 'Laddar data...');

            var rows = document.querySelectorAll('#workdays table tr');
            if (rows.length > 5 || n > 25) {
                VR.stopTimer();
                VR.updateLoader(50, 'Analyserar...');
                setTimeout(VR.parseSRData, 300);
            }
        }, 400);
    };

    // ===== PARSE SR DATA (using same logic as Schema) =====
    VR.parseSRData = function() {
        var tbl = document.querySelector('#workdays table');
        if (!tbl) {
            VR.updateLoader(0, 'Ingen tabell hittades');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        VR.updateLoader(55, 'Läser in data...');

        var rows = tbl.querySelectorAll('tr');
        console.log('VR SR: Found ' + rows.length + ' rows in #workdays table');

        // DEBUG: Log first 3 rows to see column structure
        for (var dbg = 1; dbg < Math.min(4, rows.length); dbg++) {
            var dbgCells = rows[dbg].querySelectorAll('td');
            var colValues = [];
            for (var cc = 0; cc < dbgCells.length; cc++) {
                colValues.push('c[' + cc + ']=' + (dbgCells[cc].textContent.trim().substring(0, 15) || '(tom)'));
            }
            console.log('VR SR Row ' + dbg + ': ' + colValues.join(' | '));
        }

        var year = VR.srLoadingYear;
        var month = VR.srLoadingMonth;
        var currentDate = '';
        var dayEntries = {}; // Collect all entries per day

        // Parse all rows (same approach as Schema)
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) currentDate = dt;
            if (!currentDate) continue;

            var en = {
                tn: c[3] ? c[3].textContent.trim() : '',  // Passnamn = turnummer!
                sP: c[4] ? c[4].textContent.trim() : '',
                eP: c[5] ? c[5].textContent.trim() : '',
                isHeader: dt && dt.indexOf('-') > -1
            };

            if (!dayEntries[currentDate]) dayEntries[currentDate] = [];
            dayEntries[currentDate].push(en);
        }

        var dayCount = Object.keys(dayEntries).length;
        console.log('VR SR: Parsed ' + dayCount + ' unique days');
        VR.updateLoader(70, 'Analyserar ' + dayCount + ' dagar...');

        // Now check each day for Denmark
        var addedCount = 0;
        for (var dateKey in dayEntries) {
            if (!dayEntries.hasOwnProperty(dateKey)) continue;

            var entries = dayEntries[dateKey];
            var hasDenmark = false;
            var tourNumber = '';

            for (var j = 0; j < entries.length; j++) {
                var entry = entries[j];
                var tn = entry.tn;

                // Get tour number from header row
                if (entry.isHeader && tn) {
                    tourNumber = tn;
                }

                // Check 1: Regular Denmark tour (3rd char = 2 or 4)
                if (tn && tn.length >= 3) {
                    var c3 = tn.charAt(2);
                    if (c3 === '2' || c3 === '4') {
                        hasDenmark = true;
                        tourNumber = tn;
                        console.log('VR SR: Found Denmark tour ' + tn + ' on ' + dateKey + ' (c3=' + c3 + ')');

                        // First time detecting rate? Save it
                        var tourRate = (c3 === '2') ? 75 : 50;
                        if (!VR.detectedSRRate) {
                            VR.detectedSRRate = tourRate;
                            VR.userRole = (c3 === '2') ? 'Lokförare' : 'Tågvärd';
                            console.log('VR SR: Detected rate ' + tourRate + ' kr (' + VR.userRole + ')');
                        }
                        break;
                    }
                }

                // Check 2: DK.K in sP or eP (for Ändrad Reserv)
                var sP = (entry.sP || '').toUpperCase();
                var eP = (entry.eP || '').toUpperCase();
                if (sP.indexOf('DK.K') > -1 || eP.indexOf('DK.K') > -1) {
                    hasDenmark = true;
                    if (!tourNumber && entry.isHeader) tourNumber = tn;
                    console.log('VR SR: Found DK.K on ' + dateKey + ' in sP=' + sP + ' eP=' + eP);
                }
            }

            // Add to SR data if Denmark day found
            if (hasDenmark && !VR.srData[dateKey]) {
                var parts = dateKey.split('-');
                var day = parseInt(parts[0]);
                var dateObj = new Date(year, month, day);
                var wd = VR.WEEKDAYS_SHORT[dateObj.getDay()];

                VR.srData[dateKey] = {
                    date: dateKey,
                    dateStr: day + ' ' + VR.MONTHS_SHORT[month] + ' ' + wd,
                    day: day,
                    month: month,
                    year: year,
                    tur: tourNumber || 'Ändrad Reserv',
                    source: tourNumber && VR.isDenmarkTour(tourNumber) ? 'tour' : 'dkk'
                };
                addedCount++;
            }
        }

        var totalCount = VR.getSRDataArray().length;
        VR.updateLoader(100, 'Klar! ' + totalCount + ' Danmark-dagar');

        setTimeout(function() {
            VR.hideLoader();
            VR.showSRView();
        }, 500);
    };

    console.log('VR: SR-Tillägg loaded');
})();
