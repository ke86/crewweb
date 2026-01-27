// VR CrewWeb - SR-Tillägg (Danmark-tillägg)
(function() {
    'use strict';

    var VR = window.VR;

    // SR-Tillägg rate per day
    var SR_RATE = 75;

    // Storage for SR data
    VR.srData = [];

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

    // ===== SHOW SR VIEW =====
    VR.showSRView = function() {
        VR.hideLoader();

        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        var monthNames = VR.MONTHS;

        // Get stored data for display
        var prevMonthData = VR.srData.filter(function(d) {
            return d.month === prevMonth && d.year === prevYear;
        });
        var currentMonthData = VR.srData.filter(function(d) {
            return d.month === currentMonth && d.year === currentYear;
        });

        var prevTotal = prevMonthData.length * SR_RATE;
        var currentTotal = currentMonthData.length * SR_RATE;

        var html = '';

        // Summary boxes (like OB)
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">';

        html += '<div style="background:#fff;border-radius:20px;padding:20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:32px;margin-bottom:8px">🇩🇰</div>';
        html += '<div style="font-size:13px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' + monthNames[prevMonth] + '</div>';
        html += '<div style="font-size:16px;color:#666;margin-bottom:4px">' + prevMonthData.length + ' dagar</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#333">' + prevTotal + ' kr</div>';
        html += '</div>';

        html += '<div style="background:#fff;border-radius:20px;padding:20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:32px;margin-bottom:8px">🇩🇰</div>';
        html += '<div style="font-size:13px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' + monthNames[currentMonth] + '</div>';
        html += '<div style="font-size:16px;color:#666;margin-bottom:4px">' + currentMonthData.length + ' dagar</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#C41E3A">' + currentTotal + ' kr</div>';
        html += '</div>';

        html += '</div>';

        // Load button
        html += '<div style="margin-bottom:20px">';
        html += '<button id="vrLoadSR" style="width:100%;padding:18px 24px;border-radius:16px;border:none;background:linear-gradient(135deg,#C41E3A,#DC143C);color:#fff;font-size:20px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 16px rgba(196,30,58,0.3)">';
        html += '<span>🔄</span> Ladda månadens SR-Tillägg';
        html += '</button>';
        html += '</div>';

        // Data table
        if (VR.srData.length > 0) {
            html += VR.buildSRTable();
        } else {
            html += '<div style="background:#fff;border-radius:20px;padding:40px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
            html += '<div style="font-size:48px;margin-bottom:16px">🇩🇰</div>';
            html += '<div style="font-size:18px;color:#666">Klicka på knappen ovan för att ladda SR-Tillägg</div>';
            html += '</div>';
        }

        VR.showView('', '', html);

        // Attach button listener
        var loadBtn = document.getElementById('vrLoadSR');
        if (loadBtn) {
            loadBtn.onclick = function() {
                VR.loadSRData();
            };
        }
    };

    // ===== BUILD SR TABLE =====
    VR.buildSRTable = function() {
        var html = '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Header
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Tur</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        // Sort by date descending
        var sorted = VR.srData.slice().sort(function(a, b) {
            return new Date(b.year, b.month, b.day) - new Date(a.year, a.month, a.day);
        });

        for (var i = 0; i < sorted.length; i++) {
            var row = sorted[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.dateStr + '</div>';
            html += '<div style="font-size:15px;color:#333">' + row.tur + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#C41E3A;text-align:right">' + SR_RATE + ' kr</div>';
            html += '</div>';
        }

        // Total row
        var total = VR.srData.length * SR_RATE;
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:16px 20px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:16px;font-weight:700;color:#333">Totalt</div>';
        html += '<div style="font-size:16px;color:#666">' + VR.srData.length + ' dagar</div>';
        html += '<div style="font-size:16px;font-weight:700;color:#C41E3A;text-align:right">' + total + ' kr</div>';
        html += '</div>';

        html += '</div>';
        return html;
    };

    // ===== LOAD SR DATA =====
    VR.loadSRData = function() {
        VR.showLoader('Laddar SR-Tillägg');
        VR.updateLoader(5, 'Förbereder...');

        // Set date range for current month
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();

        var d1 = '01-' + ('0' + (month + 1)).slice(-2) + '-' + year;
        var lastDay = new Date(year, month + 1, 0).getDate();
        var d2 = lastDay + '-' + ('0' + (month + 1)).slice(-2) + '-' + year;

        VR.setDates(d1, d2);
        VR.updateLoader(10, 'Sätter datum...');
        VR.clickFetch();

        setTimeout(function() {
            VR.updateLoader(15, 'Väntar på data...');
            VR.waitAndExpandDays();
        }, 1500);
    };

    // ===== WAIT AND EXPAND DAYS =====
    VR.waitAndExpandDays = function() {
        var tbl = VR.findLargestTable();
        if (!tbl) {
            VR.updateLoader(0, 'Ingen tabell hittades');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        // Find all expandable rows (days)
        var rows = tbl.querySelectorAll('tr');
        var dayRows = [];

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 3) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) {
                var expandBtn = rows[i].querySelector('button.ExpandRoot');
                if (expandBtn) {
                    dayRows.push({
                        row: rows[i],
                        date: dt,
                        btn: expandBtn,
                        tur: c[9] ? c[9].textContent.trim() : ''
                    });
                }
            }
        }

        if (dayRows.length === 0) {
            VR.updateLoader(0, 'Inga dagar att expandera');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        VR.srData = [];
        VR.expandDaysSequentially(dayRows, 0);
    };

    // ===== EXPAND DAYS SEQUENTIALLY =====
    VR.expandDaysSequentially = function(dayRows, index) {
        if (index >= dayRows.length) {
            VR.updateLoader(100, 'Klar! Hittade ' + VR.srData.length + ' Danmark-dagar');
            setTimeout(function() {
                VR.hideLoader();
                VR.showSRView();
            }, 800);
            return;
        }

        var day = dayRows[index];
        var progress = 20 + Math.floor((index / dayRows.length) * 75);
        VR.updateLoader(progress, 'Kollar dag ' + (index + 1) + ' av ' + dayRows.length + '...');

        // Click expand button
        day.btn.click();

        setTimeout(function() {
            // Read expanded data
            VR.checkDayForDenmark(day.date, day.tur);

            // Continue to next day
            VR.expandDaysSequentially(dayRows, index + 1);
        }, 600);
    };

    // ===== CHECK DAY FOR DENMARK =====
    VR.checkDayForDenmark = function(dateStr, tur) {
        var tbl = VR.findLargestTable();
        if (!tbl) return;

        var rows = tbl.querySelectorAll('tr');
        var hasDenmark = false;

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 6) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';

            // Skip if not the current day's data
            // Check sP and eP for DK.K
            var sP = c[4] ? c[4].textContent.trim().toUpperCase() : '';
            var eP = c[5] ? c[5].textContent.trim().toUpperCase() : '';

            if (sP.indexOf('DK.K') > -1 || eP.indexOf('DK.K') > -1) {
                hasDenmark = true;
                break;
            }
        }

        if (hasDenmark) {
            var parts = dateStr.split('-');
            var day = parseInt(parts[0]);
            var month = parseInt(parts[1]) - 1;
            var year = parseInt(parts[2]);
            var dateObj = new Date(year, month, day);
            var wd = VR.WEEKDAYS_SHORT[dateObj.getDay()];

            VR.srData.push({
                date: dateStr,
                dateStr: day + ' ' + VR.MONTHS_SHORT[month] + ' ' + wd,
                day: day,
                month: month,
                year: year,
                tur: tur || '—'
            });
        }
    };

    console.log('VR: SR-Tillägg loaded');
})();
