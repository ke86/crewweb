// VR CrewWeb - Anställddata functionality
(function() {
    'use strict';

    var VR = window.VR;

    // ===== ANSTÄLLDDATA FUNCTIONALITY =====
    VR.doAnstallddata = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Anställddata');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Check if already on Anställddata page
        var empData = document.getElementById('EmployeeData');
        if (empData) {
            VR.updateLoader(40, 'Sidan redan laddad...');
            VR.parseAndShowAnstallddata();
            return;
        }

        // ALWAYS open folder menu first, then find Anställddata
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Anställddata...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Anställddata');
                if (el) {
                    VR.stopTimer();
                    VR.updateLoader(20, 'Klickar på Anställddata...');
                    el.click();
                    VR.waitForAnstallddata();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    VR.waitForAnstallddata = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var empData = document.getElementById('EmployeeData');

            if (empData || n > 15) {
                VR.stopTimer();
                VR.updateLoader(70, 'Läser data...');
                setTimeout(VR.parseAndShowAnstallddata, 500);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    VR.parseAndShowAnstallddata = function() {
        VR.updateLoader(80, 'Analyserar data...');

        var data = {};

        // Method 1: Look for labeled input fields
        var inputs = document.querySelectorAll('input[type="text"], input:not([type])');
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            var value = input.value ? input.value.trim() : '';
            if (!value) continue;

            var label = '';
            var parent = input.parentElement;

            if (parent) {
                var prev = input.previousElementSibling;
                if (prev && prev.textContent) {
                    label = prev.textContent.trim();
                }
                if (!label) {
                    var parentText = '';
                    for (var j = 0; j < parent.childNodes.length; j++) {
                        if (parent.childNodes[j].nodeType === 3) {
                            parentText += parent.childNodes[j].textContent;
                        }
                    }
                    label = parentText.trim();
                }
            }

            if (label && value) {
                data[label] = value;
            }
        }

        // Method 2: Look for table rows with label-value pairs
        var rows = document.querySelectorAll('tr');
        for (var r = 0; r < rows.length; r++) {
            var cells = rows[r].querySelectorAll('td, th');
            if (cells.length >= 2) {
                var lbl = cells[0].textContent.trim();
                var val = cells[1].textContent.trim();
                if (lbl && val && lbl.length < 50 && val.length < 100) {
                    data[lbl] = val;
                }
            }
        }

        // Method 3: Look for spans/divs with specific patterns
        var allElements = document.querySelectorAll('span, div, label');
        for (var k = 0; k < allElements.length; k++) {
            var el = allElements[k];
            var text = el.textContent.trim();

            var colonMatch = text.match(/^([^:]+):\s*(.+)$/);
            if (colonMatch && colonMatch[1].length < 30 && colonMatch[2].length < 100) {
                data[colonMatch[1].trim()] = colonMatch[2].trim();
            }
        }

        // Filter out garbage data
        var filteredData = {};
        var keys = Object.keys(data);
        for (var f = 0; f < keys.length; f++) {
            var key = keys[f];
            var dataValue = data[key];

            // Skip entries where key is just a number
            if (/^\d+$/.test(key)) continue;

            // Skip entries where value is just "20" or similar short meaningless numbers
            if (/^\d{1,2}$/.test(dataValue)) continue;

            // Skip entries with date+number pattern like "2026-01-2620"
            if (/^\d{4}-\d{2}-\d{2}\d+$/.test(dataValue)) continue;

            // Skip entries with malformed dates
            if (/^\d{4}-\d{2}-\d{2}[^\s]/.test(dataValue) && !/^\d{4}-\d{2}-\d{2}\s/.test(dataValue)) continue;

            // Skip very short keys (likely garbage)
            if (key.length < 2) continue;

            // Skip corrupt keys with numbers at start followed by date pattern (e.g. "3021132026-01-2621")
            if (/^\d+\d{4}-\d{2}-\d+$/.test(key)) continue;

            // Skip malformed date-like keys (e.g. "2026-01-2621")
            if (/^\d{4}-\d{2}-\d{4,}$/.test(key)) continue;

            // Skip header-related garbage (Idag, Saldo, etc from VR header)
            if (/Idag/i.test(key)) continue;
            if (/^Saldo/i.test(key)) continue;
            if (/Imorgon/i.test(key)) continue;
            if (/FPSaldo/i.test(key)) continue;
            if (/^≡/.test(key)) continue;

            // Skip values that contain header garbage patterns
            if (/ImorgonLedig/i.test(dataValue)) continue;
            if (/FPSaldo/i.test(dataValue)) continue;

            filteredData[key] = dataValue;
        }

        VR.updateLoader(95, 'Bygger vy...');

        var html = VR.buildAnstalldataView(filteredData);

        setTimeout(function() {
            VR.hideLoader();
            var count = Object.keys(filteredData).length;
            VR.showView('Anställddata', count + ' fält hittade', html);
        }, 300);
    };

    VR.buildAnstalldataView = function(data) {
        var keys = Object.keys(data);

        if (keys.length === 0) {
            return '\
                <div style="background:#fff;border-radius:27px;padding:60px 40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
                    <div style="font-size:80px;margin-bottom:24px">🔍</div>\
                    <div style="font-size:32px;font-weight:600;color:#333;margin-bottom:12px">Ingen data hittades</div>\
                    <div style="font-size:22px;color:#888">Navigera till Anställddata-sidan i CrewWeb först</div>\
                </div>';
        }

        // Profile card
        var html = '<div style="background:linear-gradient(135deg,#5AC8FA,#007AFF);border-radius:30px;padding:40px;margin-bottom:30px;text-align:center;box-shadow:0 10px 40px rgba(0,122,255,0.3)">';
        html += '<div style="width:120px;height:120px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:60px">👤</div>';

        var name = data['Namn'] || data['Name'] || data['Förnamn'] || '';
        if (name) {
            html += '<div style="font-size:36px;font-weight:700;color:#fff">' + name + '</div>';
        }

        var empNr = data['Anställningsnummer'] || data['Anst.nr'] || data['Anst nr'] || data['Personal nr'] || data['Personnr'] || '';
        if (empNr) {
            html += '<div style="font-size:22px;color:rgba(255,255,255,0.8);margin-top:8px">#' + empNr + '</div>';
        }

        html += '</div>';

        // Data cards
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = data[key];

            if (key === 'Namn' || key === 'Name' || key === 'Förnamn' ||
                key === 'Anställningsnummer' || key === 'Anst.nr' || key === 'Anst nr' ||
                key === 'Personal nr' || key === 'Personnr') continue;

            var borderStyle = i < keys.length - 1 ? 'border-bottom:1px solid #E5E5EA;' : '';

            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;' + borderStyle + '">';
            html += '<div style="font-size:20px;color:#8E8E93">' + key + '</div>';
            html += '<div style="font-size:22px;font-weight:600;color:#000;text-align:right;max-width:60%;word-break:break-word">' + value + '</div>';
            html += '</div>';
        }

        html += '</div>';

        // Debug: Show raw data
        html += '<details style="margin-top:30px;background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
        html += '<summary style="padding:20px 24px;font-size:20px;color:#8E8E93;cursor:pointer">Visa rådata (debug)</summary>';
        html += '<pre style="padding:20px 24px;font-size:14px;color:#666;overflow-x:auto;background:#F8F8F8">' + JSON.stringify(data, null, 2) + '</pre>';
        html += '</details>';

        return html;
    };

    console.log('VR: Anstalld loaded');
})();
