// VR CrewWeb - Komp functionality
(function() {
    'use strict';

    var VR = window.VR;

    // ===== MAIN KOMP FUNCTION =====
    VR.doKomp = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar Kompsaldo');
        VR.updateLoader(5, 'Letar efter sidan...');

        var balances = document.getElementById('CrewBalances');
        if (balances) {
            VR.updateLoader(40, 'Sidan redan laddad...');
            VR.selectKompAndShow();
            return;
        }

        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            VR.updateLoader(15, 'Klickar på Redovisningar...');
            el.click();
            VR.waitForBalances();
            return;
        }

        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Redovisningar...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el2 = VR.findMenuItem('Redovisningar');
                if (el2) {
                    VR.stopTimer();
                    el2.click();
                    VR.updateLoader(25, 'Navigerar...');
                    VR.waitForBalances();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR BALANCES =====
    VR.waitForBalances = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            var balances = document.getElementById('CrewBalances');
            if (balances) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(VR.selectKompAndShow, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== SELECT KOMP AND SHOW =====
    VR.selectKompAndShow = function() {
        var listbox = null;
        var all = document.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) {
            var tag = all[i].tagName || '';
            if (tag.toLowerCase().indexOf('listbox') > -1) {
                listbox = all[i];
                break;
            }
        }

        if (!listbox) {
            VR.updateLoader(0, 'Dropdown ej hittad');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        // Already on Komp?
        if (listbox.getAttribute('value') === '3') {
            VR.updateLoader(55, 'Redan på Komp!');
            VR.afterKompSelected();
            return;
        }

        VR.updateLoader(50, 'Öppnar dropdown...');

        var dropBtn = listbox.querySelector('.dropdlgbutton');
        if (dropBtn) {
            dropBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            dropBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        }

        setTimeout(function() {
            VR.updateLoader(55, 'Väljer Komp/Timkonto...');

            var found = null;
            var allEls = document.body.getElementsByTagName('*');
            for (var i = 0; i < allEls.length; i++) {
                var el = allEls[i];
                var txt = '';
                for (var j = 0; j < el.childNodes.length; j++) {
                    if (el.childNodes[j].nodeType === 3) {
                        txt += el.childNodes[j].textContent;
                    }
                }
                if (txt.trim() === 'Komp./Timkonto') {
                    var rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && !listbox.contains(el)) {
                        found = el;
                        break;
                    }
                }
            }

            if (found) {
                found.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                found.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                found.click();
                VR.updateLoader(60, 'Komp vald!');
                setTimeout(VR.afterKompSelected, 800);
            } else {
                VR.updateLoader(0, 'Popup ej hittad');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 500);
    };

    // ===== AFTER KOMP SELECTED =====
    VR.afterKompSelected = function() {
        VR.updateLoader(65, 'Sätter datum...');

        var today = new Date();
        var todayStr = ('0' + today.getDate()).slice(-2) + '-' +
                       ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                       today.getFullYear();

        var inputs = document.querySelectorAll('#CrewBalances input[type="text"]');
        if (inputs.length >= 2) {
            inputs[0].value = '14-12-2025';
            inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            inputs[1].value = todayStr;
            inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }

        setTimeout(function() {
            VR.updateLoader(70, 'Hämtar data...');
            VR.clickFetch();
            VR.pollForKompData();
        }, 500);
    };

    // ===== POLL FOR KOMP DATA =====
    VR.pollForKompData = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            var tbl = document.querySelector('#CrewBalances table');
            var rows = tbl ? tbl.querySelectorAll('tr').length : 0;
            VR.updateLoader(70 + n, 'Laddar (' + rows + ' rader)...');

            if (rows > 2 || n > 25) {
                VR.stopTimer();
                VR.updateLoader(95, 'Bygger vy...');
                setTimeout(VR.renderKomp, 300);
            }
        }, 400);
    };

    // ===== RENDER KOMP =====
    VR.renderKomp = function() {
        var tbl = document.querySelector('#CrewBalances table');
        if (!tbl) {
            VR.updateLoader(0, 'Ingen tabell');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var data = [];

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 3) continue;

            var d = c[0] ? c[0].textContent.trim() : '';
            var b = c[1] ? c[1].textContent.trim() : '';
            var s = c[2] ? c[2].textContent.trim() : '';
            var k = c[3] ? c[3].textContent.trim() : '';

            if (d && d.indexOf('-') > -1) {
                data.push({ d: d, b: b, s: s, k: k });
            }
        }

        if (data.length === 0) {
            VR.updateLoader(0, 'Ingen data');
            setTimeout(VR.hideLoader, 2000);
            return;
        }

        // Sort by date (newest first)
        data.sort(function(a, b) {
            var dtA = VR.formatDate(a.d);
            var dtB = VR.formatDate(b.d);
            if (!dtA.dateObj || !dtB.dateObj) return 0;
            return dtB.dateObj - dtA.dateObj;
        });

        // Build HTML - use newest saldo (first row after sorting)
        var html = VR.buildKompHeader(data[0].s);
        html += VR.buildKompRows(data);

        VR.updateLoader(100, 'Klar!');

        setTimeout(function() {
            VR.hideLoader();
            VR.showView('', '', html);
        }, 400);
    };

    // ===== BUILD KOMP HEADER =====
    VR.buildKompHeader = function(saldo) {
        var sp = saldo.split(':');
        var isPos = saldo.indexOf('-') === -1;
        var valueColor = isPos ? '#34C759' : '#FF3B30';

        return '\
<div style="background:#fff;border-radius:16px;padding:18px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Kompsaldo</div>\
<div style="font-size:72px;font-weight:700;color:' + valueColor + '">' + sp[0] + '<span style="font-size:48px;opacity:0.7">:' + (sp[1] || '00') + '</span></div>\
<div style="font-size:26px;color:#8E8E93;margin-top:6px">timmar</div>\
</div>';
    };

    // ===== BUILD KOMP ROWS =====
    VR.buildKompRows = function(data) {
        var html = '\
<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr 0.8fr;gap:10px;padding:20px 24px;background:#1C1C1E">\
<div style="font-size:28px;font-weight:600;color:#fff">Datum</div>\
<div style="font-size:28px;font-weight:600;color:#fff">Kommentar</div>\
<div style="font-size:28px;font-weight:600;color:#fff;text-align:right">Bidrag</div>\
<div style="font-size:28px;font-weight:600;color:#fff;text-align:right">Saldo</div>\
</div>';

        var maxShow = Math.min(data.length, 50);

        // Data is already sorted newest first
        for (var j = 0; j < maxShow; j++) {
            var neg = data[j].b.indexOf('-') > -1;
            var bidrag = data[j].b.replace('-', '');
            var bgCol = j % 2 === 0 ? '#fff' : '#F8F8F8';
            var bidragColor = neg ? '#FF3B30' : '#34C759';
            var sign = neg ? '−' : '+';

            html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr 0.8fr;gap:10px;padding:18px 24px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';

            // Datum
            html += '<div style="font-size:30px;color:#333">' + data[j].d + '</div>';

            // Kommentar
            if (data[j].k) {
                html += '<div style="font-size:30px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + data[j].k + '</div>';
            } else {
                html += '<div style="font-size:30px;color:#CCC;font-style:italic">—</div>';
            }

            // Bidrag
            html += '<div style="font-size:30px;font-weight:600;color:' + bidragColor + ';text-align:right">' + sign + bidrag + '</div>';

            // Saldo
            html += '<div style="font-size:30px;font-weight:600;color:#333;text-align:right">' + data[j].s + '</div>';

            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    console.log('VR: Komp loaded');
})();
