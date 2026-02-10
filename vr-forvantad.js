// VR CrewWeb - Förväntat Schema (V.1.51 - med turnr + tider från JSON)
(function() {
    'use strict';

    var VR = window.VR;
    var BASE = 'https://ke86.github.io/crewweb/';

    // ===== DETERMINE NEXT UNRELEASED MONTH =====
    VR.getNextUnreleasedMonth = function() {
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth();
        var year = today.getFullYear();

        // If before 16th, next month is unreleased
        // If 16th or after, month after next is unreleased
        if (day < 16) {
            month += 1;
        } else {
            month += 2;
        }

        // Handle year overflow
        if (month > 11) {
            month -= 12;
            year += 1;
        }

        return { month: month, year: year };
    };

    // ===== LOAD TOUR JSON DATA =====
    VR.loadTurerJSON = function(callback) {
        // Cache the data
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
    // Key: turnr (normalized) + weekday abbreviation
    // The JSON has weekday as "Mån","Tis","Ons","Tor","Fre","Lör","Sön"
    // CrewWeb has full names: "Måndag","Tisdag", etc.
    VR.buildTurerLookup = function(turerData) {
        var lookup = {};
        if (!turerData || !turerData.turer) return lookup;

        // Map full weekday names to abbreviations used in JSON
        var weekdayMap = {
            'Måndag': 'Mån', 'Tisdag': 'Tis', 'Onsdag': 'Ons',
            'Torsdag': 'Tor', 'Fredag': 'Fre', 'Lördag': 'Lör', 'Söndag': 'Sön'
        };
        VR._weekdayMap = weekdayMap;

        for (var i = 0; i < turerData.turer.length; i++) {
            var t = turerData.turer[i];
            // Normalize turnr: strip suffixes like " - TP", take just the number part
            var normTurnr = (t.turnr || '').replace(/\s*-\s*TP$/i, '').trim();
            var key = normTurnr + '_' + t.dag;

            // Only keep first match (same tour+weekday should have same times)
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

    // ===== MAIN FUNCTION =====
    VR.doForvantad = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Förväntat Schema');
        VR.updateLoader(5, 'Beräknar månad...');

        var target = VR.getNextUnreleasedMonth();
        VR.forvantadMonth = target.month;
        VR.forvantadYear = target.year;
        VR.forvantadFP = [];
        VR.forvantadOB = {};
        VR.forvantadTurer = {}; // tour numbers by day

        VR.updateLoader(10, 'Navigerar...');
        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseForvantadData);
        });
    };

    // ===== PARSE BOTH FP/FPV, OB AND TOUR NUMBERS FROM LÖNEREDOVISNINGAR =====
    VR.parseForvantadData = function() {
        VR.updateLoader(80, 'Analyserar data...');

        var targetMonth = VR.forvantadMonth;
        var targetYear = VR.forvantadYear;

        var currentDate = null;
        var currentDateParsed = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            // Match date headers: "DD-MM-YYYY - Weekday" or "DD-MM-YYYY - Weekday - TURNR"
            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)(?:\s*-\s*(\d{4,6}\w*))?/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    currentDateParsed = {
                        day: parseInt(dateMatch[1], 10),
                        month: parseInt(dateMatch[2], 10) - 1,
                        year: parseInt(dateMatch[3], 10),
                        weekday: dateMatch[4],
                        turnr: dateMatch[5] || null
                    };
                    currentDate = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];

                    // Store tour number for this day
                    if (currentDateParsed.turnr && currentDateParsed.month === targetMonth && currentDateParsed.year === targetYear) {
                        VR.forvantadTurer[currentDateParsed.day] = {
                            turnr: currentDateParsed.turnr,
                            weekday: currentDateParsed.weekday
                        };
                        console.log('VR: Day ' + currentDateParsed.day + ' turnr=' + currentDateParsed.turnr + ' (' + currentDateParsed.weekday + ')');
                    }
                }
            }

            // Parse table data
            if (el.tagName === 'TABLE' && currentDateParsed) {
                // Only process if in target month
                if (currentDateParsed.month === targetMonth && currentDateParsed.year === targetYear) {
                    var rows = el.querySelectorAll('tr');
                    for (var r = 0; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < 2) continue;

                        var col1 = cells[0] ? cells[0].textContent.trim() : '';
                        var col2 = cells[1] ? cells[1].textContent.trim() : '';

                        if (col1.toLowerCase() === 'löneslag') continue;

                        // Check for FP/FPV
                        if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            var exists = VR.forvantadFP.some(function(f) { return f.day === currentDateParsed.day; });
                            if (!exists) {
                                VR.forvantadFP.push({
                                    day: currentDateParsed.day,
                                    type: 'FP',
                                    weekday: currentDateParsed.weekday
                                });
                            }
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            var exists2 = VR.forvantadFP.some(function(f) { return f.day === currentDateParsed.day; });
                            if (!exists2) {
                                VR.forvantadFP.push({
                                    day: currentDateParsed.day,
                                    type: 'FPV',
                                    weekday: currentDateParsed.weekday
                                });
                            }
                        }

                        // Check for OB (L.Hb or L.Storhelgstillägg)
                        if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                            var timeMatch = col2.match(/(\d+):(\d+)/);
                            if (timeMatch) {
                                var hours = parseInt(timeMatch[1], 10);
                                var minutes = parseInt(timeMatch[2], 10);
                                var totalMinutes = hours * 60 + minutes;

                                // Add to existing or create new
                                if (!VR.forvantadOB[currentDateParsed.day]) {
                                    VR.forvantadOB[currentDateParsed.day] = {
                                        minutes: 0,
                                        saldo: ''
                                    };
                                }
                                VR.forvantadOB[currentDateParsed.day].minutes += totalMinutes;
                                VR.forvantadOB[currentDateParsed.day].saldo = col2;
                            }
                        }
                    }
                }
            }
        }

        var turCount = Object.keys(VR.forvantadTurer).length;
        console.log('VR: Parsed ' + turCount + ' days with tour numbers');

        // Now fetch tour JSON for times
        VR.updateLoader(88, 'Hämtar turdata...');
        VR.loadTurerJSON(function(turerData) {
            VR.forvantadLookup = VR.buildTurerLookup(turerData);
            VR.updateLoader(95, 'Bygger vy...');
            setTimeout(VR.renderForvantad, 300);
        });
    };

    // ===== RENDER FORVANTAD SCHEMA =====
    VR.renderForvantad = function() {
        var target = { month: VR.forvantadMonth, year: VR.forvantadYear };
        var daysInMonth = new Date(target.year, target.month + 1, 0).getDate();

        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        var weekdayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
        var weekdayFullNames = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];

        var lookup = VR.forvantadLookup || {};
        var weekdayMap = VR._weekdayMap || {};

        // Calculate days from today
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build day data
        var days = [];
        var matchedCount = 0;

        for (var d = 1; d <= daysInMonth; d++) {
            var date = new Date(target.year, target.month, d);
            var weekday = date.getDay(); // 0=Sun, 6=Sat
            var isWeekend = (weekday === 0 || weekday === 6);
            var weekdayName = weekdayNames[weekday];
            var weekdayFull = weekdayFullNames[weekday];

            // Calculate days from today
            var daysFromToday = Math.floor((date - today) / (1000 * 60 * 60 * 24));
            var isBeyond52 = daysFromToday > 52;

            // Check if FP/FPV
            var fpEntry = VR.forvantadFP.find(function(f) { return f.day === d; });
            var obEntry = VR.forvantadOB[d];
            var turEntry = VR.forvantadTurer[d];

            // Look up tour times from JSON
            var tourMatch = null;
            if (turEntry && turEntry.turnr) {
                var abbr = weekdayMap[turEntry.weekday] || weekdayName;
                var lookupKey = turEntry.turnr + '_' + abbr;
                tourMatch = lookup[lookupKey] || null;
                if (tourMatch) {
                    matchedCount++;
                }
            }

            var dayData = {
                day: d,
                weekday: weekdayName,
                weekdayFull: weekdayFull,
                isWeekend: isWeekend,
                isFree: false,
                freeType: null,
                hasOB: false,
                obMinutes: 0,
                obSaldo: null,
                startTime: null,
                endTime: null,
                duration: null,
                isKommande: isBeyond52,
                turnr: turEntry ? turEntry.turnr : null,
                tourStart: tourMatch ? tourMatch.start : null,
                tourSlut: tourMatch ? tourMatch.slut : null,
                hasTourMatch: !!tourMatch
            };

            // Only process if within 52 days
            if (!isBeyond52) {
                if (fpEntry) {
                    // Free day
                    dayData.isFree = true;
                    dayData.freeType = fpEntry.type;
                } else if (tourMatch) {
                    // We have actual tour times from JSON — use them!
                    dayData.startTime = tourMatch.start;
                    dayData.endTime = tourMatch.slut;
                    // Calculate duration in minutes
                    var sP = tourMatch.start.split(':');
                    var eP = tourMatch.slut.split(':');
                    var sMin = parseInt(sP[0], 10) * 60 + parseInt(sP[1], 10);
                    var eMin = parseInt(eP[0], 10) * 60 + parseInt(eP[1], 10);
                    if (eMin < sMin) eMin += 24 * 60; // overnight
                    dayData.duration = eMin - sMin;
                    if (obEntry) {
                        dayData.hasOB = true;
                        dayData.obMinutes = obEntry.minutes;
                    }
                } else if (isWeekend && obEntry) {
                    // Weekend with OB: betald tid = OB
                    dayData.hasOB = true;
                    dayData.obMinutes = obEntry.minutes;
                    dayData.duration = obEntry.minutes;
                } else if (!isWeekend && obEntry) {
                    // Weekday with OB: start = 06:00 - OB, end = start + 8h
                    dayData.hasOB = true;
                    dayData.obMinutes = obEntry.minutes;
                    var startMinutes = 6 * 60 - obEntry.minutes;
                    var endMinutes = startMinutes + 8 * 60;
                    dayData.startTime = VR.minutesToTime(startMinutes);
                    dayData.endTime = VR.minutesToTime(endMinutes);
                    dayData.duration = 8 * 60;
                } else if (!isWeekend) {
                    // Weekday without OB: standard 06:00-16:00
                    dayData.startTime = '06:00';
                    dayData.endTime = '16:00';
                    dayData.duration = 10 * 60;
                } else {
                    // Weekend without OB - should have OB, mark as kommande
                    dayData.isKommande = true;
                }
            }

            days.push(dayData);
        }

        console.log('VR: Matched ' + matchedCount + ' tours to JSON data');

        // Build HTML
        var html = VR.buildForvantadHeader(monthNames[target.month], target.year, matchedCount);
        html += VR.buildForvantadRows(days, target.month, target.year);

        VR.hideLoader();
        VR.showView('', '', html);
    };

    // ===== HELPER: MINUTES TO TIME =====
    VR.minutesToTime = function(minutes) {
        if (minutes < 0) minutes += 24 * 60; // Handle negative (before midnight)
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
    VR.buildForvantadHeader = function(monthName, year, matchedCount) {
        var matchText = matchedCount > 0
            ? '<div style="font-size:12px;color:#4CD964;margin-top:3px">✓ ' + matchedCount + ' turer matchade med turdata</div>'
            : '<div style="font-size:12px;color:#FF9500;margin-top:3px">Ingen turdata tillgänglig</div>';

        return '\
<div style="background:#fff;border-radius:16px;padding:14px 20px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:22px;font-weight:700;color:#333">' + monthName + ' ' + year + '</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:4px">Förväntat schema (ej officiellt)</div>\
' + matchText + '\
</div>';
    };

    // ===== BUILD ROWS =====
    VR.buildForvantadRows = function(days, month, year) {
        var html = '\
<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
<div style="display:grid;grid-template-columns:1.4fr 0.6fr 0.6fr 0.6fr 0.8fr;gap:6px;padding:16px 16px;background:#1C1C1E">\
<div style="font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px">Dag</div>\
<div style="font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px">Start</div>\
<div style="font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px">Slut</div>\
<div style="font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px">Tid</div>\
<div style="font-size:13px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;text-align:right">Tur</div>\
</div>';

        // Format month for display (1-indexed, zero-padded)
        var monthStr = ('0' + (month + 1)).slice(-2);

        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#FAFAFA';
            var weekendBg = day.isWeekend ? 'rgba(255,149,0,0.06)' : '';

            var isKommande = day.isKommande;

            // Determine row background
            var rowBg;
            if (day.isFree) {
                rowBg = day.freeType === 'FPV' ? '#4CD964' : '#34C759';
            } else if (isKommande) {
                rowBg = '#E8E8E8';
            } else if (day.hasTourMatch) {
                rowBg = weekendBg || bgCol;
            } else {
                rowBg = weekendBg || bgCol;
            }

            html += '<div style="display:grid;grid-template-columns:1.4fr 0.6fr 0.6fr 0.6fr 0.8fr;gap:6px;padding:12px 16px;background:' + rowBg + ';border-bottom:1px solid #E5E5EA;align-items:center">';

            // === DAY COLUMN ===
            var dayStr = ('0' + day.day).slice(-2);
            var dayColor = day.isFree ? '#fff' : (isKommande ? '#999' : (day.isWeekend ? '#FF9500' : '#333'));

            // Show weekday abbreviation + day number
            var dayLabel = day.weekday + ' ' + dayStr;
            html += '<div style="color:' + dayColor + '">';
            html += '<div style="font-size:15px;font-weight:700;line-height:1.2">' + dayLabel + '</div>';

            // Show free type if applicable
            if (day.isFree) {
                html += '<div style="font-size:11px;font-weight:500;opacity:0.85">' + day.freeType + '</div>';
            }
            html += '</div>';

            // === DETERMINE VALUES ===
            var startVal = '—';
            var slutVal = '—';
            var tidVal = '—';
            var turVal = '';

            if (day.isFree) {
                startVal = '';
                slutVal = '';
                tidVal = '';
                turVal = '';
            } else if (isKommande) {
                startVal = '?';
                slutVal = '?';
                tidVal = '?';
                turVal = '';
            } else if (day.hasTourMatch) {
                // Actual tour data from JSON!
                startVal = day.startTime;
                slutVal = day.endTime;
                tidVal = VR.formatDuration(day.duration);
                turVal = day.turnr;
            } else if (day.turnr && !day.hasTourMatch) {
                // Tour number found but no JSON match — use OB estimates
                turVal = day.turnr;
                if (day.hasOB && day.startTime) {
                    startVal = day.startTime;
                    slutVal = '~';
                    tidVal = '~';
                } else if (day.isWeekend && day.hasOB) {
                    startVal = '?';
                    slutVal = '?';
                    tidVal = VR.formatDuration(day.duration);
                } else if (day.startTime && day.endTime) {
                    startVal = day.startTime;
                    slutVal = day.endTime;
                    tidVal = '~';
                }
            } else if (day.isWeekend && day.hasOB) {
                startVal = '?';
                slutVal = '?';
                tidVal = VR.formatDuration(day.duration);
            } else if (day.hasOB && day.startTime) {
                startVal = day.startTime;
                slutVal = '~';
                tidVal = '~';
            } else if (day.startTime && day.endTime) {
                startVal = day.startTime;
                slutVal = day.endTime;
                tidVal = '~';
            }

            // === START COLUMN ===
            var valColor = day.isFree ? '#fff' : (isKommande ? '#aaa' : '#333');
            var dimColor = day.isFree ? '#fff' : '#aaa';
            var accentColor = day.hasTourMatch ? '#007AFF' : valColor;

            var sColor = (startVal === '?' || startVal === '~' || startVal === '—') ? dimColor : accentColor;
            html += '<div style="font-size:15px;font-weight:' + (day.hasTourMatch ? '700' : '400') + ';color:' + sColor + '">' + startVal + '</div>';

            // === SLUT COLUMN ===
            var eColor = (slutVal === '?' || slutVal === '~' || slutVal === '—') ? dimColor : accentColor;
            html += '<div style="font-size:15px;font-weight:' + (day.hasTourMatch ? '700' : '400') + ';color:' + eColor + '">' + slutVal + '</div>';

            // === TID COLUMN ===
            var tColor = (tidVal === '?' || tidVal === '~' || tidVal === '—') ? dimColor : valColor;
            html += '<div style="font-size:14px;color:' + tColor + '">' + tidVal + '</div>';

            // === TURN NUMBER COLUMN ===
            if (turVal) {
                var turBg = day.hasTourMatch ? 'rgba(0,122,255,0.1)' : 'rgba(0,0,0,0.05)';
                var turTxtColor = day.hasTourMatch ? '#007AFF' : '#999';
                html += '<div style="text-align:right"><span style="font-size:12px;font-weight:600;color:' + turTxtColor + ';background:' + turBg + ';padding:3px 8px;border-radius:6px;display:inline-block">' + turVal + '</span></div>';
            } else if (day.isFree) {
                html += '<div></div>';
            } else if (isKommande) {
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
