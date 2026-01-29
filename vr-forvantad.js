// VR CrewWeb - Förväntat Schema
(function() {
    'use strict';

    var VR = window.VR;

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

        VR.updateLoader(10, 'Navigerar...');
        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseForvantadData);
        });
    };

    // ===== PARSE BOTH FP/FPV AND OB FROM LÖNEREDOVISNINGAR =====
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

            // Match date headers
            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

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
                        weekday: dateMatch[4]
                    };
                    currentDate = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
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

        VR.updateLoader(95, 'Bygger vy...');
        setTimeout(VR.renderForvantad, 300);
    };

    // ===== RENDER FORVANTAD SCHEMA =====
    VR.renderForvantad = function() {
        var target = { month: VR.forvantadMonth, year: VR.forvantadYear };
        var daysInMonth = new Date(target.year, target.month + 1, 0).getDate();

        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        var weekdayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

        // Build day data
        var days = [];

        for (var d = 1; d <= daysInMonth; d++) {
            var date = new Date(target.year, target.month, d);
            var weekday = date.getDay(); // 0=Sun, 6=Sat
            var isWeekend = (weekday === 0 || weekday === 6);
            var weekdayName = weekdayNames[weekday];

            // Check if FP/FPV
            var fpEntry = VR.forvantadFP.find(function(f) { return f.day === d; });
            var obEntry = VR.forvantadOB[d];

            var dayData = {
                day: d,
                weekday: weekdayName,
                isWeekend: isWeekend,
                isFree: !!fpEntry,
                freeType: fpEntry ? fpEntry.type : null,
                hasOB: !!obEntry,
                obMinutes: obEntry ? obEntry.minutes : 0,
                obSaldo: obEntry ? obEntry.saldo : null,
                startTime: null,
                endTime: null,
                duration: null
            };

            if (fpEntry) {
                // Free day - no calculation needed
            } else if (isWeekend && obEntry) {
                // Weekend with OB: duration = OB + 1h
                dayData.duration = obEntry.minutes + 60;
            } else if (!isWeekend && obEntry) {
                // Weekday with OB: start = 06:00 - OB, end = start + 8h
                var startMinutes = 6 * 60 - obEntry.minutes; // 06:00 in minutes minus OB
                var endMinutes = startMinutes + 8 * 60; // +8 hours

                dayData.startTime = VR.minutesToTime(startMinutes);
                dayData.endTime = VR.minutesToTime(endMinutes);
                dayData.duration = 8 * 60;
            } else if (!isWeekend && !obEntry && !fpEntry) {
                // Weekday without OB: standard 06:00-16:00
                dayData.startTime = '06:00';
                dayData.endTime = '16:00';
                dayData.duration = 10 * 60;
            }

            days.push(dayData);
        }

        // Build HTML
        var html = VR.buildForvantadHeader(monthNames[target.month], target.year);
        html += VR.buildForvantadRows(days);

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

    // ===== BUILD HEADER =====
    VR.buildForvantadHeader = function(monthName, year) {
        return '\
<div style="background:#fff;border-radius:16px;padding:14px 20px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:22px;font-weight:700;color:#333">' + monthName + ' ' + year + '</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:4px">Förväntat schema (ej officiellt)</div>\
</div>';
    };

    // ===== BUILD ROWS =====
    VR.buildForvantadRows = function(days) {
        var html = '\
<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
<div style="display:grid;grid-template-columns:70px 1fr 100px;gap:8px;padding:16px 20px;background:#1C1C1E">\
<div style="font-size:14px;font-weight:600;color:#fff">Dag</div>\
<div style="font-size:14px;font-weight:600;color:#fff">Tidslinje (03-18)</div>\
<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Tid</div>\
</div>';

        // Timeline constants (03:00 to 18:00 = 15 hours = 900 minutes)
        var timelineStart = 3 * 60; // 03:00
        var timelineEnd = 18 * 60;  // 18:00
        var timelineRange = timelineEnd - timelineStart;

        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';
            var weekendBg = day.isWeekend ? 'rgba(255,149,0,0.05)' : '';

            html += '<div style="display:grid;grid-template-columns:70px 1fr 100px;gap:8px;padding:14px 20px;background:' + (weekendBg || bgCol) + ';border-bottom:1px solid #E5E5EA;align-items:center">';

            // Day column
            var dayColor = day.isWeekend ? '#FF9500' : '#333';
            html += '<div style="font-size:15px;font-weight:600;color:' + dayColor + '">' + day.weekday + ' ' + day.day + '</div>';

            // Timeline column
            html += '<div style="position:relative;height:24px;background:#E5E5EA;border-radius:6px;overflow:hidden">';

            if (day.isFree) {
                // Free day - full green bar (both FP and FPV are green)
                html += '<div style="position:absolute;left:0;right:0;top:0;bottom:0;background:#34C759;display:flex;align-items:center;justify-content:center">';
                html += '<span style="font-size:12px;font-weight:600;color:#fff">' + day.freeType + '</span>';
                html += '</div>';
            } else if (day.isWeekend && day.hasOB) {
                // Weekend - centered bar (unknown start), show duration
                var durationPercent = Math.min(100, (day.duration / timelineRange) * 100);
                var leftPos = (100 - durationPercent) / 2; // Center it
                html += '<div style="position:absolute;left:' + leftPos + '%;width:' + durationPercent + '%;top:2px;bottom:2px;background:linear-gradient(90deg,#FF9500,#FF6B00);border-radius:4px;opacity:0.8"></div>';
            } else if (day.startTime && day.endTime) {
                // Weekday with known times
                var startParts = day.startTime.split(':');
                var endParts = day.endTime.split(':');
                var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
                var endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

                // Clamp to timeline range
                startMin = Math.max(timelineStart, Math.min(timelineEnd, startMin));
                endMin = Math.max(timelineStart, Math.min(timelineEnd, endMin));

                var leftPercent = ((startMin - timelineStart) / timelineRange) * 100;
                var widthPercent = ((endMin - startMin) / timelineRange) * 100;

                html += '<div style="position:absolute;left:' + leftPercent + '%;width:' + widthPercent + '%;top:2px;bottom:2px;background:linear-gradient(90deg,#007AFF,#5856D6);border-radius:4px"></div>';
            }

            // Time markers
            html += '<div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;justify-content:space-between;align-items:center;padding:0 4px;pointer-events:none">';
            html += '<span style="font-size:9px;color:#8E8E93">03</span>';
            html += '<span style="font-size:9px;color:#8E8E93">06</span>';
            html += '<span style="font-size:9px;color:#8E8E93">09</span>';
            html += '<span style="font-size:9px;color:#8E8E93">12</span>';
            html += '<span style="font-size:9px;color:#8E8E93">15</span>';
            html += '<span style="font-size:9px;color:#8E8E93">18</span>';
            html += '</div>';

            html += '</div>';

            // Time/info column
            if (day.isFree) {
                html += '<div style="font-size:13px;font-weight:600;color:#34C759;text-align:right">Ledig</div>';
            } else if (day.isWeekend && day.hasOB) {
                var hrs = Math.floor(day.duration / 60);
                var mins = day.duration % 60;
                html += '<div style="font-size:13px;color:#FF9500;text-align:right">~' + hrs + 'h' + (mins > 0 ? mins + 'm' : '') + '</div>';
            } else if (day.startTime && day.endTime) {
                html += '<div style="font-size:13px;color:#007AFF;text-align:right">' + day.startTime + '-' + day.endTime + '</div>';
            } else {
                html += '<div style="font-size:13px;color:#CCC;text-align:right">—</div>';
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    console.log('VR: Förväntat loaded');
})();
