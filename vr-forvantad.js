// VR CrewWeb - Förväntat Schema (V.1.53 - PIN-lås, Reserv-turer, suffix-matchning)
(function() {
    'use strict';

    var VR = window.VR;
    var BASE = 'https://ke86.github.io/crewweb/';
    var PIN_CODE = '8612';

    // ===== FIXED TIMES FOR SPECIAL TOURS =====
    var RESERV_TIDER = {
        'Reserv1': { start: '05:00', slut: '13:00' },
        'Reserv2': { start: '07:00', slut: '15:00' },
        'Reserv3': { start: '13:00', slut: '19:00' },
        'Reserv4': { start: '14:30', slut: '22:30' }
    };

    // Suffix matching: last 3 digits → fixed times
    var SUFFIX_TIDER = {
        '291': { start: '03:45', slut: '11:00' },
        '281': { start: '05:00', slut: '12:00' }
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

    // ===== PIN LOCK DIALOG =====
    VR.showPinDialog = function(callback) {
        // If already authenticated this session, skip
        if (VR._pinAuthenticated) {
            callback();
            return;
        }

        var overlay = document.createElement('div');
        overlay.id = 'vrPinOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999990;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';

        var box = document.createElement('div');
        box.style.cssText = 'background:#1C1C1E;border-radius:20px;padding:32px 28px;width:280px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

        box.innerHTML = '\
<div style="font-size:36px;margin-bottom:8px">🔒</div>\
<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:4px">Inställningar</div>\
<div style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:24px">Ange PIN-kod</div>\
<div id="vrPinDots" style="display:flex;gap:12px;justify-content:center;margin-bottom:24px">\
<div class="vrPinDot" style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
<div class="vrPinDot" style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
<div class="vrPinDot" style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
<div class="vrPinDot" style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
</div>\
<div id="vrPinError" style="font-size:13px;color:#FF3B30;margin-bottom:16px;min-height:18px"></div>\
<div id="vrPinPad" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px"></div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var enteredPin = '';
        var dots = box.querySelectorAll('.vrPinDot');
        var errorEl = box.querySelector('#vrPinError');
        var padEl = box.querySelector('#vrPinPad');

        // Build number pad
        var keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
        for (var k = 0; k < keys.length; k++) {
            var btn = document.createElement('div');
            if (keys[k] === '') {
                btn.style.cssText = 'visibility:hidden';
            } else {
                var isBackspace = keys[k] === '⌫';
                btn.style.cssText = 'width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:' + (isBackspace ? '22px' : '26px') + ';font-weight:500;color:#fff;cursor:pointer;transition:background 0.15s;background:rgba(255,255,255,0.1);margin:0 auto;user-select:none;-webkit-user-select:none';
                btn.setAttribute('data-key', keys[k]);
                btn.onmousedown = function() { this.style.background = 'rgba(255,255,255,0.25)'; };
                btn.onmouseup = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
                btn.onmouseleave = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
                btn.ontouchstart = function(e) { e.preventDefault(); this.style.background = 'rgba(255,255,255,0.25)'; };
                btn.ontouchend = function(e) {
                    e.preventDefault();
                    this.style.background = 'rgba(255,255,255,0.1)';
                    handleKey(this.getAttribute('data-key'));
                };
                btn.onclick = function() {
                    handleKey(this.getAttribute('data-key'));
                };
            }
            btn.textContent = keys[k];
            padEl.appendChild(btn);
        }

        function updateDots() {
            for (var i = 0; i < 4; i++) {
                if (i < enteredPin.length) {
                    dots[i].style.background = '#9B59B6';
                    dots[i].style.borderColor = '#9B59B6';
                } else {
                    dots[i].style.background = 'transparent';
                    dots[i].style.borderColor = 'rgba(255,255,255,0.3)';
                }
            }
        }

        function shakeDots() {
            var container = box.querySelector('#vrPinDots');
            container.style.animation = 'none';
            container.offsetHeight; // trigger reflow
            container.style.animation = 'vrPinShake 0.4s ease';
        }

        // Add shake animation
        var style = document.createElement('style');
        style.textContent = '@keyframes vrPinShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}';
        document.head.appendChild(style);

        function handleKey(key) {
            errorEl.textContent = '';

            if (key === '⌫') {
                if (enteredPin.length > 0) {
                    enteredPin = enteredPin.slice(0, -1);
                    updateDots();
                }
                return;
            }

            if (enteredPin.length >= 4) return;

            enteredPin += key;
            updateDots();

            if (enteredPin.length === 4) {
                setTimeout(function() {
                    if (enteredPin === PIN_CODE) {
                        VR._pinAuthenticated = true;
                        // Success animation
                        for (var i = 0; i < 4; i++) {
                            dots[i].style.background = '#34C759';
                            dots[i].style.borderColor = '#34C759';
                        }
                        setTimeout(function() {
                            overlay.style.transition = 'opacity 0.25s';
                            overlay.style.opacity = '0';
                            setTimeout(function() {
                                overlay.remove();
                                style.remove();
                                callback();
                            }, 250);
                        }, 300);
                    } else {
                        // Wrong PIN
                        errorEl.textContent = 'Fel PIN-kod';
                        shakeDots();
                        for (var j = 0; j < 4; j++) {
                            dots[j].style.background = '#FF3B30';
                            dots[j].style.borderColor = '#FF3B30';
                        }
                        setTimeout(function() {
                            enteredPin = '';
                            updateDots();
                        }, 600);
                    }
                }, 150);
            }
        }

        // Close on overlay tap (outside box)
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                overlay.remove();
                style.remove();
            }
        };
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

    // ===== RESOLVE TOUR TIMES (priority chain) =====
    VR.resolveTourTimes = function(turnr, weekdayFull, weekdayAbbr, lookup) {
        if (!turnr) return null;

        var weekdayMap = VR._weekdayMap || {};
        var abbr = weekdayFull ? (weekdayMap[weekdayFull] || weekdayAbbr) : weekdayAbbr;

        // 1. JSON lookup (exact turnr + weekday)
        var lookupKey = turnr + '_' + abbr;
        var jsonMatch = lookup[lookupKey] || null;
        if (jsonMatch) {
            return { start: jsonMatch.start, slut: jsonMatch.slut, source: 'json' };
        }

        // 2. Reserv-turer (fixed times)
        if (RESERV_TIDER[turnr]) {
            return { start: RESERV_TIDER[turnr].start, slut: RESERV_TIDER[turnr].slut, source: 'reserv' };
        }

        // 3. Suffix matching (last 3 digits)
        var suffixMatch = turnr.match(/(\d{3})\w*$/);
        if (suffixMatch) {
            var suffix = suffixMatch[1];
            if (SUFFIX_TIDER[suffix]) {
                return { start: SUFFIX_TIDER[suffix].start, slut: SUFFIX_TIDER[suffix].slut, source: 'suffix' };
            }
        }

        return null;
    };

    // ===== MAIN FUNCTION =====
    VR.doForvantad = function() {
        // Show PIN dialog first
        VR.showPinDialog(function() {
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
            // TURNR can be: digits (15208), digits+letter (12173B), or Reserv1-4
            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)(?:\s*-\s*((?:\d{4,6}\w*|Reserv\d)))?/i);

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

                    currentDateParsed = {
                        day: parseInt(dateMatch[1], 10),
                        month: parsedMonth,
                        year: parsedYear,
                        weekday: dateMatch[4],
                        turnr: dateMatch[5] || null
                    };

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

                        if (currentDateParsed.turnr) {
                            VR.forvantadAllDays[dayKey].turnr = currentDateParsed.turnr;
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
                            if (VR.forvantadAllDays[dk]) {
                                VR.forvantadAllDays[dk].fp = 'FP';
                            }
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            if (VR.forvantadAllDays[dk]) {
                                VR.forvantadAllDays[dk].fp = 'FPV';
                            }
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

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var allDays = VR.forvantadAllDays;
        var sortedKeys = Object.keys(allDays).sort();

        if (sortedKeys.length === 0) {
            VR.hideLoader();
            VR.showView('', '', '<div style="padding:40px;text-align:center;color:#999;font-size:16px">Ingen data hittades</div>');
            return;
        }

        // Determine which months have data
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

                // Resolve tour times using priority chain
                var resolved = null;
                if (turnr) {
                    totalTurDays++;
                    var wdFull = dayRec ? dayRec.weekday : null;
                    resolved = VR.resolveTourTimes(turnr, wdFull, weekdayName, lookup);
                    if (resolved) matchedCount++;
                }

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
                    resolved: resolved
                };

                // Determine times
                if (fp) {
                    // Free day
                } else if (resolved) {
                    dayData.startTime = resolved.start;
                    dayData.endTime = resolved.slut;
                    var sP = resolved.start.split(':');
                    var eP = resolved.slut.split(':');
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

        console.log('VR: Resolved ' + matchedCount + '/' + totalTurDays + ' tours');

        // Period text
        var firstMonth = monthGroups[0];
        var lastMonth = monthGroups[monthGroups.length - 1];
        var periodText;
        if (monthGroups.length === 1) {
            periodText = firstMonth.name + ' ' + firstMonth.year;
        } else {
            periodText = firstMonth.name + ' – ' + lastMonth.name + ' ' + lastMonth.year;
        }

        // Build HTML
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

    // ===== SOURCE LABEL =====
    VR.getSourceLabel = function(source) {
        if (source === 'json') return '';
        if (source === 'reserv') return 'R';
        if (source === 'suffix') return 'S';
        return '';
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
            } else {
                rowBg = weekendBg || bgCol;
            }

            html += '<div style="display:grid;grid-template-columns:1.4fr 0.6fr 0.6fr 0.6fr 0.8fr;gap:6px;padding:11px 16px;background:' + rowBg + ';border-bottom:1px solid #EBEBEB;align-items:center">';

            // Day column
            var dayColor = day.isFree ? '#fff' : (noData ? '#999' : (day.isWeekend ? '#FF9500' : '#333'));
            var dayLabel = day.weekday + ' ' + ('0' + day.day).slice(-2);
            html += '<div style="color:' + dayColor + '">';
            html += '<div style="font-size:15px;font-weight:700;line-height:1.2">' + dayLabel + '</div>';
            if (day.isFree) {
                html += '<div style="font-size:11px;font-weight:500;opacity:0.85">' + day.freeType + '</div>';
            }
            html += '</div>';

            // Determine display values
            var startVal = '—';
            var slutVal = '—';
            var tidVal = '—';
            var turVal = '';
            var isResolved = !!day.resolved;

            if (day.isFree) {
                startVal = ''; slutVal = ''; tidVal = ''; turVal = '';
            } else if (noData) {
                startVal = '?'; slutVal = '?'; tidVal = '?'; turVal = '';
            } else if (isResolved) {
                startVal = day.startTime;
                slutVal = day.endTime;
                tidVal = VR.formatDuration(day.duration);
                turVal = day.turnr;
            } else if (day.turnr) {
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

            // Colors
            var valColor = day.isFree ? '#fff' : (noData ? '#aaa' : '#333');
            var dimColor = day.isFree ? '#fff' : '#aaa';
            var accentColor = isResolved ? '#007AFF' : valColor;

            var sColor = (startVal === '?' || startVal === '~' || startVal === '—') ? dimColor : accentColor;
            html += '<div style="font-size:15px;font-weight:' + (isResolved ? '700' : '400') + ';color:' + sColor + '">' + startVal + '</div>';

            var eColor = (slutVal === '?' || slutVal === '~' || slutVal === '—') ? dimColor : accentColor;
            html += '<div style="font-size:15px;font-weight:' + (isResolved ? '700' : '400') + ';color:' + eColor + '">' + slutVal + '</div>';

            var tColor = (tidVal === '?' || tidVal === '~' || tidVal === '—') ? dimColor : valColor;
            html += '<div style="font-size:14px;color:' + tColor + '">' + tidVal + '</div>';

            // Tour badge
            if (turVal) {
                var sourceLabel = day.resolved ? VR.getSourceLabel(day.resolved.source) : '';
                var turBg, turTxtColor;
                if (day.resolved && day.resolved.source === 'json') {
                    turBg = 'rgba(0,122,255,0.1)'; turTxtColor = '#007AFF';
                } else if (day.resolved && day.resolved.source === 'reserv') {
                    turBg = 'rgba(155,89,182,0.12)'; turTxtColor = '#9B59B6';
                } else if (day.resolved && day.resolved.source === 'suffix') {
                    turBg = 'rgba(76,217,100,0.12)'; turTxtColor = '#2ECC71';
                } else {
                    turBg = 'rgba(0,0,0,0.05)'; turTxtColor = '#999';
                }
                var badgeText = sourceLabel ? turVal + ' ' + sourceLabel : turVal;
                html += '<div style="text-align:right"><span style="font-size:11px;font-weight:600;color:' + turTxtColor + ';background:' + turBg + ';padding:3px 7px;border-radius:6px;display:inline-block">' + badgeText + '</span></div>';
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
