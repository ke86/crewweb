// VR CrewWeb - Inställningar / Förväntat Schema (V.1.53 - PIN-lås, Reserv-turer)
(function() {
    'use strict';

    var VR = window.VR;
    var BASE = 'https://ke86.github.io/crewweb/';
    var PIN_CODE = '8612';

    // ===== RESERV TOUR FIXED TIMES =====
    var RESERV_TIDER = {
        'Reserv1': { start: '05:00', slut: '13:00' },
        'Reserv2': { start: '07:00', slut: '15:00' },
        'Reserv3': { start: '13:00', slut: '19:00' },
        'Reserv4': { start: '14:30', slut: '22:30' }
    };

    // ===== PIN LOCK =====
    VR.doInstallningar = function() {
        VR.closeOverlay();

        // If already unlocked this session, go straight
        if (VR._pinUnlocked) {
            VR.showInstallningarMenu();
            return;
        }

        VR.showPinDialog(function() {
            VR._pinUnlocked = true;
            VR.showInstallningarMenu();
        });
    };

    VR.showPinDialog = function(onSuccess) {
        var old = document.getElementById('vrPinOverlay');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'vrPinOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999995;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif';

        var entered = '';
        var maxLen = 4;

        function renderDots() {
            var dots = '';
            for (var i = 0; i < maxLen; i++) {
                var filled = i < entered.length;
                dots += '<div style="width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,0.5);background:' + (filled ? '#fff' : 'transparent') + ';margin:0 8px;transition:background 0.15s"></div>';
            }
            return dots;
        }

        function renderKeypad() {
            var keys = [
                ['1','2','3'],
                ['4','5','6'],
                ['7','8','9'],
                ['','0','⌫']
            ];
            var html = '';
            for (var r = 0; r < keys.length; r++) {
                html += '<div style="display:flex;justify-content:center;gap:16px;margin-bottom:12px">';
                for (var c = 0; c < keys[r].length; c++) {
                    var k = keys[r][c];
                    if (k === '') {
                        html += '<div style="width:72px;height:72px"></div>';
                    } else {
                        html += '<div class="vrPinKey" data-key="' + k + '" style="width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:' + (k === '⌫' ? '24px' : '28px') + ';color:#fff;cursor:pointer;user-select:none;transition:background 0.15s;-webkit-tap-highlight-color:transparent">' + k + '</div>';
                    }
                }
                html += '</div>';
            }
            return html;
        }

        overlay.innerHTML = '\
<div style="background:#1C1C1E;border-radius:24px;padding:30px 24px;width:300px;max-width:90vw;text-align:center">\
    <div style="font-size:13px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">🔒 Låst</div>\
    <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:24px">Ange PIN-kod</div>\
    <div id="vrPinDots" style="display:flex;justify-content:center;margin-bottom:28px">' + renderDots() + '</div>\
    <div id="vrPinError" style="font-size:13px;color:#FF3B30;margin-bottom:12px;min-height:18px"></div>\
    <div id="vrPinKeypad">' + renderKeypad() + '</div>\
    <div style="margin-top:16px"><span id="vrPinCancel" style="font-size:15px;color:rgba(255,255,255,0.4);cursor:pointer">Avbryt</span></div>\
</div>';

        document.body.appendChild(overlay);

        // Cancel
        document.getElementById('vrPinCancel').onclick = function() {
            overlay.remove();
        };

        // Tap outside to close
        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.remove();
        };

        // Key handlers
        var pinKeys = overlay.querySelectorAll('.vrPinKey');
        for (var i = 0; i < pinKeys.length; i++) {
            pinKeys[i].ontouchstart = function() {
                this.style.background = 'rgba(255,255,255,0.3)';
            };
            pinKeys[i].ontouchend = function() {
                this.style.background = 'rgba(255,255,255,0.12)';
            };
            pinKeys[i].onmousedown = function() {
                this.style.background = 'rgba(255,255,255,0.3)';
            };
            pinKeys[i].onmouseup = function() {
                this.style.background = 'rgba(255,255,255,0.12)';
            };
            pinKeys[i].onclick = function(e) {
                e.stopPropagation();
                var key = this.getAttribute('data-key');

                if (key === '⌫') {
                    entered = entered.slice(0, -1);
                } else if (entered.length < maxLen) {
                    entered += key;
                }

                document.getElementById('vrPinDots').innerHTML = renderDots();
                document.getElementById('vrPinError').textContent = '';

                // Check PIN when 4 digits entered
                if (entered.length === maxLen) {
                    if (entered === PIN_CODE) {
                        // Success — flash green and continue
                        var dots = document.getElementById('vrPinDots');
                        if (dots) {
                            var allDots = dots.querySelectorAll('div');
                            for (var d = 0; d < allDots.length; d++) {
                                allDots[d].style.background = '#4CD964';
                                allDots[d].style.borderColor = '#4CD964';
                            }
                        }
                        setTimeout(function() {
                            overlay.remove();
                            onSuccess();
                        }, 300);
                    } else {
                        // Wrong PIN — shake and reset
                        document.getElementById('vrPinError').textContent = 'Fel PIN-kod';
                        var dotsEl = document.getElementById('vrPinDots');
                        if (dotsEl) {
                            dotsEl.style.animation = 'vrPinShake 0.4s ease';
                            var allD = dotsEl.querySelectorAll('div');
                            for (var x = 0; x < allD.length; x++) {
                                allD[x].style.background = '#FF3B30';
                                allD[x].style.borderColor = '#FF3B30';
                            }
                            setTimeout(function() {
                                entered = '';
                                document.getElementById('vrPinDots').innerHTML = renderDots();
                                dotsEl.style.animation = '';
                            }, 600);
                        }
                    }
                }
            };
        }

        // Add shake animation if not already present
        if (!document.getElementById('vrPinStyle')) {
            var style = document.createElement('style');
            style.id = 'vrPinStyle';
            style.textContent = '@keyframes vrPinShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}';
            document.head.appendChild(style);
        }
    };

    // ===== INSTÄLLNINGAR MENU (after PIN unlock) =====
    VR.showInstallningarMenu = function() {
        var html = '\
<div style="background:#fff;border-radius:16px;padding:14px 20px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:22px;font-weight:700;color:#333">⚙️ Inställningar</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:4px">Välj funktion</div>\
</div>\
<div style="display:flex;flex-direction:column;gap:10px">';

        var menuItems = [
            { icon: '📅', label: 'Förväntat Schema', desc: 'Visa turer & tider för kommande månader', action: 'doForvantad', color: '#9B59B6' }
        ];

        for (var i = 0; i < menuItems.length; i++) {
            var m = menuItems[i];
            html += '\
<div class="vrSettingsItem" data-action="' + m.action + '" style="background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 3px 10px rgba(0,0,0,0.06);cursor:pointer;display:flex;align-items:center;gap:14px;transition:transform 0.15s,box-shadow 0.15s">\
<div style="width:48px;height:48px;border-radius:14px;background:' + m.color + ';display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">' + m.icon + '</div>\
<div style="flex:1">\
<div style="font-size:16px;font-weight:700;color:#333">' + m.label + '</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:2px">' + m.desc + '</div>\
</div>\
<div style="font-size:18px;color:#ccc">›</div>\
</div>';
        }

        html += '</div>';

        VR.showView('', '', html);

        // Bind click handlers
        setTimeout(function() {
            var items = document.querySelectorAll('.vrSettingsItem');
            for (var j = 0; j < items.length; j++) {
                items[j].onclick = function() {
                    var action = this.getAttribute('data-action');
                    if (VR[action]) VR[action]();
                };
                items[j].onmouseenter = function() {
                    this.style.transform = 'scale(1.01)';
                    this.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                };
                items[j].onmouseleave = function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 3px 10px rgba(0,0,0,0.06)';
                };
            }
        }, 100);
    };

    // ===== DETERMINE NEXT UNRELEASED MONTH =====
    VR.getNextUnreleasedMonth = function() {
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth();
        var year = today.getFullYear();

        if (day < 16) {
            month += 1;
        } else {
            month += 2;
        }

        if (month > 11) {
            month -= 12;
            year += 1;
        }

        return { month: month, year: year };
    };

    // ===== LOAD TOUR JSON DATA =====
    VR.loadTurerJSON = function(callback) {
        if (VR._turerData) {
            callback(VR._turerData);
            return;
        }

        var url = BASE + 'turer-malmo-2026.json?' + Date.now();
        console.log('VR: Fetching tour data from ' + url);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    VR._turerData = data;
                    console.log('VR: Loaded ' + (data.turer ? data.turer.length : 0) + ' tours');
                    callback(data);
                } catch (e) {
                    console.error('VR: Failed to parse tour JSON', e);
                    callback(null);
                }
            } else {
                console.warn('VR: Tour JSON fetch failed, status=' + xhr.status);
                callback(null);
            }
        };
        xhr.onerror = function() {
            console.warn('VR: Tour JSON fetch error');
            callback(null);
        };
        xhr.send();
    };

    // ===== BUILD TOUR LOOKUP MAP =====
    VR.buildTurerLookup = function(turerData) {
        var lookup = {};
        if (!turerData || !turerData.turer) return lookup;

        var weekdayMap = {
            'Måndag': 'Mån', 'Tisdag': 'Tis', 'Onsdag': 'Ons',
            'Torsdag': 'Tor', 'Fredag': 'Fre', 'Lördag': 'Lör', 'Söndag': 'Sön'
        };
        VR._weekdayMap = weekdayMap;

        for (var i = 0; i < turerData.turer.length; i++) {
            var t = turerData.turer[i];
            var normTurnr = (t.turnr || '').replace(/\s*-\s*TP$/i, '').trim();
            var key = normTurnr + '_' + t.dag;

            if (!lookup[key]) {
                lookup[key] = {
                    start: t.start,
                    slut: t.slut,
                    turnr: t.turnr,
                    dag: t.dag
                };
            }
        }

        console.log('VR: Built tour lookup with ' + Object.keys(lookup).length + ' entries');
        return lookup;
    };

    // ===== CHECK IF RESERV TOUR =====
    VR.getReservTider = function(turnr) {
        if (!turnr) return null;
        // Match "Reserv1", "Reserv2", etc. (case-insensitive, with or without spaces)
        var clean = turnr.replace(/\s+/g, '');
        for (var key in RESERV_TIDER) {
            if (clean.toLowerCase() === key.toLowerCase()) {
                return RESERV_TIDER[key];
            }
        }
        // Also match partial: "Res1", "R1", "RESERV 1"
        var resMatch = turnr.match(/[Rr](?:eserv)?\s*([1-4])/);
        if (resMatch) {
            var resKey = 'Reserv' + resMatch[1];
            return RESERV_TIDER[resKey] || null;
        }
        return null;
    };

    // ===== MAIN FUNCTION =====
    VR.doForvantad = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Förväntat Schema');
        VR.updateLoader(5, 'Beräknar period...');

        var target = VR.getNextUnreleasedMonth();
        VR.forvantadStartMonth = target.month;
        VR.forvantadStartYear = target.year;
        VR.forvantadAllDays = {};

        VR.updateLoader(10, 'Navigerar...');
        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseForvantadData);
        });
    };

    // ===== PARSE ALL FUTURE MONTHS FROM LÖNEREDOVISNINGAR =====
    VR.parseForvantadData = function() {
        VR.updateLoader(80, 'Analyserar data...');

        var startMonth = VR.forvantadStartMonth;
        var startYear = VR.forvantadStartYear;

        var currentDateParsed = null;
        var allElements = document.body.querySelectorAll('*');
        var monthsFound = {};

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            // Match date headers: "DD-MM-YYYY - Weekday" or "DD-MM-YYYY - Weekday - TURNR"
            // TURNR can be numeric (15208) or text (Reserv1, Reserv 2, etc.)
            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)(?:\s*-\s*(.+))?$/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    var parsedMonth = parseInt(dateMatch[2], 10) - 1;
                    var parsedYear = parseInt(dateMatch[3], 10);
                    var rawTurnr = dateMatch[5] ? dateMatch[5].trim() : null;

                    currentDateParsed = {
                        day: parseInt(dateMatch[1], 10),
                        month: parsedMonth,
                        year: parsedYear,
                        weekday: dateMatch[4],
                        turnr: rawTurnr
                    };

                    // Only process months >= start month
                    var isRelevant = (parsedYear > startYear) ||
                        (parsedYear === startYear && parsedMonth >= startMonth);

                    if (isRelevant) {
                        var monthKey = parsedYear + '-' + ('0' + (parsedMonth + 1)).slice(-2);
                        monthsFound[monthKey] = true;

                        var dayKey = monthKey + '-' + ('0' + currentDateParsed.day).slice(-2);

                        if (!VR.forvantadAllDays[dayKey]) {
                            VR.forvantadAllDays[dayKey] = {
                                day: currentDateParsed.day,
                                month: parsedMonth,
                                year: parsedYear,
                                weekday: currentDateParsed.weekday,
                                turnr: null,
                                fp: null,
                                obMinutes: 0
                            };
                        }

                        if (rawTurnr) {
                            VR.forvantadAllDays[dayKey].turnr = rawTurnr;
                        }
                    }
                }
            }

            // Parse table data for ALL relevant months
            if (el.tagName === 'TABLE' && currentDateParsed) {
                var isRelevant2 = (currentDateParsed.year > startYear) ||
                    (currentDateParsed.year === startYear && currentDateParsed.month >= startMonth);

                if (isRelevant2) {
                    var mk = currentDateParsed.year + '-' + ('0' + (currentDateParsed.month + 1)).slice(-2);
                    var dk = mk + '-' + ('0' + currentDateParsed.day).slice(-2);

                    var rows = el.querySelectorAll('tr');
                    for (var r = 0; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < 2) continue;

                        var col1 = cells[0] ? cells[0].textContent.trim() : '';
                        var col2 = cells[1] ? cells[1].textContent.trim() : '';

                        if (col1.toLowerCase() === 'löneslag') continue;

                        if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            if (VR.forvantadAllDays[dk]) VR.forvantadAllDays[dk].fp = 'FP';
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            if (VR.forvantadAllDays[dk]) VR.forvantadAllDays[dk].fp = 'FPV';
                        }

                        if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                            var timeMatch = col2.match(/(\d+):(\d+)/);
                            if (timeMatch && VR.forvantadAllDays[dk]) {
                                var hours = parseInt(timeMatch[1], 10);
                                var minutes = parseInt(timeMatch[2], 10);
                                VR.forvantadAllDays[dk].obMinutes += hours * 60 + minutes;
                            }
                        }
                    }
                }
            }
        }

        var dayCount = Object.keys(VR.forvantadAllDays).length;
        var monthCount = Object.keys(monthsFound).length;
        console.log('VR: Parsed ' + dayCount + ' days across ' + monthCount + ' months');

        VR.updateLoader(88, 'Hämtar turdata...');
        VR.loadTurerJSON(function(turerData) {
            VR.forvantadLookup = VR.buildTurerLookup(turerData);
            VR.updateLoader(95, 'Bygger vy...');
            setTimeout(VR.renderForvantad, 300);
        });
    };

    // ===== RENDER FORVANTAD SCHEMA =====
    VR.renderForvantad = function() {
        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        var weekdayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
        var lookup = VR.forvantadLookup || {};
        var weekdayMap = VR._weekdayMap || {};

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var allDays = VR.forvantadAllDays;
        var sortedKeys = Object.keys(allDays).sort();

        if (sortedKeys.length === 0) {
            VR.hideLoader();
            VR.showView('', '', '<div style="padding:40px;text-align:center;color:#999;font-size:16px">Ingen data hittades</div>');
            return;
        }

        // Determine which months we have data for
        var monthsMap = {};
        for (var k = 0; k < sortedKeys.length; k++) {
            var rec = allDays[sortedKeys[k]];
            var mKey = rec.year + '-' + ('0' + (rec.month + 1)).slice(-2);
            if (!monthsMap[mKey]) {
                monthsMap[mKey] = { month: rec.month, year: rec.year };
            }
        }
        var monthKeys = Object.keys(monthsMap).sort();

        // Build per-month day arrays
        var monthGroups = [];
        var matchedCount = 0;
        var totalTurDays = 0;

        for (var mi = 0; mi < monthKeys.length; mi++) {
            var mInfo = monthsMap[monthKeys[mi]];
            var daysInMonth = new Date(mInfo.year, mInfo.month + 1, 0).getDate();
            var monthDays = [];

            for (var d = 1; d <= daysInMonth; d++) {
                var dKey = mInfo.year + '-' + ('0' + (mInfo.month + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
                var dayRec = allDays[dKey] || null;

                var date = new Date(mInfo.year, mInfo.month, d);
                var weekday = date.getDay();
                var isWeekend = (weekday === 0 || weekday === 6);
                var weekdayName = weekdayNames[weekday];

                var hasData = !!dayRec;
                var turnr = dayRec ? dayRec.turnr : null;
                var fp = dayRec ? dayRec.fp : null;
                var obMin = dayRec ? dayRec.obMinutes : 0;

                // Check Reserv tours first
                var reservMatch = VR.getReservTider(turnr);

                // Then check JSON lookup
                var tourMatch = null;
                if (!reservMatch && turnr) {
                    var wdFull = dayRec ? dayRec.weekday : null;
                    var abbr = wdFull ? (weekdayMap[wdFull] || weekdayName) : weekdayName;
                    var lookupKey = turnr + '_' + abbr;
                    tourMatch = lookup[lookupKey] || null;
                }

                if (turnr) totalTurDays++;
                if (reservMatch || tourMatch) matchedCount++;

                var dayData = {
                    day: d,
                    weekday: weekdayName,
                    isWeekend: isWeekend,
                    hasData: hasData,
                    isFree: !!fp,
                    freeType: fp,
                    hasOB: obMin > 0,
                    obMinutes: obMin,
                    startTime: null,
                    endTime: null,
                    duration: null,
                    turnr: turnr,
                    hasTourMatch: !!(reservMatch || tourMatch),
                    isReserv: !!reservMatch
                };

                // Determine times
                if (fp) {
                    // Free day
                } else if (reservMatch) {
                    dayData.startTime = reservMatch.start;
                    dayData.endTime = reservMatch.slut;
                    var rsP = reservMatch.start.split(':');
                    var reP = reservMatch.slut.split(':');
                    var rsMin = parseInt(rsP[0], 10) * 60 + parseInt(rsP[1], 10);
                    var reMin = parseInt(reP[0], 10) * 60 + parseInt(reP[1], 10);
                    if (reMin < rsMin) reMin += 24 * 60;
                    dayData.duration = reMin - rsMin;
                } else if (tourMatch) {
                    dayData.startTime = tourMatch.start;
                    dayData.endTime = tourMatch.slut;
                    var sP = tourMatch.start.split(':');
                    var eP = tourMatch.slut.split(':');
                    var sMin = parseInt(sP[0], 10) * 60 + parseInt(sP[1], 10);
                    var eMin = parseInt(eP[0], 10) * 60 + parseInt(eP[1], 10);
                    if (eMin < sMin) eMin += 24 * 60;
                    dayData.duration = eMin - sMin;
                } else if (!hasData) {
                    // Unknown
                } else if (isWeekend && obMin > 0) {
                    dayData.duration = obMin;
                } else if (!isWeekend && obMin > 0) {
                    var startMinutes = 6 * 60 - obMin;
                    var endMinutes = startMinutes + 8 * 60;
                    dayData.startTime = VR.minutesToTime(startMinutes);
                    dayData.endTime = VR.minutesToTime(endMinutes);
                    dayData.duration = 8 * 60;
                } else if (!isWeekend && hasData && !turnr) {
                    dayData.startTime = '06:00';
                    dayData.endTime = '16:00';
                    dayData.duration = 10 * 60;
                }

                monthDays.push(dayData);
            }

            monthGroups.push({
                month: mInfo.month,
                year: mInfo.year,
                name: monthNames[mInfo.month],
                days: monthDays
            });
        }

        console.log('VR: Matched ' + matchedCount + '/' + totalTurDays + ' tours (incl. Reserv)');

        // Period text
        var firstMonth = monthGroups[0];
        var lastMonth = monthGroups[monthGroups.length - 1];
        var periodText;
        if (monthGroups.length === 1) {
            periodText = firstMonth.name + ' ' + firstMonth.year;
        } else {
            periodText = firstMonth.name + ' – ' + lastMonth.name + ' ' + lastMonth.year;
        }

        var html = VR.buildForvantadHeader(periodText, matchedCount, totalTurDays, monthGroups.length);

        for (var gi = 0; gi < monthGroups.length; gi++) {
            html += VR.buildMonthSection(monthGroups[gi], gi === 0);
        }

        VR.hideLoader();
        VR.showView('', '', html);
    };

    // ===== HELPER: MINUTES TO TIME =====
    VR.minutesToTime = function(minutes) {
        if (minutes < 0) minutes += 24 * 60;
        var h = Math.floor(minutes / 60) % 24;
        var m = minutes % 60;
        return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
    };

    // ===== HELPER: FORMAT DURATION =====
    VR.formatDuration = function(totalMinutes) {
        var h = Math.floor(totalMinutes / 60);
        var m = totalMinutes % 60;
        if (m === 0) return h + 'h';
        return h + 'h' + ('0' + m).slice(-2) + 'm';
    };

    // ===== BUILD HEADER =====
    VR.buildForvantadHeader = function(periodText, matchedCount, totalTurDays, monthCount) {
        var matchLine = '';
        if (totalTurDays > 0) {
            matchLine = '<div style="font-size:12px;color:#4CD964;margin-top:3px">✓ ' + matchedCount + '/' + totalTurDays + ' turer matchade</div>';
        } else {
            matchLine = '<div style="font-size:12px;color:#FF9500;margin-top:3px">Ingen turdata tillgänglig</div>';
        }

        return '\
<div style="background:#fff;border-radius:16px;padding:14px 20px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:22px;font-weight:700;color:#333">' + periodText + '</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:4px">Förväntat schema · ' + monthCount + ' månader (ej officiellt)</div>\
' + matchLine + '\
</div>';
    };

    // ===== BUILD MONTH SECTION =====
    VR.buildMonthSection = function(group, isFirst) {
        var html = '';

        html += '\
<div style="background:#1C1C1E;border-radius:' + (isFirst ? '27px 27px' : '16px 16px') + ' 0 0;padding:14px 16px;margin-top:' + (isFirst ? '0' : '16px') + ';display:flex;justify-content:space-between;align-items:center">\
<div style="font-size:17px;font-weight:700;color:#fff">' + group.name + ' ' + group.year + '</div>\
<div style="font-size:12px;color:rgba(255,255,255,0.5)">' + group.days.length + ' dagar</div>\
</div>';

        html += '\
<div style="display:grid;grid-template-columns:1.4fr 0.6fr 0.6fr 0.6fr 0.8fr;gap:6px;padding:10px 16px;background:#2C2C2E">\
<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px">Dag</div>\
<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px">Start</div>\
<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px">Slut</div>\
<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px">Tid</div>\
<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;text-align:right">Tur</div>\
</div>';

        html += '<div style="background:#fff;border-radius:0 0 27px 27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        for (var i = 0; i < group.days.length; i++) {
            var day = group.days[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#FAFAFA';
            var weekendBg = day.isWeekend ? 'rgba(255,149,0,0.06)' : '';
            var noData = !day.hasData && !day.isFree;

            var rowBg;
            if (day.isFree) {
                rowBg = day.freeType === 'FPV' ? '#4CD964' : '#34C759';
            } else if (noData) {
                rowBg = '#F0F0F0';
            } else if (day.isReserv) {
                rowBg = 'rgba(255,149,0,0.08)';
            } else {
                rowBg = weekendBg || bgCol;
            }

            html += '<div style="display:grid;grid-template-columns:1.4fr 0.6fr 0.6fr 0.6fr 0.8fr;gap:6px;padding:11px 16px;background:' + rowBg + ';border-bottom:1px solid #EBEBEB;align-items:center">';

            // DAY
            var dayColor = day.isFree ? '#fff' : (noData ? '#999' : (day.isWeekend ? '#FF9500' : '#333'));
            var dayLabel = day.weekday + ' ' + ('0' + day.day).slice(-2);
            html += '<div style="color:' + dayColor + '">';
            html += '<div style="font-size:15px;font-weight:700;line-height:1.2">' + dayLabel + '</div>';
            if (day.isFree) {
                html += '<div style="font-size:11px;font-weight:500;opacity:0.85">' + day.freeType + '</div>';
            }
            html += '</div>';

            // VALUES
            var startVal = '—';
            var slutVal = '—';
            var tidVal = '—';
            var turVal = '';

            if (day.isFree) {
                startVal = ''; slutVal = ''; tidVal = ''; turVal = '';
            } else if (noData) {
                startVal = '?'; slutVal = '?'; tidVal = '?'; turVal = '';
            } else if (day.hasTourMatch) {
                startVal = day.startTime;
                slutVal = day.endTime;
                tidVal = VR.formatDuration(day.duration);
                turVal = day.turnr;
            } else if (day.turnr && !day.hasTourMatch) {
                turVal = day.turnr;
                if (day.hasOB && day.startTime) {
                    startVal = day.startTime; slutVal = '~'; tidVal = '~';
                } else if (day.isWeekend && day.hasOB) {
                    startVal = '?'; slutVal = '?'; tidVal = VR.formatDuration(day.duration);
                } else if (day.startTime && day.endTime) {
                    startVal = day.startTime; slutVal = day.endTime; tidVal = '~';
                }
            } else if (day.isWeekend && day.hasOB) {
                startVal = '?'; slutVal = '?'; tidVal = VR.formatDuration(day.duration);
            } else if (day.hasOB && day.startTime) {
                startVal = day.startTime; slutVal = '~'; tidVal = '~';
            } else if (day.startTime && day.endTime) {
                startVal = day.startTime; slutVal = day.endTime; tidVal = '~';
            }

            // COLORS
            var valColor = day.isFree ? '#fff' : (noData ? '#aaa' : '#333');
            var dimColor = day.isFree ? '#fff' : '#aaa';
            var accentColor = day.isReserv ? '#FF9500' : (day.hasTourMatch ? '#007AFF' : valColor);

            var sColor = (startVal === '?' || startVal === '~' || startVal === '—') ? dimColor : accentColor;
            html += '<div style="font-size:15px;font-weight:' + (day.hasTourMatch ? '700' : '400') + ';color:' + sColor + '">' + startVal + '</div>';

            var eColor = (slutVal === '?' || slutVal === '~' || slutVal === '—') ? dimColor : accentColor;
            html += '<div style="font-size:15px;font-weight:' + (day.hasTourMatch ? '700' : '400') + ';color:' + eColor + '">' + slutVal + '</div>';

            var tColor = (tidVal === '?' || tidVal === '~' || tidVal === '—') ? dimColor : valColor;
            html += '<div style="font-size:14px;color:' + tColor + '">' + tidVal + '</div>';

            // TUR badge
            if (turVal) {
                var turBg, turTxtColor;
                if (day.isReserv) {
                    turBg = 'rgba(255,149,0,0.15)';
                    turTxtColor = '#FF9500';
                } else if (day.hasTourMatch) {
                    turBg = 'rgba(0,122,255,0.1)';
                    turTxtColor = '#007AFF';
                } else {
                    turBg = 'rgba(0,0,0,0.05)';
                    turTxtColor = '#999';
                }
                html += '<div style="text-align:right"><span style="font-size:11px;font-weight:600;color:' + turTxtColor + ';background:' + turBg + ';padding:3px 7px;border-radius:6px;display:inline-block">' + turVal + '</span></div>';
            } else if (day.isFree || noData) {
                html += '<div></div>';
            } else {
                html += '<div style="text-align:right;font-size:12px;color:#ccc">—</div>';
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    console.log('VR: Förväntat loaded');
})();
