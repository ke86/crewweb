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

        // Build HTML
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
<div style="background:#fff;border-radius:20px;padding:20px;margin-bottom:20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">\
<div style="font-size:13px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Kompsaldo</div>\
<div style="font-size:36px;font-weight:700;color:' + valueColor + '">' + sp[0] + '<span style="font-size:24px;opacity:0.7">:' + (sp[1] || '00') + '</span></div>\
<div style="font-size:13px;color:#8E8E93;margin-top:4px">timmar</div>\
</div>';
    };

    // ===== BUILD KOMP ROWS =====
    VR.buildKompRows = function(data) {
        var html = '\
<div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.08)">\
<div style="display:grid;grid-template-columns:105px 1fr 120px;padding:18px 24px;background:#F8F8F8;border-bottom:1px solid #E5E5E5;font-size:18px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.8px">\
<div>Datum</div>\
<div>Kommentar</div>\
<div style="text-align:right">Tid</div>\
</div>';

        var maxShow = Math.min(data.length, 50);

        // Loop backwards to show newest first
        for (var j = data.length - 1; j >= Math.max(0, data.length - maxShow); j--) {
            var neg = data[j].b.indexOf('-') > -1;
            var bidrag = data[j].b.replace('-', '');
            var dt = VR.formatDate(data[j].d);
            var isFirst = (j === data.length - 1); // Newest is now "first"

            var rowStyle = isFirst
                ? 'background:linear-gradient(135deg,rgba(52,199,89,0.08),rgba(48,209,88,0.08));'
                : '';

            html += '<div style="display:grid;grid-template-columns:105px 1fr 120px;padding:21px 24px;border-bottom:1px solid #F0F0F0;align-items:center;' + rowStyle + '">';

            // Date box
            var dateBg = isFirst ? 'linear-gradient(135deg,#34C759,#30D158)' : '#F0F5FF';
            var dateCol = isFirst ? '#fff' : '#007AFF';

            html += '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:75px;height:75px;background:' + dateBg + ';border-radius:15px">';
            html += '<div style="font-size:27px;font-weight:700;color:' + dateCol + ';line-height:1">' + dt.day + '</div>';
            html += '<div style="font-size:15px;font-weight:600;color:' + (isFirst ? 'rgba(255,255,255,0.8)' : '#007AFF') + ';text-transform:uppercase">' + dt.wd + '</div>';
            html += '</div>';

            // Comment
            html += '<div style="padding:0 18px;min-width:0">';
            if (data[j].k) {
                html += '<div style="font-size:21px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + data[j].k + '</div>';
            } else {
                html += '<div style="font-size:20px;color:#CCC;font-style:italic">—</div>';
            }
            html += '<div style="font-size:17px;color:#999;margin-top:3px">' + dt.day + ' ' + dt.mon + '</div>';
            html += '</div>';

            // Time badge
            var badgeBg = neg ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)';
            var badgeCol = neg ? '#FF3B30' : '#34C759';
            var sign = neg ? '−' : '+';

            html += '<div style="text-align:right">';
            html += '<div style="display:inline-block;padding:9px 18px;background:' + badgeBg + ';border-radius:12px;font-size:23px;font-weight:700;color:' + badgeCol + '">' + sign + bidrag + '</div>';
            html += '</div>';

            html += '</div>';
        }

        html += '</div>';

        return html;
    };

    console.log('VR: Komp loaded');
})();
