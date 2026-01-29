// VR CrewWeb - Schema functionality
(function() {
    'use strict';

    var VR = window.VR;

    // ===== MAIN SCHEMA FUNCTION =====
    VR.doSchema = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Schema');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on workdays page
        var tbl = document.querySelector('#workdays table');
        if (tbl) {
            VR.updateLoader(40, 'Sidan redan laddad...');
            VR.fetchAndShowSchema();
            return;
        }

        // ALWAYS open folder menu first, then find Arbetsdag
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
                    VR.waitForWorkdays();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR WORKDAYS =====
    VR.waitForWorkdays = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var tbl = document.querySelector('#workdays table');
            if (tbl) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(VR.fetchAndShowSchema, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== WAIT FOR DATE INPUTS =====
    VR.waitForDateInputs = function(callback) {
        var n = 0;
        var checkInterval = setInterval(function() {
            n++;
            console.log('VR: waitForDateInputs attempt', n);

            // Search entire page for date inputs
            var allInputs = document.querySelectorAll('input');
            var dateInputs = [];

            // First look for inputs with date values
            for (var i = 0; i < allInputs.length; i++) {
                var val = allInputs[i].value || '';
                if (val.match(/\d{1,2}-\d{2}-\d{4}/)) {
                    dateInputs.push(allInputs[i]);
                }
            }

            // If found 2+ date inputs, we're good
            if (dateInputs.length >= 2) {
                console.log('VR: Found', dateInputs.length, 'date inputs, proceeding');
                clearInterval(checkInterval);
                callback();
                return;
            }

            // Otherwise look for visible text inputs
            dateInputs = [];
            for (var j = 0; j < allInputs.length; j++) {
                var type = allInputs[j].type || 'text';
                if (type === 'text' || type === '') {
                    var rect = allInputs[j].getBoundingClientRect();
                    if (rect.width > 60 && rect.height > 15) {
                        dateInputs.push(allInputs[j]);
                    }
                }
            }

            if (dateInputs.length >= 2) {
                console.log('VR: Found', dateInputs.length, 'visible text inputs, proceeding');
                clearInterval(checkInterval);
                callback();
                return;
            }

            console.log('VR: Found', dateInputs.length, 'inputs so far, waiting...');

            if (n > 30) {
                console.log('VR: Timeout waiting for date inputs, proceeding anyway');
                clearInterval(checkInterval);
                callback(); // Try anyway
            }
        }, 300);
    };

    // ===== WAIT FOR SCHEMA DATA =====
    VR.waitForSchemaData = function() {
        var prevRowCount = document.querySelectorAll('#workdays table tr').length;
        var stableCount = 0;
        var lastRowCount = 0;

        console.log('VR: waitForSchemaData - initial row count:', prevRowCount);

        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(65 + Math.min(n, 25), 'Laddar schema...');

            var rows = document.querySelectorAll('#workdays table tr');
            var rowCount = rows.length;

            console.log('VR: waitForSchemaData attempt', n, '- rows:', rowCount);

            // Wait for row count to stabilize (same count for 3 checks)
            if (rowCount === lastRowCount && rowCount > 10) {
                stableCount++;
                console.log('VR: Row count stable for', stableCount, 'checks');
            } else {
                stableCount = 0;
            }
            lastRowCount = rowCount;

            // Proceed if we have stable data or timeout
            if (stableCount >= 3 || n > 50) {
                VR.stopTimer();
                console.log('VR: Proceeding with', rowCount, 'rows after', n, 'attempts');
                VR.updateLoader(95, 'Bygger vy...');
                setTimeout(VR.renderSchema, 500);
            }
        }, 400);
    };

    // ===== FETCH AND SHOW SCHEMA =====
    VR.fetchAndShowSchema = function() {
        var now = new Date();
        VR.schemaYear = now.getFullYear();
        VR.schemaMonth = now.getMonth();

        // Load wide range: 1.5 months back to 12 months ahead
        // E.g., from Dec 14 to Dec 31 next year
        var startDate = new Date(now.getFullYear(), now.getMonth() - 1, 14);
        var endDate = new Date(now.getFullYear(), 11, 31); // Dec 31 this year

        var d1 = startDate.getDate() + '-' + ('0' + (startDate.getMonth() + 1)).slice(-2) + '-' + startDate.getFullYear();
        var d2 = endDate.getDate() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + endDate.getFullYear();

        console.log('VR: Setting dates from ' + d1 + ' to ' + d2);

        VR.updateLoader(50, 'Väntar på datumfält...');

        // Wait for date inputs to be available before setting dates
        VR.waitForDateInputs(function() {
            VR.updateLoader(55, 'Sätter datum ' + d1 + '...');
            var success = VR.setDates(d1, d2);
            console.log('VR: setDates result: ' + success);
            VR.updateLoader(60, 'Hämtar data...');
            setTimeout(function() {
                VR.clickFetch();
                VR.waitForSchemaData();
            }, 300);
        });
    };

    // ===== CHECK IF MONTH IN CACHE =====
    VR.hasMonthInCache = function(month, year) {
        if (!VR.allSchemaData) return false;
        var targetMonth = month + 1; // 1-indexed
        var keys = Object.keys(VR.allSchemaData);
        for (var i = 0; i < keys.length; i++) {
            var parts = keys[i].split('-');
            if (parts.length === 3) {
                var m = parseInt(parts[1], 10);
                var y = parseInt(parts[2], 10);
                if (m === targetMonth && y === year) return true;
            }
        }
        return false;
    };

    // ===== CHANGE MONTH =====
    VR.changeMonth = function(dir) {
        VR.schemaMonth += dir;
        if (VR.schemaMonth < 0) {
            VR.schemaMonth = 11;
            VR.schemaYear--;
        }
        if (VR.schemaMonth > 11) {
            VR.schemaMonth = 0;
            VR.schemaYear++;
        }

        // Check if target month exists in cache
        if (VR.hasMonthInCache(VR.schemaMonth, VR.schemaYear)) {
            VR.showLoader('Byter månad...');
            VR.updateLoader(80, 'Filtrerar data...');
            setTimeout(function() {
                VR.renderSchemaFromCache();
            }, 200);
            return;
        }

        // Target month not in cache - fetch new data
        VR.showLoader('Byter månad...');
        VR.updateLoader(30, 'Hämtar ny data...');

        // Load wide range around target month (6 months before, 12 months ahead)
        var startDate = new Date(VR.schemaYear, VR.schemaMonth - 6, 1);
        var endDate = new Date(VR.schemaYear, VR.schemaMonth + 13, 0);

        var d1 = '01-' + ('0' + (startDate.getMonth() + 1)).slice(-2) + '-' + startDate.getFullYear();
        var d2 = endDate.getDate() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + endDate.getFullYear();

        VR.setDates(d1, d2);
        VR.updateLoader(50, 'Hämtar data...');
        VR.clickFetch();

        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(50 + n * 2, 'Laddar...');

            var rows = document.querySelectorAll('#workdays table tr');
            if (rows.length > 5 || n > 20) {
                VR.stopTimer();
                VR.updateLoader(95, 'Bygger vy...');
                setTimeout(VR.renderSchema, 300);
            }
        }, 400);
    };

    // ===== RENDER SCHEMA =====
    VR.renderSchema = function() {
        var tbl = VR.findLargestTable();
        if (!tbl) {
            VR.updateLoader(0, 'Ingen data');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var dd = {};
        var currentDate = '';

        // Parse ALL rows - no filtering here
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) {
                currentDate = dt;
            }
            if (!currentDate) continue;

            var en = {
                dt: currentDate,
                ps: c[3] ? c[3].textContent.trim() : '',
                sP: c[4] ? c[4].textContent.trim() : '',
                eP: c[5] ? c[5].textContent.trim() : '',
                ai: c[6] ? c[6].textContent.trim() : '',
                lb: c[7] ? c[7].textContent.trim() : '',
                u1: c[8] ? c[8].textContent.trim() : '',
                tn: c[9] ? c[9].textContent.trim() : '',
                pr: c[10] ? c[10].textContent.trim() : '',
                pt: c[11] ? c[11].textContent.trim() : '',
                cd: c[12] ? c[12].textContent.trim() : '',
                km: c[13] ? c[13].textContent.trim() : '',
                sa: c[14] ? c[14].textContent.trim() : '',
                isHeader: dt && dt.indexOf('-') > -1
            };

            if (!dd[currentDate]) dd[currentDate] = [];
            dd[currentDate].push(en);
        }

        // Store ALL data for caching
        VR.allSchemaData = dd;

        // Log what we got
        var allDates = Object.keys(dd).sort();
        console.log('VR: Parsed', allDates.length, 'dates from schema');
        if (allDates.length > 0) {
            console.log('VR: Date range:', allDates[0], 'to', allDates[allDates.length - 1]);
        }

        // Update header with today/tomorrow info
        if (VR.updateHeaderFromCache) {
            VR.updateHeaderFromCache();
        }

        // Render from cache (filters by selected month)
        VR.renderSchemaFromCache();
    };

    // ===== RENDER FROM CACHE =====
    VR.renderSchemaFromCache = function() {
        var today = VR.getTodayStr();
        var targetMonth = VR.schemaMonth + 1; // 1-indexed (1-12)
        var targetYear = VR.schemaYear;

        // Filter data for selected month only
        var dd = {};
        var allKeys = Object.keys(VR.allSchemaData);
        for (var k = 0; k < allKeys.length; k++) {
            var dKey = allKeys[k];
            var parts = dKey.split('-');
            if (parts.length === 3) {
                var dtMonth = parseInt(parts[1], 10);
                var dtYear = parseInt(parts[2], 10);
                if (dtMonth === targetMonth && dtYear === targetYear) {
                    dd[dKey] = VR.allSchemaData[dKey];
                }
            }
        }

        VR.dayData = dd;

        // Build HTML
        var html = VR.buildSchemaNav();
        html += VR.buildSchemaRows(dd, today);

        VR.updateLoader(100, 'Klar!');

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', html);

            // Attach event listeners
            var prevBtn = document.getElementById('vrPrevMonth');
            var nextBtn = document.getElementById('vrNextMonth');
            var exportBtn = document.getElementById('vrExportMonth');

            if (prevBtn) prevBtn.onclick = function() { VR.changeMonth(-1); };
            if (nextBtn) nextBtn.onclick = function() { VR.changeMonth(1); };
            if (exportBtn) exportBtn.onclick = function() { VR.exportMonthToCalendar(); };

            // Load Komp saldo in background (only on first load)
            if (!VR.kompLoaded && VR.fetchKompForHeader) {
                VR.kompLoaded = true;
                setTimeout(VR.fetchKompForHeader, 1000);
            }
        }, 400);
    };

    // ===== BUILD SCHEMA NAV =====
    VR.buildSchemaNav = function() {
        return '\
<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:20px;padding:16px 20px;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08)">\
<button id="vrPrevMonth" style="width:60px;height:60px;border-radius:50%;border:none;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;font-size:28px;font-weight:700;cursor:pointer">←</button>\
<div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px">\
<div style="font-size:28px;font-weight:700;color:#000">' + VR.MONTHS[VR.schemaMonth] + ' ' + VR.schemaYear + '</div>\
<button id="vrExportMonth" style="padding:10px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,#34C759,#30D158);color:#fff;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">\
<span>📅</span> Exportera</button>\
</div>\
<button id="vrNextMonth" style="width:60px;height:60px;border-radius:50%;border:none;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;font-size:28px;font-weight:700;cursor:pointer">→</button>\
</div>';
    };

    // ===== BUILD SCHEMA ROWS =====
    VR.buildSchemaRows = function(dd, today) {
        var html = '';

        // Sort dates
        var ds = Object.keys(dd).sort(function(a, b) {
            var pa = a.split('-'), pb = b.split('-');
            return new Date(parseInt(pa[2]), parseInt(pa[1]) - 1, parseInt(pa[0])) -
                   new Date(parseInt(pb[2]), parseInt(pb[1]) - 1, parseInt(pb[0]));
        });

        for (var d = 0; d < ds.length; d++) {
            var dKey = ds[d];
            var es = dd[dKey];

            // Find main entry (header row)
            var mn = null;
            for (var z = 0; z < es.length; z++) {
                if (es[z].isHeader) { mn = es[z]; break; }
            }
            if (!mn) mn = es[0];

            // Parse date
            var parts = dKey.split('-');
            var dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            var wd = VR.WEEKDAYS_SHORT[dateObj.getDay()];
            var dayNum = parseInt(parts[0]);

            // Determine styling
            var isT = dKey === today;
            var psU = (mn.ps || '').toUpperCase();
            var isFPV = psU === 'FV' || psU === 'FP2' || psU === 'FP-V' ||
                        psU.indexOf('FP-V') > -1 || psU.indexOf('FP2') > -1;
            var isF = (mn.cd && mn.cd.toUpperCase() === 'FRIDAG') ||
                      (mn.ps && mn.ps.toUpperCase() === 'FRIDAG') || isFPV;
            var isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            // Colors
            var rowBg = isT ? 'linear-gradient(135deg,#34C759,#30D158)' : (d % 2 === 0 ? '#fff' : '#F8F8F8');
            var dateBg = isT ? 'rgba(255,255,255,0.25)' : isF ? '#FFF3E0' : isWeekend ? '#FEF3C7' : '#E8F0FE';
            var dateCol = isT ? '#fff' : isF ? '#F59E0B' : isWeekend ? '#D97706' : '#007AFF';
            var textCol = isT ? '#fff' : '#333';
            var subCol = isT ? 'rgba(255,255,255,0.8)' : '#666';

            html += '<div data-date="' + dKey + '" style="display:grid;grid-template-columns:113px 1fr auto;gap:23px;align-items:center;padding:23px 27px;background:' + rowBg + ';border-bottom:1px solid ' + (isT ? 'rgba(255,255,255,0.2)' : '#E5E5E5') + ';cursor:pointer" onclick="VR.showDayDetail(this.getAttribute(\'data-date\'))">';

            // Date box
            html += '<div style="width:95px;height:95px;border-radius:23px;background:' + dateBg + ';display:flex;flex-direction:column;align-items:center;justify-content:center">';
            html += '<div style="font-size:36px;font-weight:700;color:' + dateCol + ';line-height:1">' + dayNum + '</div>';
            html += '<div style="font-size:20px;font-weight:600;color:' + dateCol + '">' + wd + '</div>';
            html += '</div>';

            // Check if day contains DK.K in sP or eP (for Danish flag on Ändrad Reserv)
            var hasDKKK = false;
            for (var dk = 0; dk < es.length; dk++) {
                var sp = (es[dk].sP || '').toUpperCase();
                var ep = (es[dk].eP || '').toUpperCase();
                if (sp.indexOf('DK.K') > -1 || ep.indexOf('DK.K') > -1) {
                    hasDKKK = true;
                    break;
                }
            }

            // Content
            if (isF) {
                var fBadge = VR.getFridagBadge(mn.ps, mn.cd);
                html += '<div style="font-size:32px;color:' + textCol + ';display:flex;align-items:center">Ledig' + fBadge + '</div>';
            } else {
                var turIcons = VR.getTurIcons(mn.tn || mn.ps, hasDKKK);
                html += '<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">';
                html += '<span style="font-size:32px;font-weight:600;color:' + textCol + '">' + (mn.pr || '—') + '</span>';
                html += '<span style="font-size:27px;color:' + subCol + '">' + (mn.tn || mn.ps || '') + '</span>';
                html += turIcons;
                html += '</div>';
            }

            // Paid time badge
            html += '<div style="text-align:right">';
            if (mn.pt && !isF) {
                html += '<span style="background:' + (isT ? 'rgba(255,255,255,0.25)' : '#007AFF') + ';color:#fff;padding:9px 18px;border-radius:14px;font-size:27px;font-weight:600">' + mn.pt + '</span>';
            }
            html += '</div>';

            html += '</div>';
        }

        return html;
    };

    console.log('VR: Schema loaded');
})();
