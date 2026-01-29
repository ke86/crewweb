// VR CrewWeb - Frånvaro (VAB, Föräldraledig)
(function() {
    'use strict';

    var VR = window.VR;

    // ===== FRÅNVARO FUNCTIONALITY =====
    VR.doFranvaro = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Frånvaro');
        VR.updateLoader(5, 'Letar efter sidan...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseAndShowFranvaro);
        });
    };

    VR.parseAndShowFranvaro = function() {
        VR.updateLoader(95, 'Analyserar frånvaro-data...');

        var franvaroData = [];

        var FRANVARO_TYPES = {
            'L.Föräldraledig >5 dagar': { name: 'Föräldraledig, lång', icon: '👶' },
            'L.Föräldraledig>5 dagar': { name: 'Föräldraledig, lång', icon: '👶' },
            'L.Föräldraledig <5 dagar': { name: 'Föräldraledig, kort', icon: '👶' },
            'L.Föräldraledig<5 dagar': { name: 'Föräldraledig, kort', icon: '👶' },
            'L.Vård av barn': { name: 'VAB', icon: '🏥' }
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';
                    var col2 = cells[1] ? cells[1].textContent.trim() : '';

                    if (col1.toLowerCase() === 'löneslag') continue;

                    var matchedType = null;
                    var matchedInfo = null;

                    for (var typeKey in FRANVARO_TYPES) {
                        if (col1.indexOf(typeKey) > -1 || col1 === typeKey) {
                            matchedType = typeKey;
                            matchedInfo = FRANVARO_TYPES[typeKey];
                            break;
                        }
                    }

                    if (!matchedType) {
                        if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('>5') > -1) {
                            matchedInfo = { name: 'Föräldraledig, lång', icon: '👶' };
                            matchedType = col1;
                        } else if (col1.indexOf('Föräldraledig') > -1 && col1.indexOf('<5') > -1) {
                            matchedInfo = { name: 'Föräldraledig, kort', icon: '👶' };
                            matchedType = col1;
                        } else if (col1.indexOf('Vård av barn') > -1) {
                            matchedInfo = { name: 'VAB', icon: '🏥' };
                            matchedType = col1;
                        }
                    }

                    if (matchedInfo) {
                        franvaroData.push({
                            date: currentDate,
                            originalType: col1,
                            typeName: matchedInfo.name,
                            icon: matchedInfo.icon,
                            time: col2
                        });
                    }
                }
            }
        }

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildFranvaroView(franvaroData);

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', viewHtml);
        }, 300);
    };

    VR.buildFranvaroView = function(franvaroData) {
        if (franvaroData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen frånvaro hittades</div>\
                    <div style="font-size:22px;color:#888">Söker: VAB, Föräldraledig</div>\
                </div>';
        }

        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

        var prevMonthData = {};
        var currentMonthData = {};

        for (var i = 0; i < franvaroData.length; i++) {
            var item = franvaroData[i];
            var dateParts = item.date.match(/(\d{1,2})-(\d{2})-(\d{4})/);
            if (dateParts) {
                var month = parseInt(dateParts[2], 10) - 1;
                var year = parseInt(dateParts[3], 10);

                var timeMatch = item.time.match(/(\d+):(\d+)/);
                var minutes = 0;
                if (timeMatch) {
                    minutes = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
                }

                var targetData = null;
                if (year === currentYear && month === currentMonth) {
                    targetData = currentMonthData;
                } else if (year === prevYear && month === prevMonth) {
                    targetData = prevMonthData;
                }

                if (targetData) {
                    if (!targetData[item.typeName]) {
                        targetData[item.typeName] = { count: 0, minutes: 0 };
                    }
                    targetData[item.typeName].count++;
                    targetData[item.typeName].minutes += minutes;
                }
            }
        }

        var formatTime = function(mins) {
            var h = Math.floor(mins / 60);
            var m = mins % 60;
            return h + ':' + (m < 10 ? '0' : '') + m;
        };

        var buildMonthSummary = function(data) {
            var keys = Object.keys(data);
            if (keys.length === 0) {
                return '<div style="font-size:28px;color:#8E8E93">Ingen frånvaro</div>';
            }
            var html = '';
            for (var k = 0; k < keys.length; k++) {
                var type = keys[k];
                var info = data[type];
                html += '<div style="font-size:28px;color:#333;margin-bottom:6px"><strong>' + type + '</strong>: ' + info.count + ' (' + formatTime(info.minutes) + ')</div>';
            }
            return html;
        };

        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';

        html += '<div style="background:#fff;border-radius:16px;padding:18px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">' + monthNames[prevMonth] + '</div>';
        html += buildMonthSummary(prevMonthData);
        html += '</div>';

        html += '<div style="background:#fff;border-radius:16px;padding:18px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">' + monthNames[currentMonth] + '</div>';
        html += buildMonthSummary(currentMonthData);
        html += '</div>';

        html += '</div>';

        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:10px;padding:20px 24px;background:#1C1C1E">';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Frånvaro-typ</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff;text-align:right">Tid</div>';
        html += '</div>';

        for (var d = franvaroData.length - 1; d >= 0; d--) {
            var row = franvaroData[d];
            var rowIndex = franvaroData.length - 1 - d;
            var bgCol = rowIndex % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:10px;padding:18px 24px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:30px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:30px;color:#333">' + row.typeName + '</div>';
            html += '<div style="font-size:30px;font-weight:600;color:#FF6B6B;text-align:right">' + row.time + '</div>';
            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    console.log('VR: Frånvaro loaded');
})();
