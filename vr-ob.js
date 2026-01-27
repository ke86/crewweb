// VR CrewWeb - OB-tillägg
(function() {
    'use strict';

    var VR = window.VR;

    // ===== OB FUNCTIONALITY =====
    VR.doOB = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar OB-tillägg');
        VR.updateLoader(5, 'Letar efter sidan...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseAndShowOB);
        });
    };

    VR.parseAndShowOB = function() {
        VR.updateLoader(95, 'Analyserar OB-data...');

        var obData = [];

        var OB_RATES = {
            'L.Hb': { name: 'Kvalificerad OB', rate: 54.69 },
            'L.Storhelgstillägg': { name: 'Storhelgs OB', rate: 122.88 }
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

                    if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                        var timeMatch = col2.match(/(\d+):(\d+)/);
                        var hours = 0;
                        var minutes = 0;
                        if (timeMatch) {
                            hours = parseInt(timeMatch[1], 10);
                            minutes = parseInt(timeMatch[2], 10);
                        }
                        var totalHours = hours + (minutes / 60);
                        var rate = OB_RATES[col1] ? OB_RATES[col1].rate : 0;
                        var kronor = totalHours * rate;

                        obData.push({
                            date: currentDate,
                            type: col1,
                            typeName: OB_RATES[col1] ? OB_RATES[col1].name : col1,
                            time: col2,
                            hours: totalHours,
                            rate: rate,
                            kronor: kronor
                        });
                    }
                }
            }
        }

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildOBView(obData);

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', viewHtml);
        }, 300);
    };

    VR.buildOBView = function(obData) {
        if (obData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen OB-data hittades</div>\
                    <div style="font-size:22px;color:#888">Endast L.Hb och L.Storhelgstillägg visas</div>\
                </div>';
        }

        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

        var monthlyTotals = {};
        var grandTotalHours = 0;
        var grandTotalKr = 0;

        for (var i = 0; i < obData.length; i++) {
            var item = obData[i];
            var dateParts = item.date.match(/(\d{1,2})-(\d{2})-(\d{4})/);
            if (dateParts) {
                var month = parseInt(dateParts[2], 10) - 1;
                var year = parseInt(dateParts[3], 10);
                var key = year + '-' + month;

                if (!monthlyTotals[key]) {
                    monthlyTotals[key] = { kronor: 0, month: month, year: year };
                }
                monthlyTotals[key].kronor += item.kronor;
            }
            grandTotalHours += item.hours;
            grandTotalKr += item.kronor;
        }

        var currentKey = currentYear + '-' + currentMonth;
        var prevKey = prevYear + '-' + prevMonth;
        var currentMonthTotal = monthlyTotals[currentKey] ? monthlyTotals[currentKey].kronor : 0;
        var prevMonthTotal = monthlyTotals[prevKey] ? monthlyTotals[prevKey].kronor : 0;

        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">';

        html += '<div style="background:#fff;border-radius:20px;padding:20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:32px;margin-bottom:8px">🌙</div>';
        html += '<div style="font-size:13px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' + monthNames[prevMonth] + '</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#333">' + prevMonthTotal.toFixed(0) + ' kr</div>';
        html += '</div>';

        html += '<div style="background:#fff;border-radius:20px;padding:20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:32px;margin-bottom:8px">✨</div>';
        html += '<div style="font-size:13px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' + monthNames[currentMonth] + '</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#AF52DE">' + currentMonthTotal.toFixed(0) + ' kr</div>';
        html += '</div>';

        html += '</div>';

        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">OB-typ</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Antal</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        for (var d = obData.length - 1; d >= 0; d--) {
            var row = obData[d];
            var rowIndex = obData.length - 1 - d;
            var bgCol = rowIndex % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:15px;color:#333">' + row.typeName + '</div>';
            html += '<div style="font-size:15px;color:#333;text-align:right">' + row.time + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:#AF52DE;text-align:right">' + row.kronor.toFixed(2) + '</div>';
            html += '</div>';
        }

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:8px;padding:16px 20px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:16px;font-weight:700;color:#333">Totalt</div>';
        html += '<div></div>';
        html += '<div style="font-size:16px;font-weight:600;color:#333;text-align:right">' + grandTotalHours.toFixed(1) + ' h</div>';
        html += '<div style="font-size:16px;font-weight:700;color:#AF52DE;text-align:right">' + grandTotalKr.toFixed(2) + ' kr</div>';
        html += '</div>';

        html += '</div>';

        return html;
    };

    console.log('VR: OB loaded');
})();
