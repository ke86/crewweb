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

    // ===== FETCH AND SHOW SCHEMA =====
    VR.fetchAndShowSchema = function() {
        var now = new Date();
        VR.schemaYear = now.getFullYear();
        VR.schemaMonth = now.getMonth();

        var d1 = '01-' + ('0' + (VR.schemaMonth + 1)).slice(-2) + '-' + VR.schemaYear;
        var lastDay = new Date(VR.schemaYear, VR.schemaMonth + 1, 0).getDate();
        var d2 = lastDay + '-' + ('0' + (VR.schemaMonth + 1)).slice(-2) + '-' + VR.schemaYear;

        VR.setDates(d1, d2);
        VR.updateLoader(55, 'Sätter datum...');
        VR.clickFetch();
        VR.updateLoader(65, 'Hämtar data...');

        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(65 + n, 'Laddar schema...');

            var rows = document.querySelectorAll('#workdays table tr');
            if (rows.length > 5 || n > 30) {
                VR.stopTimer();
                VR.updateLoader(95, 'Bygger vy...');
                setTimeout(VR.renderSchema, 300);
            }
        }, 400);
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

        VR.showLoader('Byter månad...');
        VR.updateLoader(30, 'Sätter datum...');

        var d1 = '01-' + ('0' + (VR.schemaMonth + 1)).slice(-2) + '-' + VR.schemaYear;
        var lastDay = new Date(VR.schemaYear, VR.schemaMonth + 1, 0).getDate();
        var d2 = lastDay + '-' + ('0' + (VR.schemaMonth + 1)).slice(-2) + '-' + VR.schemaYear;

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
        var today = VR.getTodayStr();
        var dd = {};
        var currentDate = '';

        // Parse all rows
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) currentDate = dt;
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

        VR.dayData = dd;

        // Build HTML
        var html = VR.buildSchemaNav();
        html += VR.buildSchemaRows(dd, today);

        VR.updateLoader(100, 'Klar!');

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('Schema', VR.MONTHS[VR.schemaMonth] + ' ' + VR.schemaYear, html);

            // Attach event listeners
            var prevBtn = document.getElementById('vrPrevMonth');
            var nextBtn = document.getElementById('vrNextMonth');
            var exportBtn = document.getElementById('vrExportMonth');

            if (prevBtn) prevBtn.onclick = function() { VR.changeMonth(-1); };
            if (nextBtn) nextBtn.onclick = function() { VR.changeMonth(1); };
            if (exportBtn) exportBtn.onclick = function() { VR.exportMonthToCalendar(); };
        }, 400);
    };

    // ===== BUILD SCHEMA NAV =====
    VR.buildSchemaNav = function() {
        return '\
<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:27px;padding:27px 36px;margin-bottom:36px;box-shadow:0 5px 18px rgba(0,0,0,0.08)">\
<button id="vrPrevMonth" style="width:99px;height:99px;border-radius:50%;border:none;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;font-size:45px;font-weight:700;cursor:pointer">←</button>\
<div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px">\
<div style="font-size:41px;font-weight:700;color:#000">' + VR.MONTHS[VR.schemaMonth] + ' ' + VR.schemaYear + '</div>\
<button id="vrExportMonth" style="padding:14px 27px;border-radius:14px;border:none;background:linear-gradient(135deg,#34C759,#30D158);color:#fff;font-size:24px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:9px">\
<span>📅</span> Exportera månad</button>\
</div>\
<button id="vrNextMonth" style="width:99px;height:99px;border-radius:50%;border:none;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;font-size:45px;font-weight:700;cursor:pointer">→</button>\
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

            // Check if day contains DK.KK (for Danish flag on Ändrad Reserv)
            var hasDKKK = false;
            for (var dk = 0; dk < es.length; dk++) {
                var evStr = JSON.stringify(es[dk]).toUpperCase();
                if (evStr.indexOf('DK.KK') > -1 || evStr.indexOf('DK.K') > -1) {
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
