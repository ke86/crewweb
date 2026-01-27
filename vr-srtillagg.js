// VR CrewWeb - SR-Tillägg (Danmark-tillägg)
(function() {
    'use strict';

    var VR = window.VR;

    // SR-Tillägg rate per day
    var SR_RATE = 75;

    // Storage for SR data (keyed by date to avoid duplicates)
    VR.srDataMap = {};

    // ===== HELPER: Check if tour has Danish flag (3rd char is even digit) =====
    VR.hasDanishFlag = function(tn) {
        if (!tn || tn.length < 3) return false;
        var c3 = tn.charAt(2);
        if (c3 >= '0' && c3 <= '9') {
            return parseInt(c3) % 2 === 0;
        }
        return false;
    };

    // ===== HELPER: Check if tour is Ändrad Reserv format =====
    VR.isAndradReserv = function(tn) {
        if (!tn) return false;
        return /^\d{6}-\d{6}/.test(tn);
    };

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
        for (var key in VR.srDataMap) {
            if (VR.srDataMap.hasOwnProperty(key)) {
                arr.push(VR.srDataMap[key]);
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
        var srData = VR.getSRDataArray();

        // Get stored data for display
        var prevMonthData = srData.filter(function(d) {
            return d.month === prevMonth && d.year === prevYear;
        });
        var currentMonthData = srData.filter(function(d) {
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
        html += '<span>🔄</span> Ladda SR-Tillägg';
        html += '</button>';
        html += '</div>';

        // Data table
        if (srData.length > 0) {
            html += VR.buildSRTable(srData);
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
    VR.buildSRTable = function(srData) {
        var html = '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Header
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Tur</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        // Sort by date descending
        var sorted = srData.slice().sort(function(a, b) {
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
        var total = srData.length * SR_RATE;
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:8px;padding:16px 20px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:16px;font-weight:700;color:#333">Totalt</div>';
        html += '<div style="font-size:16px;color:#666">' + srData.length + ' dagar</div>';
        html += '<div style="font-size:16px;font-weight:700;color:#C41E3A;text-align:right">' + total + ' kr</div>';
        html += '</div>';

        html += '</div>';
        return html;
    };

    // ===== LOAD SR DATA =====
    VR.loadSRData = function() {
        VR.showLoader('Laddar SR-Tillägg');
        VR.updateLoader(5, 'Förbereder...');

        // Clear previous data
        VR.srDataMap = {};

        // Start with previous month
        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Load previous month first
        VR.loadMonthSR(prevYear, prevMonth, function() {
            // Then load current month
            VR.loadMonthSR(currentYear, currentMonth, function() {
                VR.updateLoader(100, 'Klar! Hittade ' + VR.getSRDataArray().length + ' Danmark-dagar');
                setTimeout(function() {
                    VR.hideLoader();
                    VR.showSRView();
                }, 800);
            });
        });
    };

    // ===== LOAD MONTH SR =====
    VR.loadMonthSR = function(year, month, callback) {
        var monthName = VR.MONTHS[month];
        VR.updateLoader(10, 'Laddar ' + monthName + '...');

        var d1 = '01-' + ('0' + (month + 1)).slice(-2) + '-' + year;
        var lastDay = new Date(year, month + 1, 0).getDate();
        var d2 = lastDay + '-' + ('0' + (month + 1)).slice(-2) + '-' + year;

        VR.setDates(d1, d2);
        VR.clickFetch();

        setTimeout(function() {
            VR.updateLoader(20, 'Väntar på data för ' + monthName + '...');
            VR.scanMonthForSR(year, month, callback);
        }, 1500);
    };

    // ===== SCAN MONTH FOR SR =====
    VR.scanMonthForSR = function(year, month, callback) {
        var tbl = VR.findLargestTable();
        if (!tbl) {
            if (callback) callback();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var daysToExpand = [];

        // First pass: scan header rows
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 10) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (!dt || dt.indexOf('-') === -1) continue;

            var tur = c[9] ? c[9].textContent.trim() : '';
            var expandBtn = rows[i].querySelector('button.ExpandRoot');

            // Skip if already processed
            if (VR.srDataMap[dt]) continue;

            // Check if tour has Danish flag (3rd char even)
            if (VR.hasDanishFlag(tur)) {
                // Automatically SR-Tillägg - no expansion needed
                VR.addSRDay(dt, tur, 'flag');
            }
            // Check if Ändrad Reserv format - needs expansion to check DK.K
            else if (VR.isAndradReserv(tur) && expandBtn) {
                daysToExpand.push({
                    date: dt,
                    tur: tur,
                    btn: expandBtn
                });
            }
        }

        // Second pass: expand days that need checking
        if (daysToExpand.length > 0) {
            VR.expandDaysForSR(daysToExpand, 0, year, month, callback);
        } else {
            if (callback) callback();
        }
    };

    // ===== EXPAND DAYS FOR SR =====
    VR.expandDaysForSR = function(days, index, year, month, callback) {
        if (index >= days.length) {
            if (callback) callback();
            return;
        }

        var day = days[index];
        var monthName = VR.MONTHS[month];
        var progress = 30 + Math.floor((index / days.length) * 40);
        VR.updateLoader(progress, 'Expanderar ' + day.date + ' (' + monthName + ')...');

        // Click expand button
        day.btn.click();

        setTimeout(function() {
            // Check expanded data for DK.K
            if (VR.checkExpandedForDK(day.date)) {
                VR.addSRDay(day.date, day.tur, 'expanded');
            }

            // Continue to next
            VR.expandDaysForSR(days, index + 1, year, month, callback);
        }, 500);
    };

    // ===== CHECK EXPANDED DATA FOR DK =====
    VR.checkExpandedForDK = function(dateStr) {
        var tbl = VR.findLargestTable();
        if (!tbl) return false;

        var rows = tbl.querySelectorAll('tr');
        var inDay = false;

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 6) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';

            // Track which day we're in
            if (dt && dt.indexOf('-') > -1) {
                inDay = (dt === dateStr);
            }

            // Only check rows for our target day
            if (!inDay) continue;

            var sP = c[4] ? c[4].textContent.trim().toUpperCase() : '';
            var eP = c[5] ? c[5].textContent.trim().toUpperCase() : '';

            if (sP.indexOf('DK.K') > -1 || eP.indexOf('DK.K') > -1) {
                return true;
            }
        }

        return false;
    };

    // ===== ADD SR DAY =====
    VR.addSRDay = function(dateStr, tur, source) {
        // Skip if already added
        if (VR.srDataMap[dateStr]) return;

        var parts = dateStr.split('-');
        var day = parseInt(parts[0]);
        var month = parseInt(parts[1]) - 1;
        var year = parseInt(parts[2]);
        var dateObj = new Date(year, month, day);
        var wd = VR.WEEKDAYS_SHORT[dateObj.getDay()];

        VR.srDataMap[dateStr] = {
            date: dateStr,
            dateStr: day + ' ' + VR.MONTHS_SHORT[month] + ' ' + wd,
            day: day,
            month: month,
            year: year,
            tur: tur || '—',
            source: source
        };
    };

    console.log('VR: SR-Tillägg loaded');
})();
