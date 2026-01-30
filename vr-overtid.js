// VR CrewWeb - Övertid
(function() {
    'use strict';

    var VR = window.VR;

    // ===== OVERTIME RATES =====
    // Kvalificerad: Lön / 72
    // Enkel: Lön / 92
    VR.OVERTIME_TYPES = {
        'L.Övertid kvalificerad': { name: 'Kval. övertid', divisor: 72 },
        'L.Förseningsövertid Kval': { name: 'Kval. försening', divisor: 72 },
        'L.Övertid enkel': { name: 'Enkel övertid', divisor: 92 },
        'L.Förseningsövertid enkel': { name: 'Enkel försening', divisor: 92 }
    };

    // Global storage
    VR.overtidData = [];

    // ===== MAIN ENTRY POINT =====
    VR.doOvertid = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Övertid');
        VR.updateLoader(5, 'Letar efter sidan...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseAndShowOvertid);
        });
    };

    // ===== PARSE OVERTIME DATA =====
    VR.parseAndShowOvertid = function() {
        VR.updateLoader(95, 'Analyserar övertidsdata...');

        var overtidData = [];
        var salary = VR.SALARIES ? VR.SALARIES[VR.userRole] || 46188 : 46188;

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

                    // Check for overtime types
                    var overtimeInfo = null;
                    if (VR.OVERTIME_TYPES[col1]) {
                        overtimeInfo = VR.OVERTIME_TYPES[col1];
                    }

                    if (overtimeInfo) {
                        var timeMatch = col2.match(/(\d+):(\d+)/);
                        var hours = 0;
                        var minutes = 0;
                        if (timeMatch) {
                            hours = parseInt(timeMatch[1], 10);
                            minutes = parseInt(timeMatch[2], 10);
                        }
                        var totalHours = hours + (minutes / 60);
                        var rate = salary / overtimeInfo.divisor;
                        var kronor = totalHours * rate;

                        overtidData.push({
                            date: currentDate,
                            type: col1,
                            typeName: overtimeInfo.name,
                            time: col2,
                            hours: totalHours,
                            rate: rate,
                            divisor: overtimeInfo.divisor,
                            kronor: kronor
                        });
                    }
                }
            }
        }

        // Store globally for Lön calculations
        VR.overtidData = overtidData;

        VR.updateLoader(98, 'Bygger vy...');

        var viewHtml = VR.buildOvertidView(overtidData, salary);

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', viewHtml);
        }, 300);
    };

    // ===== BUILD OVERTIME VIEW =====
    VR.buildOvertidView = function(overtidData, salary) {
        if (overtidData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">⏱️</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen övertid hittades</div>\
                    <div style="font-size:22px;color:#888">L.Komp+ 2,0 och L.Komp+ 1,5 visas här</div>\
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

        for (var i = 0; i < overtidData.length; i++) {
            var item = overtidData[i];
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

        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';

        html += '<div style="background:#fff;border-radius:16px;padding:18px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">' + monthNames[prevMonth] + '</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#333">' + prevMonthTotal.toFixed(0) + ' kr</div>';
        html += '</div>';

        html += '<div style="background:#fff;border-radius:16px;padding:18px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">' + monthNames[currentMonth] + '</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#FF9500">' + currentMonthTotal.toFixed(0) + ' kr</div>';
        html += '</div>';

        html += '</div>';

        // Hourly rates info box
        html += '<div style="background:#FFF5E6;border-radius:16px;padding:16px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">';
        html += '<div style="text-align:center"><div style="font-size:14px;color:#666">Kval. (2,0)</div><div style="font-size:20px;font-weight:600;color:#FF9500">' + Math.round(salary / 72) + ' kr/h</div></div>';
        html += '<div style="text-align:center"><div style="font-size:14px;color:#666">Enkel (1,5)</div><div style="font-size:20px;font-weight:600;color:#FF9500">' + Math.round(salary / 92) + ' kr/h</div></div>';
        html += '</div>';

        // Table
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:10px;padding:20px 24px;background:#1C1C1E">';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Typ</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff;text-align:right">Antal</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        for (var d = overtidData.length - 1; d >= 0; d--) {
            var row = overtidData[d];
            var rowIndex = overtidData.length - 1 - d;
            var bgCol = rowIndex % 2 === 0 ? '#fff' : '#F8F8F8';

            html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:10px;padding:18px 24px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:30px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:30px;color:#333">' + row.typeName + '</div>';
            html += '<div style="font-size:30px;color:#333;text-align:right">' + row.time + '</div>';
            html += '<div style="font-size:30px;font-weight:600;color:#FF9500;text-align:right">' + row.kronor.toFixed(0) + '</div>';
            html += '</div>';
        }

        html += '<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr 1fr;gap:10px;padding:20px 24px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:32px;font-weight:700;color:#333">Totalt</div>';
        html += '<div></div>';
        html += '<div style="font-size:32px;font-weight:600;color:#333;text-align:right">' + grandTotalHours.toFixed(1) + ' h</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#FF9500;text-align:right">' + grandTotalKr.toFixed(0) + ' kr</div>';
        html += '</div>';

        html += '</div>';

        return html;
    };

    console.log('VR: Övertid loaded');
})();
