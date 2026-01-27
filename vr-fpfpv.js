// VR CrewWeb - FP/FPV (Fridagar)
(function() {
    'use strict';

    var VR = window.VR;

    // ===== FP/FPV FUNCTIONALITY =====
    VR.doFPFPV = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar FP/FPV');
        VR.updateLoader(5, 'Letar efter sidan...');

        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseAndShowFPFPV);
        });
    };

    VR.parseAndShowFPFPV = function() {
        VR.updateLoader(95, 'Analyserar FP/FPV-data...');

        var fpData = [];

        var FP_TYPES = {
            'S.Frånvaro: FRIDAG': { name: 'FP', icon: '🏖️' },
            'S.Frånvaro: FV/FP2/FP-V': { name: 'FPV', icon: '🌴' }
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

                    for (var typeKey in FP_TYPES) {
                        if (col1.indexOf(typeKey) > -1 || col1 === typeKey) {
                            matchedType = typeKey;
                            matchedInfo = FP_TYPES[typeKey];
                            break;
                        }
                    }

                    if (!matchedType) {
                        if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            matchedInfo = { name: 'FP', icon: '🏖️' };
                            matchedType = col1;
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            matchedInfo = { name: 'FPV', icon: '🌴' };
                            matchedType = col1;
                        }
                    }

                    if (matchedInfo) {
                        fpData.push({
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

        var viewHtml = VR.buildFPFPVView(fpData);

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', viewHtml);
        }, 300);
    };

    VR.buildFPFPVView = function(fpData) {
        if (fpData.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen FP/FPV hittades</div>\
                    <div style="font-size:22px;color:#888">Söker: FP (Fridag) och FPV</div>\
                </div>';
        }

        var currentYear = new Date().getFullYear();

        var yearlyFP = 0;
        var yearlyFPV = 0;

        for (var i = 0; i < fpData.length; i++) {
            var item = fpData[i];
            var dateParts = item.date.match(/(\d{1,2})-(\d{2})-(\d{4})/);
            if (dateParts) {
                var year = parseInt(dateParts[3], 10);
                if (year === currentYear) {
                    if (item.typeName === 'FP') {
                        yearlyFP++;
                    } else if (item.typeName === 'FPV') {
                        yearlyFPV++;
                    }
                }
            }
        }

        // Quotas
        var FP_QUOTA = 104;
        var FPV_QUOTA = 14;
        var fpRemaining = FP_QUOTA - yearlyFP;
        var fpvRemaining = FPV_QUOTA - yearlyFPV;
        var fpPercent = Math.min(100, Math.round((yearlyFP / FP_QUOTA) * 100));
        var fpvPercent = Math.min(100, Math.round((yearlyFPV / FPV_QUOTA) * 100));

        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';

        // FP Box
        html += '<div style="background:#fff;border-radius:16px;padding:16px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:12px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">FP ' + currentYear + '</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#34C759">' + yearlyFP + '<span style="font-size:18px;color:#8E8E93;font-weight:500">/' + FP_QUOTA + '</span></div>';
        // Progress bar
        html += '<div style="background:#E5E5EA;border-radius:6px;height:8px;margin:10px 0;overflow:hidden">';
        html += '<div style="background:linear-gradient(90deg,#34C759,#30D158);height:100%;width:' + fpPercent + '%;border-radius:6px;transition:width 0.3s"></div>';
        html += '</div>';
        html += '<div style="font-size:13px;color:#8E8E93">' + fpRemaining + ' kvar</div>';
        html += '</div>';

        // FPV Box
        html += '<div style="background:#fff;border-radius:16px;padding:16px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:12px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">FPV ' + currentYear + '</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#007AFF">' + yearlyFPV + '<span style="font-size:18px;color:#8E8E93;font-weight:500">/' + FPV_QUOTA + '</span></div>';
        // Progress bar
        html += '<div style="background:#E5E5EA;border-radius:6px;height:8px;margin:10px 0;overflow:hidden">';
        html += '<div style="background:linear-gradient(90deg,#007AFF,#5856D6);height:100%;width:' + fpvPercent + '%;border-radius:6px;transition:width 0.3s"></div>';
        html += '</div>';
        html += '<div style="font-size:13px;color:#8E8E93">' + fpvRemaining + ' kvar</div>';
        html += '</div>';

        html += '</div>';

        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        html += '<div style="display:grid;grid-template-columns:1fr 1fr 0.8fr;gap:8px;padding:16px 20px;background:#1C1C1E">';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff">Typ</div>';
        html += '<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Tid</div>';
        html += '</div>';

        for (var d = fpData.length - 1; d >= 0; d--) {
            var row = fpData[d];
            var rowIndex = fpData.length - 1 - d;
            var bgCol = rowIndex % 2 === 0 ? '#fff' : '#F8F8F8';
            var typeColor = row.typeName === 'FP' ? '#34C759' : '#007AFF';

            html += '<div style="display:grid;grid-template-columns:1fr 1fr 0.8fr;gap:8px;padding:14px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:15px;color:#333">' + row.date + '</div>';
            html += '<div style="font-size:15px;color:#333;display:flex;align-items:center;gap:8px"><span>' + row.icon + '</span> ' + row.typeName + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:' + typeColor + ';text-align:right">' + row.time + '</div>';
            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    console.log('VR: FP/FPV loaded');
})();
