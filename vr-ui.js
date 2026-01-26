// VR CrewWeb - UI Components
(function() {
    'use strict';

    var VR = window.VR;

    // ===== MOBILE DETECTION =====
    VR.isMobile = function() {
        return window.innerWidth < 768;
    };

    VR.getHeaderHeight = function() {
        return VR.isMobile() ? '255px' : '210px';
    };

    // ===== LOADER =====
    VR.showLoader = function(title) {
        VR.hideLoader();
        VR.pct = 0;

        var ld = document.createElement('div');
        ld.id = VR.ID.loader;
        ld.innerHTML = '\
<style>\
@keyframes vrPulse{0%,100%{opacity:1}50%{opacity:0.5}}\
#vrLoader{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.97);z-index:9999998;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif}\
#vrLoader .ring-wrap{position:relative;width:210px;height:210px}\
#vrLoader svg{transform:rotate(-90deg)}\
#vrLoader .ring-bg{fill:none;stroke:rgba(255,255,255,0.1);stroke-width:15}\
#vrLoader .ring-fill{fill:none;stroke:url(#vrGrad);stroke-width:15;stroke-linecap:round;stroke-dasharray:565;stroke-dashoffset:565;transition:stroke-dashoffset 0.3s ease}\
#vrLoader .pct{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:700;color:#fff}\
#vrLoader .title{color:#fff;font-size:30px;font-weight:600;margin-top:36px}\
#vrLoader .status{color:rgba(255,255,255,0.6);font-size:21px;margin-top:12px;animation:vrPulse 1.5s infinite}\
</style>\
<div class="ring-wrap">\
<svg width="210" height="210">\
<defs><linearGradient id="vrGrad" x1="0%" y1="0%" x2="100%" y2="0%">\
<stop offset="0%" stop-color="#e94560"/>\
<stop offset="100%" stop-color="#f39c12"/>\
</linearGradient></defs>\
<circle class="ring-bg" cx="105" cy="105" r="90"/>\
<circle class="ring-fill" cx="105" cy="105" r="90"/>\
</svg>\
<div class="pct">0%</div>\
</div>\
<div class="title">' + title + '</div>\
<div class="status">Förbereder...</div>';

        document.body.appendChild(ld);
    };

    VR.updateLoader = function(percent, statusText) {
        var ld = document.getElementById(VR.ID.loader);
        if (!ld) return;

        VR.pct = Math.min(100, Math.max(0, percent));

        var ring = ld.querySelector('.ring-fill');
        var pctEl = ld.querySelector('.pct');
        var statEl = ld.querySelector('.status');

        if (ring) {
            ring.style.strokeDashoffset = 565 - (565 * VR.pct / 100);
        }
        if (pctEl) {
            pctEl.textContent = Math.round(VR.pct) + '%';
        }
        if (statEl && statusText) {
            statEl.textContent = statusText;
        }
    };

    VR.hideLoader = function() {
        var ld = document.getElementById(VR.ID.loader);
        if (ld) {
            ld.style.opacity = '0';
            ld.style.transition = 'opacity 0.4s ease';
            setTimeout(function() {
                if (ld.parentNode) ld.remove();
            }, 400);
        }
    };

    // ===== MAIN VIEW =====
    VR.showView = function(title, subtitle, content) {
        var old = document.getElementById(VR.ID.view);
        if (old) old.remove();

        var v = document.createElement('div');
        v.id = VR.ID.view;
        v.innerHTML = '\
<style>\
#vrView{position:fixed;top:' + VR.getHeaderHeight() + ';left:0;right:0;bottom:0;background:#F2F2F7;z-index:999997;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;-webkit-overflow-scrolling:touch}\
</style>\
<div style="padding:45px 36px 180px">\
<div style="margin-bottom:36px">\
<div style="font-size:50px;font-weight:700;color:#000">' + title + '</div>\
<div style="font-size:32px;color:#666">' + subtitle + '</div>\
</div>' + content + '</div>';

        document.body.appendChild(v);
    };

    // ===== HEADER =====
    VR.createHeader = function() {
        var h = document.createElement('div');
        h.id = VR.ID.header;
        var headerH = VR.getHeaderHeight();

        h.style.cssText = 'position:fixed;top:0;left:0;right:0;height:' + headerH +
            ';background:rgba(0,0,0,0.95);backdrop-filter:blur(20px);z-index:9999999;padding:18px 24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif';

        h.innerHTML = '\
<div style="display:flex;gap:18px;align-items:flex-start">\
<div style="flex:2;display:flex;flex-direction:column;gap:9px">\
<button id="vrBtnS" style="width:100%;padding:23px 27px;border-radius:21px;border:none;background:linear-gradient(135deg,#007AFF,#5856D6);color:#fff;font-weight:700;font-size:32px;cursor:pointer">📅 Schema</button>\
<div style="display:flex;gap:9px">\
<div id="vrTodayBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 18px;text-align:center;cursor:pointer">\
<div style="font-size:20px;color:rgba(255,255,255,0.5)">Idag</div>\
<div id="vrTodayTur" style="font-size:24px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">...</div>\
</div>\
<div id="vrTomorrowBox" style="flex:1;background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 18px;text-align:center;cursor:pointer">\
<div style="font-size:20px;color:rgba(255,255,255,0.5)">Imorgon</div>\
<div id="vrTomorrowTur" style="font-size:24px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">...</div>\
</div>\
</div>\
</div>\
<div style="flex:1;display:flex;flex-direction:column;gap:9px">\
<button id="vrBtnK" style="width:100%;padding:23px 27px;border-radius:21px;border:none;background:linear-gradient(135deg,#34C759,#30D158);color:#fff;font-weight:700;font-size:32px;cursor:pointer">⏰ Komp</button>\
<div id="vrSaldoBox" style="background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 18px;text-align:center;cursor:pointer">\
<div style="font-size:20px;color:rgba(255,255,255,0.5)">Saldo <span style="font-size:14px">🔄</span></div>\
<div id="vrKompSaldo" style="font-size:24px;color:#34C759;font-weight:700">...</div>\
</div>\
</div>\
<button id="vrCloseBtn" style="background:rgba(255,255,255,0.1);color:#fff;border:none;width:81px;height:81px;border-radius:50%;font-size:36px;cursor:pointer;flex-shrink:0;margin-top:5px">✕</button>\
</div>';

        document.body.appendChild(h);
        document.body.style.paddingTop = headerH;

        // Event listeners
        document.getElementById('vrBtnS').onclick = function() {
            VR.closeDayDetail();
            VR.doSchema();
        };
        document.getElementById('vrBtnK').onclick = function() {
            VR.closeDayDetail();
            VR.doKomp();
        };
        document.getElementById('vrTodayBox').onclick = function() {
            if (VR.todayDateStr) VR.openDayFromHeader(VR.todayDateStr);
        };
        document.getElementById('vrTomorrowBox').onclick = function() {
            if (VR.tomorrowDateStr) VR.openDayFromHeader(VR.tomorrowDateStr);
        };
        document.getElementById('vrSaldoBox').onclick = function() {
            VR.manualRefreshSaldo();
        };
        document.getElementById('vrCloseBtn').onclick = function() {
            VR.cleanup();
        };
    };

    // ===== CLEANUP =====
    VR.cleanup = function() {
        document.getElementById(VR.ID.header).remove();
        var v = document.getElementById(VR.ID.view);
        if (v) v.remove();
        var l = document.getElementById(VR.ID.loader);
        if (l) l.remove();
        var d = document.getElementById(VR.ID.detail);
        if (d) d.remove();
        document.body.style.paddingTop = '';
    };

    // ===== HEADER INFO =====
    VR.parseTodayTur = function(tbl) {
        var rows = tbl.querySelectorAll('tr');
        var today = VR.getTodayStr();
        var tomorrow = VR.getTomorrowStr();

        VR.todayDateStr = today;
        VR.tomorrowDateStr = tomorrow;

        var foundToday = false, foundTomorrow = false;

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 11) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';

            if (dt === today && !foundToday) {
                foundToday = true;
                var ps = c[3] ? c[3].textContent.trim() : '';
                var tn = c[9] ? c[9].textContent.trim() : '';
                var period = c[10] ? c[10].textContent.trim() : '';
                var cd = c[12] ? c[12].textContent.trim() : '';

                VR.updateHeaderBox('vrTodayTur', ps, tn, period, cd);
            }

            if (dt === tomorrow && !foundTomorrow) {
                foundTomorrow = true;
                var ps2 = c[3] ? c[3].textContent.trim() : '';
                var tn2 = c[9] ? c[9].textContent.trim() : '';
                var period2 = c[10] ? c[10].textContent.trim() : '';
                var cd2 = c[12] ? c[12].textContent.trim() : '';

                VR.updateHeaderBox('vrTomorrowTur', ps2, tn2, period2, cd2);
            }

            if (foundToday && foundTomorrow) break;
        }

        if (!foundToday) {
            var elT = document.getElementById('vrTodayTur');
            if (elT) { elT.innerHTML = '—'; elT.style.color = 'rgba(255,255,255,0.5)'; }
        }
        if (!foundTomorrow) {
            var elM = document.getElementById('vrTomorrowTur');
            if (elM) { elM.textContent = '—'; elM.style.color = 'rgba(255,255,255,0.5)'; }
        }
    };

    VR.updateHeaderBox = function(elId, ps, tn, period, cd) {
        var el = document.getElementById(elId);
        if (!el) return;

        var psUp = (ps || '').toUpperCase();
        var isFPV = psUp === 'FV' || psUp === 'FP2' || psUp === 'FP-V' ||
                    psUp.indexOf('FP-V') > -1 || psUp.indexOf('FP2') > -1;
        var isFri = (cd && cd.toUpperCase() === 'FRIDAG') || isFPV;

        if (isFri) {
            var fB = VR.getHeaderFridagBadge(ps, cd);
            el.innerHTML = 'Ledig' + fB;
            el.style.color = '#F59E0B';
        } else if (tn) {
            var ic = VR.getHeaderIcons(tn);
            el.innerHTML = tn + ic;
            el.style.color = '#fff';
        } else if (period) {
            el.innerHTML = period;
            el.style.color = '#fff';
        } else if (ps) {
            el.innerHTML = ps;
            el.style.color = '#fff';
        } else {
            el.innerHTML = 'Ingen tur';
            el.style.color = 'rgba(255,255,255,0.5)';
        }
    };

    // ===== KOMP SALDO FOR HEADER =====
    VR.fetchKompForHeader = function() {
        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            el.click();
            setTimeout(VR.selectKompForHeader, 1500);
        } else {
            var balances = document.getElementById('CrewBalances');
            if (balances) VR.refreshKompSaldo();
        }
    };

    VR.manualRefreshSaldo = function() {
        var saldoEl = document.getElementById('vrKompSaldo');
        if (saldoEl) {
            saldoEl.textContent = '⏳';
            saldoEl.style.color = '#fff';
        }

        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            el.click();
            setTimeout(VR.selectKompForHeader, 1500);
        } else {
            var balances = document.getElementById('CrewBalances');
            if (balances) {
                VR.refreshKompSaldo();
            } else if (saldoEl) {
                saldoEl.textContent = '❌';
                saldoEl.style.color = '#FF3B30';
            }
        }
    };

    VR.selectKompForHeader = function() {
        var listbox = null;
        var all = document.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) {
            var tag = all[i].tagName || '';
            if (tag.toLowerCase().indexOf('listbox') > -1) {
                listbox = all[i];
                break;
            }
        }
        if (!listbox) return;

        if (listbox.getAttribute('value') === '3') {
            setTimeout(VR.refreshKompSaldo, 500);
            return;
        }

        var dropBtn = listbox.querySelector('.dropdlgbutton');
        if (dropBtn) {
            dropBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            dropBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        }

        setTimeout(function() {
            var found = null;
            var allEls = document.body.getElementsByTagName('*');
            for (var i = 0; i < allEls.length; i++) {
                var el = allEls[i];
                var txt = '';
                for (var j = 0; j < el.childNodes.length; j++) {
                    if (el.childNodes[j].nodeType === 3) txt += el.childNodes[j].textContent;
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
                setTimeout(VR.refreshKompSaldo, 800);
            }
        }, 500);
    };

    VR.refreshKompSaldo = function() {
        var inputs = document.querySelectorAll('#CrewBalances input[type="text"]');
        if (inputs.length >= 2) {
            inputs[0].value = '14-12-2025';
            inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            var today = new Date();
            inputs[1].value = ('0' + today.getDate()).slice(-2) + '-' +
                              ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                              today.getFullYear();
            inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }

        var btns = document.querySelectorAll('button');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].textContent.trim() === 'Hämta') {
                btns[i].click();
                break;
            }
        }

        setTimeout(VR.parseKompSaldo, 1500);
    };

    VR.parseKompSaldo = function() {
        var tbl = document.querySelector('#CrewBalances table');
        if (!tbl) return;

        var rows = tbl.querySelectorAll('tr');
        if (rows.length < 2) return;

        var c = rows[1].querySelectorAll('td');
        if (c.length < 3) return;

        var saldo = c[2] ? c[2].textContent.trim() : '0:00';
        var el = document.getElementById('vrKompSaldo');
        if (el) {
            el.textContent = saldo + ' tim';
            el.style.color = saldo.indexOf('-') > -1 ? '#FF3B30' : '#34C759';
        }
    };

    // ===== FETCH HEADER INFO =====
    VR.fetchHeaderInfo = function() {
        var tbl = document.querySelector('#workdays table');
        if (tbl) VR.parseTodayTur(tbl);

        setTimeout(VR.doSchema, 100);
        setTimeout(VR.fetchKompForHeader, 2000);
    };

    // ===== INIT =====
    VR.init = function() {
        VR.createHeader();
        VR.fetchHeaderInfo();
        console.log('VR: Initialized');
    };

    console.log('VR: UI loaded');
})();
