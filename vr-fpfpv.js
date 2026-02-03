// VR CrewWeb - FP/FPV (Fridagar) - NY VERSION
(function() {
    'use strict';

    var VR = window.VR;

    // ===== CONSTANTS =====
    var MONTH_NAMES = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
    var MONTH_SHORT = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
    var WEEKDAY_NAMES = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
    var YEAR = 2026;
    var MAX_FP = 104;
    var MAX_FPV = 14;

    // Svenska helgdagar 2026
    var HELGDAGAR = [
        { namn: 'Nyårsdagen', dag: 1, manad: 'Januari' },
        { namn: 'Trettondedag jul', dag: 6, manad: 'Januari' },
        { namn: 'Långfredagen', dag: 3, manad: 'April' },
        { namn: 'Påskafton', dag: 4, manad: 'April' },
        { namn: 'Påskdagen', dag: 5, manad: 'April' },
        { namn: 'Annandag påsk', dag: 6, manad: 'April' },
        { namn: 'Första maj', dag: 1, manad: 'Maj' },
        { namn: 'Kristi himmelsfärd', dag: 14, manad: 'Maj' },
        { namn: 'Pingstafton', dag: 23, manad: 'Maj' },
        { namn: 'Pingstdagen', dag: 24, manad: 'Maj' },
        { namn: 'Sveriges nationaldag', dag: 6, manad: 'Juni' },
        { namn: 'Midsommarafton', dag: 19, manad: 'Juni' },
        { namn: 'Midsommardagen', dag: 20, manad: 'Juni' },
        { namn: 'Alla helgons dag', dag: 31, manad: 'Oktober' },
        { namn: 'Julafton', dag: 24, manad: 'December' },
        { namn: 'Juldagen', dag: 25, manad: 'December' },
        { namn: 'Annandag jul', dag: 26, manad: 'December' },
        { namn: 'Nyårsafton', dag: 31, manad: 'December' }
    ];

    // ===== NAVIGATE TO FRÅNVARO PAGE =====
    VR.navigateToFranvaro = function(callback) {
        console.log('VR: Navigating to Frånvaro page...');

        // Click menu open
        var menuOpen = document.querySelector('.MenuOpen');
        if (menuOpen) {
            menuOpen.click();
        } else {
            VR.clickFolder();
        }

        setTimeout(function() {
            var menuItems = document.querySelectorAll('.MenuItem');
            var found = false;

            for (var i = 0; i < menuItems.length; i++) {
                if (menuItems[i].textContent.indexOf('Frånvaron') > -1) {
                    menuItems[i].click();
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Fallback: try other selectors
                var el = VR.findMenuItem('Frånvaron');
                if (el) el.click();
            }

            if (callback) setTimeout(callback, 1000);
        }, 500);
    };

    // ===== MAIN FP/FPV FUNCTION =====
    VR.doFPFPV = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar FP/FPV');
        VR.updateLoader(5, 'Öppnar Frånvaro...');

        VR.navigateToFranvaro(function() {
            VR.updateLoader(30, 'Väntar på sidan...');
            VR.waitForFranvaroGrid();
        });
    };

    // ===== WAIT FOR GRID CELLS =====
    VR.waitForFranvaroGrid = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Letar efter data...');

            var gridCells = document.querySelectorAll('.GridCell');
            console.log('VR: Found', gridCells.length, 'GridCells');

            if (gridCells.length > 10) {
                VR.stopTimer();
                VR.updateLoader(70, 'Analyserar data...');
                setTimeout(VR.parseAndShowFPFPV, 500);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Ingen data hittades');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== PARSE FP/FPV DATA =====
    VR.parseAndShowFPFPV = function() {
        VR.updateLoader(80, 'Extraherar FP/FPV...');

        var allCells = document.querySelectorAll('.GridCell');
        var months = {};
        var days = {};
        var values = [];

        allCells.forEach(function(cell) {
            var text = cell.textContent.trim();
            var style = cell.getAttribute('style') || '';
            var topMatch = style.match(/top:\s*(\d+)px/);
            var leftMatch = style.match(/left:\s*(\d+)px/);
            var top = topMatch ? parseInt(topMatch[1]) : 0;
            var left = leftMatch ? parseInt(leftMatch[1]) : 0;

            if (MONTH_NAMES.indexOf(text) > -1) {
                months[top] = text;
            } else if (/^\d{1,2}$/.test(text) && top === 0) {
                days[left] = parseInt(text);
            } else if (text === 'FRI' || text === 'afd') {
                values.push({ top: top, left: left, type: text });
            }
        });

        // Map values to dates
        var ledigheter = [];
        var monthTops = Object.keys(months).map(Number).sort(function(a, b) { return a - b; });
        var dayLefts = Object.keys(days).map(Number).sort(function(a, b) { return a - b; });

        values.forEach(function(v) {
            var monthTop = monthTops.reduce(function(prev, curr) {
                return Math.abs(curr - v.top) < Math.abs(prev - v.top) ? curr : prev;
            });
            var dayLeft = dayLefts.reduce(function(prev, curr) {
                return Math.abs(curr - v.left) < Math.abs(prev - v.left) ? curr : prev;
            });

            ledigheter.push({
                manad: months[monthTop],
                dag: days[dayLeft],
                typ: v.type,
                visas: v.type === 'FRI' ? 'FP' : 'FPV'
            });
        });

        console.log('VR: Hittade', ledigheter.length, 'lediga dagar');

        // Sort by month and day
        ledigheter.sort(function(a, b) {
            var monthDiff = MONTH_NAMES.indexOf(a.manad) - MONTH_NAMES.indexOf(b.manad);
            return monthDiff !== 0 ? monthDiff : a.dag - b.dag;
        });

        // Store for later use
        VR.fpfpvData = ledigheter;

        VR.updateLoader(95, 'Bygger vy...');

        setTimeout(function() {
            VR.hideLoader();
            VR.showFPFPVView(ledigheter);
        }, 300);
    };

    // ===== HELPER FUNCTIONS =====
    VR.getWeekNumber = function(date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    VR.getDayType = function(dag, manad) {
        if (!VR.fpfpvData) return null;
        for (var i = 0; i < VR.fpfpvData.length; i++) {
            if (VR.fpfpvData[i].dag === dag && VR.fpfpvData[i].manad === manad) {
                return VR.fpfpvData[i].visas;
            }
        }
        return null;
    };

    // ===== BUILD AND SHOW VIEW =====
    VR.showFPFPVView = function(ledigheter) {
        // Count totals
        var totalFP = 0;
        var totalFPV = 0;
        ledigheter.forEach(function(d) {
            if (d.visas === 'FP') totalFP++;
            else if (d.visas === 'FPV') totalFPV++;
        });

        var fpOver = totalFP > MAX_FP;
        var fpvOver = totalFPV > MAX_FPV;
        var fpPercent = Math.min((totalFP / MAX_FP) * 100, 100);
        var fpvPercent = Math.min((totalFPV / MAX_FPV) * 100, 100);
        var fpDiff = totalFP - MAX_FP;
        var fpvDiff = totalFPV - MAX_FPV;

        // Build List HTML
        var listHTML = VR.buildFPListView(ledigheter);

        // Build Calendar HTML
        var calHTML = VR.buildFPCalendarView(ledigheter);

        // Build Helgdagar HTML
        var helgHTML = VR.buildFPHelgdagarView(ledigheter);

        var html = VR.buildFPStyles();

        // Summary cards
        html += '<div class="vr-fp-summary">';
        html += '<div class="vr-fp-card' + (fpOver ? ' over' : '') + '">';
        html += '<div class="vr-fp-badge fp">FP</div>';
        html += '<div class="vr-fp-nums"><span class="vr-fp-current" style="color:' + (fpOver ? '#FF3B30' : '#34C759') + '">' + totalFP + '</span><span class="vr-fp-max">/ ' + MAX_FP + '</span></div>';
        if (fpOver) html += '<div class="vr-fp-over">⚠️ +' + fpDiff + ' över</div>';
        html += '<div class="vr-fp-progress"><div class="vr-fp-bar" style="width:' + fpPercent + '%;background:' + (fpOver ? '#FF3B30' : '#34C759') + '"></div></div>';
        html += '</div>';

        html += '<button class="vr-fp-export" onclick="VR.exportFPToCalendar()"><div class="vr-fp-export-icon">📅</div><div class="vr-fp-export-text">Exportera</div></button>';

        html += '<div class="vr-fp-card' + (fpvOver ? ' over' : '') + '">';
        html += '<div class="vr-fp-badge fpv">FPV</div>';
        html += '<div class="vr-fp-nums"><span class="vr-fp-current" style="color:' + (fpvOver ? '#FF3B30' : '#34C759') + '">' + totalFPV + '</span><span class="vr-fp-max">/ ' + MAX_FPV + '</span></div>';
        if (fpvOver) html += '<div class="vr-fp-over">⚠️ +' + fpvDiff + ' över</div>';
        html += '<div class="vr-fp-progress"><div class="vr-fp-bar" style="width:' + fpvPercent + '%;background:' + (fpvOver ? '#FF3B30' : '#34C759') + '"></div></div>';
        html += '</div>';
        html += '</div>';

        // Tabs
        html += '<div class="vr-fp-tabs">';
        html += '<button class="vr-fp-tab active" onclick="VR.switchFPView(\'list\', this)">📋 Lista</button>';
        html += '<button class="vr-fp-tab" onclick="VR.switchFPView(\'calendar\', this)">📆 Kalender</button>';
        html += '<button class="vr-fp-tab" onclick="VR.switchFPView(\'helg\', this)">🎄 Helgdagar</button>';
        html += '</div>';

        // Content
        html += '<div class="vr-fp-content">';
        html += '<div id="vrFPListView" class="vr-fp-view active">' + listHTML + '</div>';
        html += '<div id="vrFPCalendarView" class="vr-fp-view">' + calHTML + '</div>';
        html += '<div id="vrFPHelgView" class="vr-fp-view">' + helgHTML + '</div>';
        html += '</div>';

        VR.showView('', '', html);
    };

    // ===== BUILD STYLES =====
    VR.buildFPStyles = function() {
        return '<style>\
.vr-fp-summary{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;margin-bottom:12px}\
.vr-fp-card{background:#fff;border-radius:18px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08)}\
.vr-fp-card.over{border:2px solid #FF3B30}\
.vr-fp-badge{display:inline-block;padding:6px 14px;border-radius:10px;font-size:15px;font-weight:700;margin-bottom:12px}\
.vr-fp-badge.fp{background:#34C759;color:#fff}\
.vr-fp-badge.fpv{background:#fff;color:#34C759;border:2px dashed #34C759}\
.vr-fp-nums{display:flex;align-items:baseline;justify-content:center;gap:4px}\
.vr-fp-current{font-size:44px;font-weight:700}\
.vr-fp-max{font-size:20px;font-weight:600;color:#999}\
.vr-fp-over{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:8px;font-size:13px;font-weight:700;background:#FF3B30;color:#fff}\
.vr-fp-progress{height:8px;background:#E5E5E5;border-radius:4px;margin-top:14px;overflow:hidden}\
.vr-fp-bar{height:100%;border-radius:4px}\
.vr-fp-export{background:#fff;border-radius:18px;padding:20px 16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:none;min-width:90px;transition:all 0.2s}\
.vr-fp-export:active{background:#007AFF;color:#fff}\
.vr-fp-export-icon{font-size:32px;margin-bottom:8px}\
.vr-fp-export-text{font-size:13px;font-weight:600;color:#007AFF}\
.vr-fp-tabs{display:flex;gap:6px;margin-bottom:16px}\
.vr-fp-tab{flex:1;padding:12px 8px;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;background:#fff;color:#666;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all 0.2s}\
.vr-fp-tab.active{background:#007AFF;color:#fff}\
.vr-fp-content{}\
.vr-fp-view{display:none}\
.vr-fp-view.active{display:block}\
.vr-fp-month{background:#fff;border-radius:18px;margin-bottom:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)}\
.vr-fp-month-header{background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);padding:16px 20px;font-weight:700;font-size:20px;color:#fff;display:flex;justify-content:space-between;align-items:center}\
.vr-fp-month-count{font-size:14px;font-weight:600;background:rgba(255,255,255,0.2);padding:6px 12px;border-radius:20px}\
.vr-fp-days{display:flex;flex-wrap:wrap;padding:16px;gap:10px}\
.vr-fp-day-badge{padding:12px 16px;border-radius:14px;font-weight:700;font-size:17px}\
.vr-fp-day-badge.FP{background:#34C759;color:#fff}\
.vr-fp-day-badge.FPV{background:#fff;color:#34C759;border:2px dashed #34C759}\
.vr-fp-cal-container{overflow-x:auto}\
.vr-fp-cal-grid{display:grid;grid-template-columns:40px repeat(7,1fr);gap:3px;padding:12px;min-width:320px}\
.vr-fp-weekday{text-align:center;font-size:12px;color:#999;padding:8px 2px;font-weight:600}\
.vr-fp-week-num{display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;font-weight:600}\
.vr-fp-cal-day{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:10px;font-size:15px;font-weight:500;background:#F8F8F8;color:#333;min-height:44px}\
.vr-fp-cal-day .day-num{font-weight:600}\
.vr-fp-cal-day .day-label{font-size:9px;font-weight:700;margin-top:2px}\
.vr-fp-cal-day.empty{background:transparent}\
.vr-fp-cal-day.FP{background:#34C759;color:#fff;font-weight:700}\
.vr-fp-cal-day.FPV{background:#fff;color:#34C759;font-weight:700;border:2px dashed #34C759}\
.vr-fp-helg-content{padding:12px}\
.vr-fp-helg-item{display:flex;align-items:center;gap:16px;background:#F8F8F8;border-radius:14px;padding:12px;margin-bottom:8px}\
.vr-fp-helg-item:last-child{margin-bottom:0}\
.vr-fp-helg-date-box{width:56px;height:56px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;flex-shrink:0}\
.vr-fp-helg-day{font-size:24px;font-weight:700;line-height:1}\
.vr-fp-helg-month-abbr{font-size:12px;font-weight:600;opacity:0.8;margin-top:2px;text-transform:uppercase}\
.vr-fp-helg-info{flex:1}\
.vr-fp-helg-namn{font-size:17px;font-weight:600;color:#333}\
.vr-fp-helg-meta{font-size:14px;color:#888;margin-top:4px}\
.vr-fp-helg-badge{padding:8px 14px;border-radius:10px;font-size:14px;font-weight:700}\
.vr-fp-helg-badge.FP{background:#34C759;color:#fff}\
.vr-fp-helg-badge.FPV{background:#fff;color:#34C759;border:2px dashed #34C759}\
</style>';
    };

    // ===== BUILD LIST VIEW =====
    VR.buildFPListView = function(ledigheter) {
        var html = '';

        MONTH_NAMES.forEach(function(month) {
            var daysInMonth = ledigheter.filter(function(d) { return d.manad === month; });
            if (daysInMonth.length === 0) return;

            html += '<div class="vr-fp-month">';
            html += '<div class="vr-fp-month-header">' + month + ' ' + YEAR + '<span class="vr-fp-month-count">' + daysInMonth.length + ' dagar</span></div>';
            html += '<div class="vr-fp-days">';

            daysInMonth.forEach(function(d) {
                html += '<div class="vr-fp-day-badge ' + d.visas + '">' + d.dag + ' ' + d.visas + '</div>';
            });

            html += '</div></div>';
        });

        if (html === '') {
            html = '<div style="background:#fff;border-radius:18px;padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:16px">🔍</div><div style="font-size:20px;color:#666">Ingen FP/FPV data hittades</div></div>';
        }

        return html;
    };

    // ===== BUILD CALENDAR VIEW =====
    VR.buildFPCalendarView = function(ledigheter) {
        var html = '';

        MONTH_NAMES.forEach(function(month, monthIndex) {
            var daysInMonth = ledigheter.filter(function(d) { return d.manad === month; });
            var firstDay = new Date(YEAR, monthIndex, 1).getDay();
            var startDay = firstDay === 0 ? 6 : firstDay - 1;
            var totalDays = new Date(YEAR, monthIndex + 1, 0).getDate();

            var dayTypes = {};
            daysInMonth.forEach(function(d) { dayTypes[d.dag] = d.visas; });

            html += '<div class="vr-fp-month">';
            html += '<div class="vr-fp-month-header">' + month + ' ' + YEAR + '<span class="vr-fp-month-count">' + daysInMonth.length + ' lediga</span></div>';
            html += '<div class="vr-fp-cal-container"><div class="vr-fp-cal-grid">';

            // Weekday headers
            html += '<div class="vr-fp-weekday-header"></div>';
            ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].forEach(function(d) {
                html += '<div class="vr-fp-weekday">' + d + '</div>';
            });

            var currentDay = 1;

            while (currentDay <= totalDays) {
                var weekNum = VR.getWeekNumber(new Date(YEAR, monthIndex, currentDay));
                html += '<div class="vr-fp-week-num">v' + weekNum + '</div>';

                for (var i = 0; i < 7; i++) {
                    if ((currentDay === 1 && i < startDay) || currentDay > totalDays) {
                        html += '<div class="vr-fp-cal-day empty"></div>';
                    } else {
                        var type = dayTypes[currentDay] || '';
                        var label = type ? type : '';
                        html += '<div class="vr-fp-cal-day ' + type + '"><span class="day-num">' + currentDay + '</span>' + (label ? '<span class="day-label">' + label + '</span>' : '') + '</div>';
                        currentDay++;
                    }
                }
            }

            html += '</div></div></div>';
        });

        return html;
    };

    // ===== BUILD HELGDAGAR VIEW =====
    VR.buildFPHelgdagarView = function(ledigheter) {
        var html = '';

        // Group helgdagar by month
        var helgdagarByMonth = {};
        HELGDAGAR.forEach(function(h) {
            if (!helgdagarByMonth[h.manad]) helgdagarByMonth[h.manad] = [];
            helgdagarByMonth[h.manad].push(h);
        });

        MONTH_NAMES.forEach(function(month) {
            var holidaysInMonth = helgdagarByMonth[month];
            if (!holidaysInMonth) return;

            html += '<div class="vr-fp-month">';
            html += '<div class="vr-fp-month-header">' + month + ' ' + YEAR + '<span class="vr-fp-month-count">' + holidaysInMonth.length + ' helgdagar</span></div>';
            html += '<div class="vr-fp-helg-content">';

            holidaysInMonth.forEach(function(h) {
                var monthIdx = MONTH_NAMES.indexOf(h.manad);
                var date = new Date(YEAR, monthIdx, h.dag);
                var weekday = WEEKDAY_NAMES[date.getDay()];
                var weekNum = VR.getWeekNumber(date);
                var monthAbbr = MONTH_SHORT[monthIdx];
                var dayType = VR.getDayType(h.dag, h.manad);

                html += '<div class="vr-fp-helg-item">';
                html += '<div class="vr-fp-helg-date-box"><span class="vr-fp-helg-day">' + h.dag + '</span><span class="vr-fp-helg-month-abbr">' + monthAbbr + '</span></div>';
                html += '<div class="vr-fp-helg-info"><div class="vr-fp-helg-namn">' + h.namn + '</div><div class="vr-fp-helg-meta">' + weekday + ' · v' + weekNum + '</div></div>';
                if (dayType) {
                    html += '<div class="vr-fp-helg-badge ' + dayType + '">' + dayType + '</div>';
                }
                html += '</div>';
            });

            html += '</div></div>';
        });

        return html;
    };

    // ===== SWITCH VIEW =====
    VR.switchFPView = function(view, btn) {
        var views = document.querySelectorAll('.vr-fp-view');
        var tabs = document.querySelectorAll('.vr-fp-tab');

        for (var i = 0; i < views.length; i++) {
            views[i].classList.remove('active');
        }
        for (var j = 0; j < tabs.length; j++) {
            tabs[j].classList.remove('active');
        }

        var targetView = document.getElementById('vrFP' + view.charAt(0).toUpperCase() + view.slice(1) + 'View');
        if (targetView) targetView.classList.add('active');
        if (btn) btn.classList.add('active');
    };

    // ===== EXPORT TO CALENDAR =====
    VR.exportFPToCalendar = function() {
        if (!VR.fpfpvData || VR.fpfpvData.length === 0) {
            console.log('VR: Ingen FP/FPV data att exportera');
            return;
        }

        var icsContent = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//VR CrewWeb//FP-FPV//SV\r\nCALSCALE:GREGORIAN\r\n';

        VR.fpfpvData.forEach(function(d, index) {
            var monthIdx = MONTH_NAMES.indexOf(d.manad);
            var dateStr = YEAR + ('0' + (monthIdx + 1)).slice(-2) + ('0' + d.dag).slice(-2);

            icsContent += 'BEGIN:VEVENT\r\n';
            icsContent += 'UID:fpfpv-' + index + '-' + dateStr + '@vrcrewweb\r\n';
            icsContent += 'DTSTART;VALUE=DATE:' + dateStr + '\r\n';
            icsContent += 'DTEND;VALUE=DATE:' + dateStr + '\r\n';
            icsContent += 'SUMMARY:' + d.visas + ' - Ledig\r\n';
            icsContent += 'DESCRIPTION:' + d.visas + ' (Fridag)\r\n';
            icsContent += 'END:VEVENT\r\n';
        });

        icsContent += 'END:VCALENDAR';

        var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'FP-FPV-' + YEAR + '.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('VR: Exporterade', VR.fpfpvData.length, 'dagar till kalender');
    };

    console.log('VR: FP/FPV loaded (new version)');
})();
